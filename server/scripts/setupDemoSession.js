/**
 * SETUP DEMO SESSION
 * 
 * This script creates and activates a demo session for the demo school.
 * Sessions are required before you can create/fetch students, teachers, or classes.
 * 
 * Run: node server/scripts/setupDemoSession.js
 */

const mongoose = require('mongoose');
const Session = require('../models/Session');
const School = require('../models/School');
const { activateSession } = require('../services/session.service');
require('dotenv').config();

const DEMO_SCHOOL_NAME = 'Demo School';
const DEMO_SESSION_NAME = '2024/2025';

async function setupDemoSession() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI or MONGO_URI environment variable not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find demo school
    console.log('📚 Finding demo school...');
    const demoSchool = await School.findOne({ name: DEMO_SCHOOL_NAME });
    
    if (!demoSchool) {
      console.error(`❌ Demo school "${DEMO_SCHOOL_NAME}" not found!`);
      console.log('   Run: node server/scripts/setupDemoAccounts.js first\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`   ✓ Found demo school: ${demoSchool.name} (ID: ${demoSchool._id})\n`);

    // Step 2: Check if session already exists
    console.log('📅 Checking for existing session...');
    let demoSession = await Session.findOne({ 
      schoolId: demoSchool._id,
      sessionName: DEMO_SESSION_NAME
    });

    if (demoSession) {
      console.log(`   ✓ Session "${DEMO_SESSION_NAME}" already exists (ID: ${demoSession._id})`);
      console.log(`   Active Status: ${demoSession.activeStatus ? '✅ Active' : '❌ Inactive'}`);
      
      if (demoSession.activeStatus) {
        console.log('\n✅ Session is already active! No action needed.\n');
        await mongoose.disconnect();
        return;
      } else {
        console.log('   ⚠️  Session exists but is not active. Will activate it...\n');
      }
    } else {
      // Step 3: Create new session
      console.log(`📅 Creating new session "${DEMO_SESSION_NAME}"...`);
      
      // Set dates: current year to next year
      const now = new Date();
      const currentYear = now.getFullYear();
      const startDate = new Date(currentYear, 0, 1); // January 1st of current year
      const endDate = new Date(currentYear + 1, 11, 31); // December 31st of next year

      demoSession = await Session.create({
        sessionName: DEMO_SESSION_NAME,
        startDate: startDate,
        endDate: endDate,
        schoolId: demoSchool._id,
        activeStatus: false // Will be activated below
      });

      console.log(`   ✅ Created session: ${demoSession.sessionName}`);
      console.log(`      Start Date: ${startDate.toLocaleDateString()}`);
      console.log(`      End Date: ${endDate.toLocaleDateString()}\n`);
    }

    // Step 4: Activate the session
    console.log('🔄 Activating session...');
    try {
      const activatedSession = await activateSession(demoSession._id, demoSchool._id);
      console.log(`   ✅ Session activated successfully!`);
      console.log(`      Session ID: ${activatedSession._id}`);
      console.log(`      Session Name: ${activatedSession.sessionName}`);
      console.log(`      Active Status: ${activatedSession.activeStatus ? '✅ Active' : '❌ Inactive'}\n`);
    } catch (error) {
      console.error(`   ❌ Error activating session: ${error.message}`);
      throw error;
    }

    console.log('✅ Demo session setup complete!\n');
    console.log('📋 Summary:');
    console.log(`   School: ${demoSchool.name}`);
    console.log(`   Session: ${DEMO_SESSION_NAME}`);
    console.log(`   Status: Active ✅\n`);
    console.log('🎉 You can now fetch students, teachers, and classes!\n');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error setting up demo session:', error);
    if (error.message.includes('unique_active_session_per_school')) {
      console.error('   Another session is already active for this school.');
      console.error('   Deactivate it first or use the existing active session.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  setupDemoSession();
}

module.exports = { setupDemoSession };

