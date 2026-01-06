const Session = require('../models/Session');
const School = require('../models/School');
const mongoose = require('mongoose');

// Create a new session
// If activeStatus=true is provided, automatically deactivates other sessions for the same school
// Uses transactions to ensure atomicity and prevent multiple active sessions
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

  const shouldActivate = sessionData.activeStatus === true;
  const dbSession = await mongoose.startSession();

  try {
    let createdSession;

    // If creating with activeStatus=true, use transaction to atomically deactivate others
    if (shouldActivate) {
      // Try to use transaction for atomic operation
      await dbSession.withTransaction(async () => {
        // Step 1: Deactivate all other active sessions for this school (in transaction)
        // This ensures no other session is active when we create the new active session
        const deactivateQuery = Session.updateMany(
          {
            schoolId: sessionData.schoolId,
            activeStatus: true
          },
          {
            $set: { activeStatus: false }
          },
          {
            session: dbSession
          }
        );
        // Set the flag to bypass validation hook
        deactivateQuery.setOptions({ skipActiveStatusValidation: true });
        await deactivateQuery;

        // Step 2: Create the new session with activeStatus=true
        // Set flag to allow activeStatus=true on creation
        const sessionDataToSave = { ...sessionData };
        const newSession = new Session(sessionDataToSave);
        newSession._skipActiveStatusValidation = true; // Allow activeStatus=true on creation
        await newSession.save({ session: dbSession });
        createdSession = newSession;
      });

      return createdSession;
    } else {
      // Creating with activeStatus=false (default) - no need for transaction
      await dbSession.endSession();
      const sessionDataToSave = { ...sessionData };
      // Ensure activeStatus is false if not explicitly set
      if (sessionDataToSave.activeStatus !== true) {
        sessionDataToSave.activeStatus = false;
      }
      const session = new Session(sessionDataToSave);
      await session.save();
      return session;
    }
  } catch (error) {
    // If transaction is not supported (single-node MongoDB), fall back to non-transactional approach
    // The unique index will still enforce the constraint
    if (shouldActivate && error.message && (
      error.message.includes('Transaction numbers are only allowed on a replica set') ||
      error.message.includes('not supported') ||
      error.codeName === 'TransactionTooLarge' ||
      error.codeName === 'NoSuchTransaction'
    )) {
      await dbSession.endSession();

      // Fallback: Use atomic operations without transaction
      // Step 1: Deactivate all other active sessions for this school
      const deactivateQuery = Session.updateMany(
        {
          schoolId: sessionData.schoolId,
          activeStatus: true
        },
        {
          $set: { activeStatus: false }
        }
      );
      // Set the flag to bypass validation hook
      deactivateQuery.setOptions({ skipActiveStatusValidation: true });
      await deactivateQuery;

      // Step 2: Create the new session with activeStatus=true
      // The unique index will prevent multiple active sessions
      const sessionDataToSave = { ...sessionData };
      const newSession = new Session(sessionDataToSave);
      newSession._skipActiveStatusValidation = true; // Allow activeStatus=true on creation
      await newSession.save();

      return newSession;
    }

    // Handle unique index violation (enforced by database constraint)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      throw new Error('Another session is already active for this school. Please try again.');
    }

    // Re-throw other errors
    throw error;
  } finally {
    // Only end session if it wasn't already ended
    try {
      if (dbSession.inTransaction() || dbSession.serverSession) {
        await dbSession.endSession();
      }
    } catch (e) {
      // Session already ended, ignore
    }
  }
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
// This function uses MongoDB transactions to ensure atomicity and prevent race conditions.
// The partial unique index on (schoolId, activeStatus: true) enforces the constraint at the database level.
const activateSession = async (sessionId, schoolId) => {
  const dbSession = await mongoose.startSession();
  
  try {
    let activatedSession;
    
    // Try to use transaction for atomic operation
    await dbSession.withTransaction(async () => {
      // Step 1: Deactivate all other sessions for this school first (in transaction)
      // This ensures no other session is active when we activate the target session
      const deactivateQuery = Session.updateMany(
        {
          schoolId: schoolId,
          _id: { $ne: sessionId },
          activeStatus: true
        },
        {
          $set: { activeStatus: false }
        },
        {
          session: dbSession
        }
      );
      // Set the flag to bypass validation hook
      deactivateQuery.setOptions({ skipActiveStatusValidation: true });
      await deactivateQuery;

      // Step 2: Verify session exists and belongs to the school, then activate it atomically
      // Using findOneAndUpdate ensures we only activate if the session exists and belongs to the school
      // Set skipActiveStatusValidation to bypass the pre-update hook
      const query = Session.findOneAndUpdate(
        {
          _id: sessionId,
          schoolId: schoolId
        },
        {
          $set: { activeStatus: true }
        },
        {
          new: true,
          session: dbSession
        }
      );
      // Set the flag to bypass validation hook
      query.setOptions({ skipActiveStatusValidation: true });
      const updatedSession = await query;

      if (!updatedSession) {
        // Check if session exists but doesn't belong to school
        const sessionExists = await Session.findById(sessionId).session(dbSession);
        if (sessionExists) {
          throw new Error('Session does not belong to your school');
        }
    throw new Error('Session not found');
  }

      activatedSession = updatedSession;
    });

    // Return the activated session
    return activatedSession;
  } catch (error) {
    // If transaction is not supported (single-node MongoDB), fall back to non-transactional approach
    // The unique index will still enforce the constraint
    if (error.message && (
      error.message.includes('Transaction numbers are only allowed on a replica set') ||
      error.message.includes('not supported') ||
      error.codeName === 'TransactionTooLarge' ||
      error.codeName === 'NoSuchTransaction'
    )) {
      await dbSession.endSession();
      
      // Fallback: Use atomic operations without transaction
      // Step 1: Deactivate all other sessions for this school
      const deactivateQuery = Session.updateMany(
        {
          schoolId: schoolId,
          _id: { $ne: sessionId },
          activeStatus: true
        },
        {
          $set: { activeStatus: false }
        }
      );
      // Set the flag to bypass validation hook
      deactivateQuery.setOptions({ skipActiveStatusValidation: true });
      await deactivateQuery;

      // Step 2: Activate the target session atomically
      // The unique index will prevent multiple active sessions
      // Set skipActiveStatusValidation to bypass the pre-update hook
      const query = Session.findOneAndUpdate(
        {
          _id: sessionId,
          schoolId: schoolId
        },
        {
          $set: { activeStatus: true }
        },
        {
          new: true
        }
      );
      // Set the flag to bypass validation hook
      query.setOptions({ skipActiveStatusValidation: true });
      const updatedSession = await query;

      if (!updatedSession) {
        // Check if session exists but doesn't belong to school
        const sessionExists = await Session.findById(sessionId);
        if (sessionExists) {
    throw new Error('Session does not belong to your school');
  }
        throw new Error('Session not found');
      }

      return updatedSession;
    }
    
    // Re-throw service-specific errors
    if (error.message.includes('Session not found') || 
        error.message.includes('does not belong to your school')) {
      throw error;
    }
    
    // Handle unique index violation (enforced by database constraint)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      throw new Error('Another session is already active for this school. Please try again.');
    }
    
    throw error;
  } finally {
    await dbSession.endSession();
  }
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

  // Use updateOne with skipActiveStatusValidation to bypass validation hook
  await Session.updateOne(
    { _id: sessionId },
    { $set: { activeStatus: false } },
    { skipActiveStatusValidation: true }
  );
  
  // Reload session to return updated version
  const updatedSession = await Session.findById(sessionId);

  return updatedSession;
};

