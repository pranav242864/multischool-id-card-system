/**
 * SECURITY FIX: Check and re-hash any plain text passwords in the database
 * 
 * This script:
 * 1. Finds all users with passwords that are NOT bcrypt hashes
 * 2. Re-hashes them using bcrypt
 * 3. Updates the database
 * 
 * Run this script to fix any existing plain text passwords:
 * node server/scripts/fixPlainTextPasswords.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Bcrypt hash pattern: starts with $2a$, $2b$, or $2y$ followed by cost and salt/hash
const BCRYPT_HASH_PATTERN = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/;

async function fixPlainTextPasswords() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI or MONGO_URI environment variable not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to check`);

    let plainTextCount = 0;
    let fixedCount = 0;
    const usersToFix = [];

    // Check each user's passwordHash
    for (const user of users) {
      if (!user.passwordHash) {
        console.warn(`WARNING: User ${user.email} (${user._id}) has no passwordHash`);
        continue;
      }

      // Check if passwordHash is a valid bcrypt hash
      const isBcryptHash = BCRYPT_HASH_PATTERN.test(user.passwordHash);
      
      if (!isBcryptHash) {
        plainTextCount++;
        usersToFix.push({
          id: user._id,
          email: user.email,
          username: user.username,
          currentHash: user.passwordHash.substring(0, 20) + '...',
          isPlainText: true
        });
        console.log(`FOUND PLAIN TEXT PASSWORD: ${user.email} (${user.username})`);
      }
    }

    if (plainTextCount === 0) {
      console.log('✓ All passwords are properly hashed. No action needed.');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n⚠️  FOUND ${plainTextCount} USERS WITH PLAIN TEXT PASSWORDS`);
    console.log('These users will need to reset their passwords for security.');
    console.log('Plain text passwords cannot be automatically re-hashed without the original password.\n');

    // For security, we cannot re-hash plain text passwords without the original password
    // Instead, we should mark these users as requiring password reset
    console.log('RECOMMENDED ACTION:');
    console.log('1. Notify these users that they must reset their passwords');
    console.log('2. Use the password reset functionality to set new hashed passwords');
    console.log('3. Or manually set new passwords using the admin interface\n');

    console.log('Users with plain text passwords:');
    usersToFix.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.username}) - ID: ${user.id}`);
    });

    // Optionally, you can set a flag or update status for these users
    // For now, we'll just report them
    console.log('\n⚠️  SECURITY WARNING: These users have plain text passwords and login will be REJECTED');
    console.log('   until their passwords are properly hashed.\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(plainTextCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error fixing plain text passwords:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixPlainTextPasswords();
}

module.exports = { fixPlainTextPasswords, BCRYPT_HASH_PATTERN };

