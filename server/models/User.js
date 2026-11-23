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

// bcrypt for hashing passwords
import bcrypt from 'bcryptjs';
import { ROLES, LIMITS } from '../../shared/constants.js';

// pull the name limits out of the shared LIMITS
const [nameMin, nameMax] = LIMITS.name;

// ---------- SCHEMA ----------

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required.'], trim: true, minlength: nameMin, maxlength: nameMax },
    lastName: { type: String, required: [true, 'Last name is required.'], trim: true, minlength: nameMin, maxlength: nameMax },

    // emails are saved lowercase and unique so the same person cannot sign up twice
    email: {
      type: String,
      required: [true, 'Email is required.'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address.'],
    },

    // select: false means it is never loaded unless we ask for it with .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'user', required: true },   // new accounts are always "user"
    isActive: { type: Boolean, default: true, required: true },   // false = deactivated, cannot sign in
  },
  { timestamps: true }   // adds createdAt and updatedAt automatically
);

// index to make "find all active technicians" fast
userSchema.index({ role: 1, isActive: 1 });

// ---------- METHODS ----------

// hashes the password with bcrypt (12 rounds) and stores only the hash
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

// compares a typed password with the stored hash, returns true or false
userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash || '');
};

// fullName is not saved in the database, it is built from first + last name
userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

// every time a user is sent as JSON, remove the hash and internal fields
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    delete ret.id;
    return ret;
  },
});

// creates the "users" collection model
export default mongoose.model('User', userSchema);
