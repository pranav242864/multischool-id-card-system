/**
 * Central Session Utilities
 * 
 * This module provides centralized utilities for session operations.
 * All session-related queries should go through these utilities to ensure consistency.
 * 
 * Usage:
 *   const { getActiveSession } = require('../utils/sessionUtils');
 *   const activeSession = await getActiveSession(schoolId);
 */

const { getActiveSession: getActiveSessionService } = require('../services/session.service');

/**
 * Get the active session for a school
 * 
 * This is the central utility for getting the active session.
 * All controllers and services should use this instead of querying Session model directly.
 * 
 * @param {string} schoolId - The school ID
 * @returns {Promise<Object>} - The active session document
 * @throws {Error} - If no active session exists or if session is archived
 * 
 * @example
 * // In student creation
 * const activeSession = await getActiveSession(schoolId);
 * studentData.sessionId = activeSession._id;
 * 
 * @example
 * // In teacher assignment
 * const activeSession = await getActiveSession(schoolId);
 * if (classObj.sessionId.toString() !== activeSession._id.toString()) {
 *   throw new Error('Class does not belong to active session');
 * }
 * 
 * @example
 * // In class creation
 * const activeSession = await getActiveSession(schoolId);
 * classData.sessionId = activeSession._id;
 */
const getActiveSession = async (schoolId) => {
  if (!schoolId) {
    throw new Error('School ID is required to get active session');
  }
  
  return await getActiveSessionService(schoolId);
};

module.exports = {
  getActiveSession
};


