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

import fs from 'node:fs/promises';
import path from 'node:path';
import Incident from '../models/Incident.js';
import { Attachment, Comment, Notification } from '../models/supporting.js';
import config from '../../config/config.js';
import { canComment, canViewIncident, isAdmin } from '../../shared/incidentPolicy.js';
import { validateComment } from '../../shared/validation.js';
import { ApiError, asyncHandler, created, ok } from '../utils/http.js';
import { logActivity, notify } from '../services/workflow.js';

// loads the incident and makes sure this user is allowed to see it (404 / 403 otherwise)
async function incidentFor(req, id) {
  const incident = await Incident.findById(id);
  if (!incident) throw ApiError.notFound('Incident not found.');
  if (!canViewIncident(req.user, incident)) throw ApiError.forbidden('You do not have access to this incident.');
  return incident;
}

// ---------- COMMENTS ----------

// GET /api/incidents/:id/comments, oldest first
export const listComments = asyncHandler(async (req, res) => {
  const incident = await incidentFor(req, req.params.id);
  const items = await Comment.find({ incident: incident._id }).sort({ createdAt: 1 }).populate('author', 'firstName lastName role');
  ok(res, { items });
});

// POST /api/incidents/:id/comments
// logs activity and notifies the reporter and the technician
export const addComment = asyncHandler(async (req, res) => {
  const incident = await incidentFor(req, req.params.id);
  if (!canComment(req.user, incident)) throw ApiError.forbidden('You cannot comment on this incident.');
  const errors = validateComment(req.body);
  if (Object.keys(errors).length) throw ApiError.badRequest(undefined, errors);
  const comment = await Comment.create({ incident: incident._id, author: req.user._id, message: req.body.message.trim() });
  await logActivity(incident, req.user, 'commented');
  await notify([incident.createdBy, incident.assignedTo], req.user, incident, 'comment', `${req.user.firstName} commented on ${incident.incidentNumber}.`);
  await comment.populate('author', 'firstName lastName role');
  created(res, { comment }, 'Comment added.');
});

// loads a comment and tells us if the signed in user wrote it
async function ownComment(req) {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('Comment not found.');
  const mine = String(comment.author) === String(req.user._id);
  return { comment, mine };
}

// PUT /api/comments/:id, only your own comments
export const updateComment = asyncHandler(async (req, res) => {
  const { comment, mine } = await ownComment(req);
  if (!mine) throw ApiError.forbidden('You can only edit your own comments.');
  const errors = validateComment(req.body);
  if (Object.keys(errors).length) throw ApiError.badRequest(undefined, errors);
  comment.message = req.body.message.trim();
  await comment.save();
  await comment.populate('author', 'firstName lastName role');
  ok(res, { comment }, 'Comment updated.');
});

// DELETE /api/comments/:id, your own or any comment if you are an admin
export const deleteComment = asyncHandler(async (req, res) => {
  const { comment, mine } = await ownComment(req);
  if (!mine && !isAdmin(req.user)) throw ApiError.forbidden('You can only delete your own comments.');
  await comment.deleteOne();
  ok(res, { id: req.params.id }, 'Comment deleted.');
});

// ---------- ATTACHMENTS ----------

// GET /api/incidents/:id/attachments
export const listAttachments = asyncHandler(async (req, res) => {
  const incident = await incidentFor(req, req.params.id);
  const items = await Attachment.find({ incident: incident._id }).sort({ createdAt: 1 }).populate('uploadedBy', 'firstName lastName');
  ok(res, { items });
});

// POST /api/incidents/:id/attachments (multer already saved the file to req.file)
export const uploadAttachment = asyncHandler(async (req, res) => {
  const incident = await incidentFor(req, req.params.id).catch(async (err) => {
    // if they are not allowed, delete the file multer just saved
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    throw err;
  });
  if (!req.file) throw ApiError.badRequest('Choose a file to upload.', { file: 'Choose a file to upload.' });

  // save the file info, the file itself stays in the uploads folder
  const attachment = await Attachment.create({
    incident: incident._id,
    uploadedBy: req.user._id,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    fileUrl: req.file.filename, // storage key; production would store an object-storage URL
    fileSize: req.file.size,
  });
  await logActivity(incident, req.user, 'attachment_added', { newValue: attachment.fileName });
  await attachment.populate('uploadedBy', 'firstName lastName');
  created(res, { attachment }, 'File attached.');
});

// GET /api/attachments/:id/file, checks access before sending the file
export const downloadAttachment = asyncHandler(async (req, res) => {
  const attachment = await Attachment.findById(req.params.id);
  if (!attachment) throw ApiError.notFound('Attachment not found.');
  await incidentFor(req, attachment.incident);
  res.setHeader('Content-Type', attachment.fileType);
  res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName.replace(/"/g, '')}"`);
  res.sendFile(path.join(config.uploadDir, path.basename(attachment.fileUrl)));
});

// DELETE /api/attachments/:id, uploader or admin only
export const deleteAttachment = asyncHandler(async (req, res) => {
  const attachment = await Attachment.findById(req.params.id);
  if (!attachment) throw ApiError.notFound('Attachment not found.');
  const incident = await incidentFor(req, attachment.incident);
  if (String(attachment.uploadedBy) !== String(req.user._id) && !isAdmin(req.user)) {
    throw ApiError.forbidden('Only the uploader or an admin can remove this file.');
  }
  await fs.unlink(path.join(config.uploadDir, path.basename(attachment.fileUrl))).catch(() => {});
  await attachment.deleteOne();
  await logActivity(incident, req.user, 'attachment_removed', { oldValue: attachment.fileName });
  ok(res, { id: req.params.id }, 'File removed.');
});

// ---------- NOTIFICATIONS ----------

// GET /api/notifications, newest first, plus the unread count for the bell
export const listNotifications = asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('incident', 'incidentNumber title');
  const unread = await Notification.countDocuments({ user: req.user._id, isRead: false });
  ok(res, { items, unread });
});

// PUT /api/notifications/:id/read, the user filter means you can only mark your own
export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found.');
  n.isRead = true;
  await n.save();
  ok(res, { notification: n });
});

// PUT /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  ok(res, { updated: result.modifiedCount }, 'All notifications marked as read.');
});
