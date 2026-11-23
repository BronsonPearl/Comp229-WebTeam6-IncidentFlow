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

import { useState } from 'react';
import { LIMITS } from '@shared/constants.js';
import Icon from './Icon.jsx';
import { RoleBadge } from './Badges.jsx';
import { ConfirmDialog, EmptyState } from './common.jsx';
import { attachmentService, commentService } from '../services/index.js';
import { useToast } from '../context/ToastContext.jsx';
import { describeActivity, formatBytes, formatDateTime, fullName, initials, timeAgo } from '../utils/format.js';

// same file checks as the report form
import { validateFiles } from './incidents.jsx';

// ---------- ACTIVITY TIMELINE ----------

// oldest to newest list of everything that happened
// escalations get a red dot and resolutions a green one
export function ActivityTimeline({ items }) {
  if (!items?.length) return <EmptyState icon="activity" title="No activity yet" />;
  return (
    <ol className="timeline" aria-label="Activity timeline">
      {items.map((a) => (
        <li key={a._id} className={a.action === 'escalated' ? 't-escalated' : a.newValue === 'Resolved' ? 't-resolved' : ''}>
          <span className="who">{a.user ? fullName(a.user) : 'System'}</span> {describeActivity(a)}
          <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString()}>{formatDateTime(a.createdAt)}</time>
        </li>
      ))}
    </ol>
  );
}

// ---------- COMMENTS ----------

