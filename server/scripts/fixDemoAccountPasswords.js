/**
 * FIX DEMO ACCOUNT PASSWORDS
 * 
 * This script checks and fixes demo account passwords:
 * 1. Checks if passwords are properly hashed
 * 2. If not, hashes them with a known password
 * 3. Updates the database
 * 
 * Run: node server/scripts/fixDemoAccountPasswords.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const DEMO_ACCOUNTS = [
  { email: 'super@admin.com', password: 'admin123', role: 'Superadmin' },
  { email: 'admin@school.com', password: 'admin123', role: 'Schooladmin' },
  { email: 'teacher@school.com', password: 'teacher123', role: 'Teacher' }
];

async function fixDemoAccountPasswords() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI or MONGO_URI environment variable not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    console.log('Checking and fixing demo account passwords...\n');

    for (const demoAccount of DEMO_ACCOUNTS) {
      const user = await User.findOne({ email: demoAccount.email.toLowerCase() });
      
      if (!user) {
        console.log(`⚠️  ${demoAccount.email}: User not found - skipping`);
        continue;
      }

      console.log(`\n📧 ${demoAccount.email}:`);
      console.log(`   Current passwordHash length: ${user.passwordHash.length}`);
      console.log(`   Current passwordHash prefix: ${user.passwordHash.substring(0, 20)}...`);

      // Check if passwordHash is a bcrypt hash
      const isBcryptHash = user.passwordHash.startsWith('$2');
      
      if (!isBcryptHash) {
        console.log(`   ❌ Password is NOT a bcrypt hash - will fix`);
      } else {
        // Test if current password works
        const testMatch = await bcrypt.compare(demoAccount.password, user.passwordHash);
        if (testMatch) {
          console.log(`   ✓ Password is correctly hashed and matches`);
          continue;
        } else {
          console.log(`   ⚠️  Password hash exists but doesn't match expected password - will update`);
        }
      }

      // Hash the password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(demoAccount.password, saltRounds);
      
      // Update user
      user.passwordHash = newPasswordHash;
      await user.save();
      
      console.log(`   ✅ Password updated successfully`);
      console.log(`   New hash: ${newPasswordHash.substring(0, 30)}...`);
      
      // Verify it works
      const verifyMatch = await bcrypt.compare(demoAccount.password, newPasswordHash);
      console.log(`   Verification: ${verifyMatch ? '✅ PASS' : '❌ FAIL'}`);
    }

    console.log('\n✅ Demo account password fix complete');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error fixing demo account passwords:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  fixDemoAccountPasswords();
}

module.exports = { fixDemoAccountPasswords };