// Get the active session for a school
// Throws error if no active session exists or if session is archived
// Validates that exactly one active session exists (enforced by DB constraint)
const getActiveSession = async (schoolId) => {
  // Query for active sessions - should return exactly one due to unique index
  // Only check active sessions (exclude deleted/inactive)
  const activeSessions = await Session.find({
    schoolId: schoolId,
    activeStatus: true
    // Note: status field is for session lifecycle (ACTIVE/DISABLED), not for active session selection
    // We only check activeStatus which indicates if this is the active session for the school
  });

  // Validate constraint: exactly one active session should exist
  if (activeSessions.length === 0) {
    throw new Error('No active session found for this school. Please activate a session first.');
  }

  // Safety check: if somehow multiple active sessions exist (should never happen due to unique index)
  if (activeSessions.length > 1) {
    console.error(`WARNING: Multiple active sessions found for school ${schoolId}. This violates the unique constraint.`);
    // Deactivate all but the first one (oldest by creation date)
    const sortedSessions = activeSessions.sort((a, b) => a.createdAt - b.createdAt);
    const keepSession = sortedSessions[0];
    
    // Deactivate all others
    for (let i = 1; i < sortedSessions.length; i++) {
      await Session.updateOne(
        { _id: sortedSessions[i]._id },
        { $set: { activeStatus: false } },
        { skipActiveStatusValidation: true }
      );
    }
    
    // Return the kept session
    const activeSession = await Session.findById(keepSession._id);
    
    // Check if session is archived (archived sessions are read-only)
    if (activeSession.archived) {
      throw new Error('The active session is archived and cannot be used for data operations. Please activate a different session.');
    }
    
    return activeSession;
  }

  const activeSession = activeSessions[0];

  // Check if session is archived (archived sessions are read-only)
  if (activeSession.archived) {
    throw new Error('The active session is archived and cannot be used for data operations. Please activate a different session.');
  }

  return activeSession;
};