// the comments list lives in the parent page so the count in the header updates too
// onChange tells the page to reload the activity timeline
export function CommentThread({ incidentId, comments, setComments, currentUser, canComment, onChange }) {
  const { notify } = useToast();
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // the comment being edited { id, message }, or null
  const [editing, setEditing] = useState(null); // { id, message }

  // id of the comment waiting for delete confirmation
  const [deleting, setDeleting] = useState(null);

  // post a new comment and add it to the bottom of the list
  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return setError('Write a comment before posting.');
    setBusy(true);
    setError(null);
    try {
      const res = await commentService.add(incidentId, message);
      setComments((list) => [...list, res.data.comment]);
      setMessage('');
      onChange?.();
    } catch (err) {
      setError(err.errors?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  // save an edited comment and swap it into the list
  const saveEdit = async () => {
    try {
      const res = await commentService.update(editing.id, editing.message);
      setComments((list) => list.map((c) => (c._id === editing.id ? res.data.comment : c)));
      setEditing(null);
      notify('Comment updated.');
    } catch (err) {
      notify(err.errors?.message || err.message, 'error');
    }
  };

  // delete after the user confirms
  const confirmDelete = async () => {
    try {
      await commentService.remove(deleting);
      setComments((list) => list.filter((c) => c._id !== deleting));
      notify('Comment deleted.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      {comments.length === 0 ? (
        <p className="text-muted text-sm">No comments yet. Start the conversation below.</p>
      ) : (
        <div className="comments">
          {comments.map((c) => {
            // you can edit your own comments, admins can also delete anyone's
            const mine = c.author?._id === currentUser._id;
            return (
              <div className="comment" key={c._id}>
                <span className="avatar" aria-hidden="true">{initials(c.author)}</span>
                <div className="comment-body">
                  <div className="comment-head">
                    <strong>{c.author ? fullName(c.author) : 'Deleted user'}</strong>
                    {c.author?.role && c.author.role !== 'user' && <RoleBadge role={c.author.role} />}
                    <time dateTime={c.createdAt} title={new Date(c.createdAt).toLocaleString()}>{timeAgo(c.createdAt)}</time>
                    {c.updatedAt && c.updatedAt !== c.createdAt && <span className="text-muted text-sm">(edited)</span>}
                    {(mine || currentUser.role === 'admin') && editing?.id !== c._id && (
                      <span className="comment-tools">
                        {mine && <button type="button" onClick={() => setEditing({ id: c._id, message: c.message })}>Edit</button>}
                        <button type="button" onClick={() => setDeleting(c._id)}>Delete</button>
                      </span>
                    )}
                  </div>
                  {/* edit box replaces the text while editing */}
                  {editing?.id === c._id ? (
                    <div className="stack" style={{ gap: 8 }}>
                      <label htmlFor={`edit-${c._id}`} className="sr-only">Edit comment</label>
                      <textarea id={`edit-${c._id}`} rows={3} value={editing.message} onChange={(e) => setEditing({ ...editing, message: e.target.value })} maxLength={LIMITS.comment[1]} style={{ minHeight: 70 }} />
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p>{c.message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* new comment box */}
      {canComment && (
        <form onSubmit={submit} className="stack" style={{ gap: 8 }} noValidate>
          <div className={`field ${error ? 'has-error' : ''}`}>
            <label htmlFor="new-comment">Add a comment</label>
            <textarea id="new-comment" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={LIMITS.comment[1]} placeholder="Share an update or ask a question" style={{ minHeight: 80 }} />
            {error && <span className="error" role="alert">{error}</span>}
          </div>
          <div className="flex" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy && <span className="spinner" />}<Icon name="message" size={14} /> Post comment</button>
          </div>
        </form>
      )}
      <ConfirmDialog open={!!deleting} title="Delete comment?" message="This comment will be permanently removed." onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
    </div>
  );
} // end CommentThread

// ---------- ATTACHMENTS ----------

export function AttachmentList({ incidentId, attachments, setAttachments, currentUser, canUpload, onChange }) {
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // check the file, upload it, add it to the list
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';   // reset the input so the same file can be picked again
    if (!file) return;
    const err = validateFiles([file]);
    if (err) return setError(err);
    setBusy(true);
    setError(null);
    try {
      const res = await attachmentService.upload(incidentId, file);
      setAttachments((list) => [...list, res.data.attachment]);
      notify('File attached.');
      onChange?.();
    } catch (ex) {
      setError(ex.errors?.file || ex.message);
    } finally {
      setBusy(false);
    }
  };

  // download the file with our token then open it in a new tab
  // (the server only gives files to people allowed to see the incident)
  const open = async (a) => {
    try {
      const blob = await attachmentService.download(a._id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');

      // free the memory after a minute
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (ex) {
      notify(ex.message, 'error');
    }
  };

  // remove an attachment (uploader or admin)
  const remove = async (a) => {
    try {
      await attachmentService.remove(a._id);
      setAttachments((list) => list.filter((x) => x._id !== a._id));
      notify('File removed.');
      onChange?.();
    } catch (ex) {
      notify(ex.message, 'error');
    }
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      {attachments.length === 0 ? (
        <p className="text-muted text-sm">No files attached.</p>
      ) : (
        <div className="attachments">
          {attachments.map((a) => {
            const pdf = a.fileType === 'application/pdf';
            return (
              <div className="attachment" key={a._id}>
                <span className={`file-icon ${pdf ? 'pdf' : ''}`} aria-hidden="true">{pdf ? 'PDF' : 'IMG'}</span>
                <span className="info">
                  <strong>{a.fileName}</strong>
                  <small>{formatBytes(a.fileSize)} · {a.uploadedBy ? fullName(a.uploadedBy) : 'Unknown'} · {timeAgo(a.createdAt)}</small>
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => open(a)}>View</button>
                {(a.uploadedBy?._id === currentUser._id || currentUser.role === 'admin') && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(a)} aria-label={`Remove ${a.fileName}`}><Icon name="trash" size={14} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {/* the button is a label so clicking it opens the hidden file input */}
      {canUpload && (
        <label className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
          {busy ? <span className="spinner" /> : <Icon name="paperclip" size={14} />} {busy ? 'Uploading…' : 'Attach file'}
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={upload} disabled={busy} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  );
} // end AttachmentList
