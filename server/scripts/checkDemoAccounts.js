/**
 * SECURITY AUDIT: Check demo accounts for security issues
 * 
 * This script checks demo accounts to ensure:
 * 1. They have proper bcrypt hashes (not plain text)
 * 2. They don't have any special flags that bypass password checks
 * 3. Their passwordHash is valid and secure
 * 
 * Run: node server/scripts/checkDemoAccounts.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const BCRYPT_HASH_PATTERN = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const DEMO_EMAILS = ['super@admin.com', 'admin@school.com', 'teacher@school.com'];

async function checkDemoAccounts() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI or MONGO_URI environment variable not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    console.log('Checking demo accounts for security issues...\n');

    for (const email of DEMO_EMAILS) {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.log(`⚠️  ${email}: User not found in database`);
        continue;
      }

      console.log(`\n📧 ${email}:`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      
      // Check passwordHash
      if (!user.passwordHash) {
        console.log(`   ❌ CRITICAL: No passwordHash!`);
        continue;
      }

      console.log(`   PasswordHash length: ${user.passwordHash.length}`);
      console.log(`   PasswordHash prefix: ${user.passwordHash.substring(0, 20)}...`);

      // Check if it's a valid bcrypt hash
      const isBcryptHash = BCRYPT_HASH_PATTERN.test(user.passwordHash);
      if (!isBcryptHash) {
        console.log(`   ❌ CRITICAL: PasswordHash is NOT a valid bcrypt hash!`);
        console.log(`   ⚠️  This appears to be plain text or invalid format`);
        console.log(`   🔧 ACTION REQUIRED: User must reset password`);
        continue;
      }

      console.log(`   ✓ PasswordHash is valid bcrypt format`);

      // Test password comparison with wrong password
      const wrongPassword = 'WrongPassword123!';
      const wrongMatch = await bcrypt.compare(wrongPassword, user.passwordHash);
      console.log(`   Test with wrong password: ${wrongMatch ? '❌ MATCHED (SECURITY ISSUE!)' : '✓ Correctly rejected'}`);

      // Test with empty password
      const emptyMatch = await bcrypt.compare('', user.passwordHash);
      console.log(`   Test with empty password: ${emptyMatch ? '❌ MATCHED (SECURITY ISSUE!)' : '✓ Correctly rejected'}`);

      // Check for any special properties that might bypass auth
      const userObj = user.toObject();
      const suspiciousProps = ['bypassPassword', 'isDemo', 'demoMode', 'testUser', 'skipAuth'];
      const hasSuspiciousProps = suspiciousProps.some(prop => userObj.hasOwnProperty(prop));
      
      if (hasSuspiciousProps) {
        console.log(`   ⚠️  WARNING: User has suspicious properties:`, 
          suspiciousProps.filter(prop => userObj.hasOwnProperty(prop))
        );
      } else {
        console.log(`   ✓ No suspicious bypass properties found`);
      }
    }

    console.log('\n\n🔍 Checking for any users with plain text passwords...');
    const allUsers = await User.find({});
    let plainTextCount = 0;
    
    for (const user of allUsers) {
      if (user.passwordHash && !BCRYPT_HASH_PATTERN.test(user.passwordHash)) {
        plainTextCount++;
        console.log(`   ❌ ${user.email} (${user.username}): Plain text password detected`);
      }
    }

    if (plainTextCount === 0) {
      console.log('   ✓ All users have properly hashed passwords');
    } else {
      console.log(`\n   ⚠️  Found ${plainTextCount} users with plain text passwords`);
      console.log('   🔧 ACTION REQUIRED: These users must reset their passwords');
    }

    await mongoose.disconnect();
    console.log('\n✓ Audit complete');
    
  } catch (error) {
    console.error('Error checking demo accounts:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  checkDemoAccounts();
}

module.exports = { checkDemoAccounts };