// Validate that a session is active and not archived
// Used for validating existing records' sessions
const validateSessionActive = async (sessionId, schoolId) => {
  const session = await Session.findById(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Session does not belong to your school');
  }

  if (!session.activeStatus) {
    throw new Error('Cannot perform this operation. The session is not active.');
  }

  if (session.archived) {
    throw new Error('Cannot perform this operation. The session is archived and read-only.');
  }

  return session;
};

// Archive a session (marks it as archived and read-only)
// Archived sessions cannot be modified or have new data created
const archiveSession = async (sessionId, schoolId) => {
  // Verify session exists and belongs to the school
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Session does not belong to your school');
  }

  // Cannot archive an active session (must deactivate first)
  if (session.activeStatus) {
    throw new Error('Cannot archive an active session. Please deactivate it first.');
  }

  // Check if already archived
  if (session.archived) {
    throw new Error('Session is already archived');
  }

  session.archived = true;
  session.archivedAt = new Date();
  await session.save();

  return session;
};

// Unarchive a session (makes it available for read access, but still inactive)
const unarchiveSession = async (sessionId, schoolId) => {
  // Verify session exists and belongs to the school
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Session does not belong to your school');
  }

  // Check if already unarchived
  if (!session.archived) {
    throw new Error('Session is not archived');
  }

  session.archived = false;
  session.archivedAt = null;
  await session.save();

  return session;
};

// Get session by ID (for validation)
const getSessionById = async (sessionId, schoolId) => {
  const session = await Session.findById(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }

  if (schoolId && session.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Session does not belong to your school');
  }

  return session;
};

// Validate that only one active session exists per school (safety check)
// This is enforced by the unique index, but this function provides an additional validation layer
const validateSingleActiveSession = async (schoolId) => {
  const activeSessions = await Session.find({
    schoolId: schoolId,
    activeStatus: true
  });

  if (activeSessions.length > 1) {
    throw new Error(`Multiple active sessions found for school ${schoolId}. This violates the single active session constraint.`);
  }

  return activeSessions.length === 1 ? activeSessions[0] : null;
};

module.exports = {
  createSession,
  getSessions,
  activateSession,
  deactivateSession,
  getActiveSession,
  validateSessionActive,
  archiveSession,
  unarchiveSession,
  getSessionById,
  validateSingleActiveSession
};