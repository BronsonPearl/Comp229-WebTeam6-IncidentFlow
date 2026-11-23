/**
 * COMP229 - Web Application Development
 * Project: IncidentFlow - Incident Management System
 *
 * Team Members:
 * Ivan Seck Ali - 301501210
 * Robel Teffera - 301113578
 * Ryan Sunil - 301495962
 * Bronson Pearl - 301328703
 *
 * Description:
 * This file is part of the IncidentFlow MERN application.
 */

import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/common.jsx';
import { timeAgo } from '../utils/format.js';

// icon for each notification type
const ICONS = { assignment: 'tool', status: 'refresh', comment: 'message', escalation: 'flag', resolution: 'checkCircle' };

// ---------- NOTIFICATIONS PAGE ----------

export default function Notifications() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { setUnread } = useNotifications();
  const { data, loading, error, reload, setData } = useAsync(() => notificationService.list().then((r) => r.data), []);

  // mark one as read and update the count in the bell
  const markRead = async (n) => {
    if (n.isRead) return;
    await notificationService.markRead(n._id);
    setData((d) => {
      const items = d.items.map((x) => (x._id === n._id ? { ...x, isRead: true } : x));
      const unread = items.filter((x) => !x.isRead).length;
      setUnread(unread);
      return { items, unread };
    });
  };

  // mark it read and go to the incident (even if marking read fails)
  const open = async (n) => {
    try {
      await markRead(n);
    } catch {
    }
    if (n.incident) navigate(`/incidents/${n.incident._id}`);
  };

  // mark everything read
  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      setData((d) => ({ items: d.items.map((x) => ({ ...x, isRead: true })), unread: 0 }));
      setUnread(0);
      notify('All notifications marked as read.');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={data ? (data.unread ? `${data.unread} unread` : 'You are all caught up.') : 'Assignments, status changes, comments, escalations and resolutions.'}
        actions={data?.unread > 0 && <button type="button" className="btn btn-secondary" onClick={markAll}><Icon name="check" size={15} /> Mark all read</button>}
      />
      <div className="card" style={{ maxWidth: 900 }}>
        {loading && <LoadingState rows={6} />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data?.items.length === 0 && <EmptyState icon="bell" title="No notifications yet" message="You will be notified about assignments, updates and resolutions on your incidents." />}
        {/* one row per notification with its buttons */}
        {data?.items.map((n) => (
          <div key={n._id} className={`notification ${n.isRead ? '' : 'unread'}`}>
            <span className={`notif-icon notif-${n.type}`} aria-hidden="true"><Icon name={ICONS[n.type] || 'bell'} /></span>
            <div className="grow">
              <p>{n.isRead ? n.message : <strong>{n.message}</strong>}</p>
              <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
              <div className="flex gap-2 mt-2">
                {n.incident && <button type="button" className="btn btn-secondary btn-sm" onClick={() => open(n)}>Open {n.incident.incidentNumber}</button>}
                {!n.isRead && <button type="button" className="btn btn-ghost btn-sm" onClick={() => markRead(n).catch((e) => notify(e.message, 'error'))}>Mark read</button>}
              </div>
            </div>
            {!n.isRead && <span className="unread-dot" aria-label="Unread" />}
          </div>
        ))}
      </div>
    </>
  );
} // end Notifications
