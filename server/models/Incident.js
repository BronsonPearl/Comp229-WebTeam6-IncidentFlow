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
import { CATEGORIES, PRIORITIES, STATUSES, LIMITS } from '../../shared/constants.js';

// ObjectId type for references to other documents
const { ObjectId } = mongoose.Schema.Types;

// ---------- SCHEMA ----------

const incidentSchema = new mongoose.Schema(
  {
    incidentNumber: { type: String, required: true, unique: true }, // e.g. INC-000123
    title: { type: String, required: [true, 'Title is required.'], trim: true, minlength: LIMITS.title[0], maxlength: LIMITS.title[1] },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      minlength: LIMITS.description[0],
      maxlength: LIMITS.description[1],
    },

    // these 3 can only be values from the shared lists
    category: { type: String, enum: CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITIES, required: true, default: 'Medium' },
    status: { type: String, enum: STATUSES, required: true, default: 'Open' },
    location: { type: String, required: [true, 'Location is required.'], trim: true, minlength: LIMITS.location[0], maxlength: LIMITS.location[1] },

    // ref: "User" lets us use .populate() to swap the id for the user's name and email
    createdBy: { type: ObjectId, ref: 'User', required: true },
    assignedTo: { type: ObjectId, ref: 'User', default: null },   // null until an admin assigns a technician
    resolution: { type: String, trim: true, maxlength: LIMITS.resolution[1], default: '' },

    // escalation flag and why (Critical incidents get escalated automatically)
    isEscalated: { type: Boolean, default: false, required: true },
    escalationReason: { type: String, trim: true, maxlength: LIMITS.escalationReason[1], default: '' },
    resolvedAt: { type: Date, default: null },   // set when it becomes Resolved or Closed, cleared if reopened
  },
  { timestamps: true }
);

// ---------- INDEXES ----------

// indexes for the most common list queries so they stay fast with lots of data
// (my incidents, technician queue, admin filters)
incidentSchema.index({ createdBy: 1, createdAt: -1 });
incidentSchema.index({ assignedTo: 1, status: 1 });
incidentSchema.index({ status: 1, priority: 1, createdAt: -1 });

// remove the mongoose version field from responses
incidentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Incident', incidentSchema);
