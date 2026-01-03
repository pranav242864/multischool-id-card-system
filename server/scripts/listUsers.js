/**
 * LIST ALL USERS
 * 
 * This script lists all users in the database to help debug login issues.
 * 
 * Run: node server/scripts/listUsers.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const School = require('../models/School');
require('dotenv').config();

async function listUsers() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI or MONGO_URI environment variable not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const users = await User.find({}).populate('schoolId').select('-passwordHash');
    
    console.log(`📋 Found ${users.length} users in database:\n`);
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database!');
      console.log('   Run: node server/scripts/setupDemoAccounts.js to create demo accounts\n');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   School: ${user.schoolId ? user.schoolId.name : 'N/A (Superadmin)'}`);
        console.log(`   School ID: ${user.schoolId ? user.schoolId._id : 'N/A'}`);
        console.log('');
      });
    }

    console.log('\n📝 Correct Login Credentials:');
    console.log('   Superadmin:');
    console.log('      Email: super@admin.com');
    console.log('      Password: admin123\n');
    console.log('   School Admin:');
    console.log('      Email: admin@school.com  ← Note: admin@school.com (NOT school@admin.com)');
    console.log('      Password: admin123\n');
    console.log('   Teacher:');
    console.log('      Email: teacher@school.com');
    console.log('      Password: teacher123\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  listUsers();
}

module.exports = { listUsers };

