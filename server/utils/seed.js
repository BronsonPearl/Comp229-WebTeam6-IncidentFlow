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

import mongoose from 'mongoose';
import config from '../../config/config.js';
import User from '../models/User.js';
import Incident from '../models/Incident.js';
import { Activity, Attachment, Comment, Counter, Notification } from '../models/supporting.js';
import { SEED_INCIDENTS, SEED_USERS } from '../../shared/seedData.js';

// stop if no demo password is set (we never hard code passwords)
const password = process.env.SEED_DEMO_PASSWORD;
if (!password || password.length < 8) {
  console.error('Set SEED_DEMO_PASSWORD (8+ characters) in your .env before seeding.');
  process.exit(1);
}

// makes a date N hours before now
const hoursAgo = (h) => new Date(Date.now() - h * 36e5);

// ---------- SEED ----------

async function run() {
  await mongoose.connect(config.mongoUri);
  console.log('[seed] connected, clearing collections');

  // empty every collection first
  await Promise.all([User, Incident, Comment, Activity, Notification, Attachment, Counter].map((m) => m.deleteMany({})));

  // create the users and keep them by key (alex, jordan...) so incidents can point to them
  const users = {};
  for (const u of SEED_USERS) {
    const user = new User({ ...u, isActive: u.isActive ?? true });
    await user.setPassword(password);
    await user.save();
    users[u.key] = user;
  }

  // create the incidents oldest first so the numbers go up with time
  let n = 0;
  for (const s of [...SEED_INCIDENTS].reverse()) {
    n += 1;
    const createdAt = hoursAgo(s.ageDays * 24 + 2 + (n % 7));
    const resolvedAt = s.resolvedAfterHours ? new Date(createdAt.getTime() + s.resolvedAfterHours * 36e5) : null;
    const incident = await Incident.create({
      incidentNumber: `INC-${String(n).padStart(6, '0')}`,
      title: s.title,
      description: s.description,
      category: s.category,
      priority: s.priority,
      status: s.status,
      location: s.location,
      createdBy: users[s.by]._id,
      assignedTo: s.to ? users[s.to]._id : null,
      resolution: s.resolution || '',
      isEscalated: Boolean(s.escalated),
      escalationReason: s.escalated ? 'Automatically escalated: Critical priority.' : '',
      resolvedAt,
      createdAt,
      updatedAt: resolvedAt || createdAt,
    });

    // helper to write an activity entry at a specific time
    const act = (user, action, extra = {}, at = createdAt) => Activity.create({ incident: incident._id, user: user._id, action, createdAt: at, ...extra });
    await act(users[s.by], 'created', { newValue: incident.incidentNumber });

    // fake the history: assigned by Alex (admin), then status changes by the technician
    if (s.to) {
      const at = new Date(createdAt.getTime() + 36e5);
      await act(users.alex, 'assigned', { field: 'assignedTo', newValue: users[s.to].fullName }, at);
      await act(users.alex, 'status_changed', { field: 'status', oldValue: 'Open', newValue: 'Assigned' }, at);
    }
    if (['In Progress', 'On Hold', 'Resolved', 'Closed'].includes(s.status)) {
      await act(users[s.to], 'status_changed', { field: 'status', oldValue: 'Assigned', newValue: 'In Progress' }, new Date(createdAt.getTime() + 2 * 36e5));
    }
    if (s.status === 'On Hold') await act(users[s.to], 'status_changed', { field: 'status', oldValue: 'In Progress', newValue: 'On Hold' }, new Date(createdAt.getTime() + 3 * 36e5));
    if (resolvedAt) await act(users[s.to], 'status_changed', { field: 'status', oldValue: 'In Progress', newValue: 'Resolved' }, resolvedAt);
    if (s.status === 'Closed') await act(users[s.by], 'status_changed', { field: 'status', oldValue: 'Resolved', newValue: 'Closed' }, resolvedAt);

    // comments from the seed data
    for (const [i, [who, message]] of (s.comments || []).entries()) {
      const at = new Date(createdAt.getTime() + (2.5 + i) * 36e5);
      await Comment.create({ incident: incident._id, author: users[who]._id, message, createdAt: at, updatedAt: at });
      await act(users[who], 'commented', {}, at);
    }

    // some notifications so the bell has unread items
    if (s.to && !['Resolved', 'Closed'].includes(s.status)) {
      await Notification.create({ user: users[s.to]._id, incident: incident._id, type: 'assignment', message: `You were assigned ${incident.incidentNumber}: ${incident.title}` });
    }
    if (s.status === 'Resolved') {
      await Notification.create({ user: users[s.by]._id, incident: incident._id, type: 'resolution', message: `${incident.incidentNumber} was resolved: ${incident.title}` });
    }
  }

  // so the next new incident continues from the last number
  await Counter.create({ _id: 'incident', seq: n });

  console.log(`[seed] created ${SEED_USERS.length} users and ${n} incidents`);
  console.log('[seed] demo sign-ins: alex.morgan@ (admin), jordan.lee@ (technician), taylor.chen@ (user) @incidentflow.demo');
  await mongoose.disconnect();
}

// show the error and exit if anything fails
run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
