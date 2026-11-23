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
import { NOTIFICATION_TYPES, LIMITS } from '../../shared/constants.js';

// shared setup
const { ObjectId } = mongoose.Schema.Types;

// removes the __v field when sending JSON
const clean = { transform: (_d, r) => { delete r.__v; return r; } };

// ---------- COMMENT ----------

// a message someone left on an incident
const commentSchema = new mongoose.Schema(
  {
    incident: { type: ObjectId, ref: 'Incident', required: true, index: true },
    author: { type: ObjectId, ref: 'User', required: true },
    message: { type: String, required: [true, 'Comment is required.'], trim: true, maxlength: LIMITS.comment[1] },
  },
  { timestamps: true, toJSON: clean }
);

// ---------- ACTIVITY ----------

// one entry in the audit timeline, never edited after it is saved
// field / oldValue / newValue record what changed, ex. status Open -> Assigned
const activitySchema = new mongoose.Schema(
  {
    incident: { type: ObjectId, ref: 'Incident', required: true, index: true },
    user: { type: ObjectId, ref: 'User' },
    action: { type: String, required: true }, // created | updated | status_changed | assigned | escalated | commented | attachment_added | ...
    field: { type: String, default: null },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: clean }
);

// newest first for the dashboard feed
activitySchema.index({ createdAt: -1 });

// ---------- NOTIFICATION ----------

// an in-app message for one user, isRead powers the unread badge
const notificationSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    incident: { type: ObjectId, ref: 'Incident', default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: clean }
);

// fast lookup of one user's unread notifications
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// ---------- ATTACHMENT ----------

// only the file info is stored in MongoDB, the actual file is in the uploads folder
const attachmentSchema = new mongoose.Schema(
  {
    incident: { type: ObjectId, ref: 'Incident', required: true, index: true },
    uploadedBy: { type: ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileUrl: { type: String, required: true }, // storage key / URL; never a path inside the repo
    fileSize: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: clean }
);

// ---------- COUNTER ----------

// holds the last incident number used, _id is "incident"
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });

// export the models
export const Comment = mongoose.model('Comment', commentSchema);
export const Activity = mongoose.model('Activity', activitySchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const Attachment = mongoose.model('Attachment', attachmentSchema);
export const Counter = mongoose.model('Counter', counterSchema);
