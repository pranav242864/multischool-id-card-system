/**
 * SETUP DEMO ACCOUNTS
 * 
 * This script creates or updates demo accounts with proper passwords:
 * 1. Creates a demo school if it doesn't exist
 * 2. Creates or updates demo users with bcrypt-hashed passwords
 * 3. Ensures all users have correct schoolId assignments
 * 
 * Run: node server/scripts/setupDemoAccounts.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const School = require('../models/School');
require('dotenv').config();

const DEMO_ACCOUNTS = [
  { 
    email: 'super@admin.com', 
    password: 'admin123', 
    role: 'SUPERADMIN',
    name: 'Super Admin',
    username: 'superadmin'
  },
  { 
    email: 'admin@school.com', 
    password: 'admin123', 
    role: 'SCHOOLADMIN',
    name: 'School Admin',
    username: 'schooladmin'
  },
  { 
    email: 'teacher@school.com', 
    password: 'teacher123', 
    role: 'TEACHER',
    name: 'Demo Teacher',
    username: 'teacher'
  }
];

const DEMO_SCHOOL = {
  name: 'Demo School',
  address: '123 Demo Street, Demo City',
  contactEmail: 'admin@school.com',
  status: 'active'
};

async function setupDemoAccounts() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI or MONGO_URI environment variable not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Create or get demo school
    console.log('📚 Setting up demo school...');
    let demoSchool = await School.findOne({ name: DEMO_SCHOOL.name });
    
    if (!demoSchool) {
      demoSchool = await School.create(DEMO_SCHOOL);
      console.log(`   ✅ Created demo school: ${demoSchool.name} (ID: ${demoSchool._id})`);
    } else {
      console.log(`   ✓ Demo school already exists: ${demoSchool.name} (ID: ${demoSchool._id})`);
    }

    console.log('\n👤 Setting up demo accounts...\n');

    // Step 2: Create or update demo users
    for (const account of DEMO_ACCOUNTS) {
      let user = await User.findOne({ email: account.email.toLowerCase() });
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(account.password, saltRounds);

      if (!user) {
        // Create new user
        const userData = {
          email: account.email.toLowerCase(),
          passwordHash: passwordHash,
          role: account.role,
          name: account.name,
          username: account.username,
          status: 'ACTIVE'
        };

        // Only add schoolId for non-superadmin users
        if (account.role !== 'SUPERADMIN') {
          userData.schoolId = demoSchool._id;
        }

        user = await User.create(userData);
        console.log(`   ✅ Created ${account.role}: ${account.email}`);
        console.log(`      Password: ${account.password}`);
        console.log(`      School: ${account.role === 'SUPERADMIN' ? 'N/A' : demoSchool.name}`);
      } else {
        // Update existing user
        const updates = {
          passwordHash: passwordHash,
          status: 'ACTIVE',
          role: account.role  // Update role to match expected format
        };

        // Ensure schoolId is set for non-superadmin users
        if (account.role !== 'SUPERADMIN') {
          updates.schoolId = demoSchool._id;
        } else {
          // Ensure superadmin doesn't have schoolId
          updates.schoolId = undefined;
        }

        // Update name and username if they're missing
        if (!user.name) updates.name = account.name;
        if (!user.username) updates.username = account.username;

        await User.findByIdAndUpdate(user._id, updates);
        // Reload user to get updated passwordHash
        user = await User.findById(user._id);
        console.log(`   ✅ Updated ${account.role}: ${account.email}`);
        console.log(`      Password: ${account.password}`);
        console.log(`      School: ${account.role === 'SUPERADMIN' ? 'N/A' : demoSchool.name}`);
      }

      // Verify password works (use the passwordHash we just set)
      const hashToVerify = user.passwordHash || passwordHash;
      const verifyMatch = await bcrypt.compare(account.password, hashToVerify);
      if (!verifyMatch) {
        console.log(`   ⚠️  WARNING: Password verification failed for ${account.email}`);
      } else {
        console.log(`      ✓ Password verified\n`);
      }
    }

    console.log('\n✅ Demo account setup complete!\n');
    console.log('📋 Login Credentials:');
    console.log('   Superadmin:');
    console.log('      Email: super@admin.com');
    console.log('      Password: admin123\n');
    console.log('   School Admin:');
    console.log('      Email: admin@school.com');
    console.log('      Password: admin123\n');
    console.log('   Teacher:');
    console.log('      Email: teacher@school.com');
    console.log('      Password: teacher123\n');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error setting up demo accounts:', error);
    if (error.code === 11000) {
      console.error('   Duplicate key error - user may already exist with different field');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  setupDemoAccounts();
}

module.exports = { setupDemoAccounts };

