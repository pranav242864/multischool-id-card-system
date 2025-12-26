const Session = require('../models/Session');
const School = require('../models/School');
const mongoose = require('mongoose');

// Create a new session
const createSession = async (sessionData) => {
  // Validate date range
  if (new Date(sessionData.startDate) >= new Date(sessionData.endDate)) {
    throw new Error('Start date must be before end date');
  }

  // Check if session name is unique for the school
  const existingSession = await Session.findOne({
    sessionName: sessionData.sessionName,
    schoolId: sessionData.schoolId
  });

  if (existingSession) {
    throw new Error('Session name already exists for this school');
  }

  const session = new Session(sessionData);
  await session.save();
  return session;
};

// Get all sessions for a school with pagination
const getSessions = async (schoolId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const sessions = await Session.find({ schoolId })
    .sort({ startDate: -1 }) // Sort by startDate, latest first
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Session.countDocuments({ schoolId });

  return {
    sessions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Activate a session (make it active and deactivate others)
const activateSession = async (sessionId, schoolId) => {
  // Verify session exists and belongs to the school
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Session does not belong to your school');
  }

  // Deactivate all other sessions for this school
  await Session.updateMany(
    { schoolId, _id: { $ne: sessionId } },
    { activeStatus: false }
  );

  // Activate the selected session
  session.activeStatus = true;
  await session.save();

  return session;
};

// Deactivate a session
const deactivateSession = async (sessionId, schoolId) => {
  // Verify session exists and belongs to the school
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Session does not belong to your school');
  }

  // Check if already inactive
  if (!session.activeStatus) {
    throw new Error('Session is already inactive');
  }

  session.activeStatus = false;
  await session.save();

  return session;
};

module.exports = {
  createSession,
  getSessions,
  activateSession,
  deactivateSession
};