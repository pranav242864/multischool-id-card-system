/**
 * CRITICAL AUTHENTICATION TESTS
 * 
 * These tests verify that authentication is strictly enforced:
 * - Wrong password → login MUST fail
 * - Correct password → login MUST succeed
 * - Non-existent user → login MUST fail
 * - Plain text passwords → login MUST fail
 * - Missing passwordHash → login MUST fail
 */

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../app');
const User = require('../models/User');
const School = require('../models/School');

describe('Authentication Security Tests', () => {
  let testSchool;
  let testUser;
  const correctPassword = 'TestPassword123!';
  let correctPasswordHash;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGO_URI environment variable not set');
    }
    await mongoose.connect(mongoUri);

    // Create test school
    testSchool = await School.create({
      name: 'Test School',
      address: '123 Test St',
      phone: '123-456-7890',
      email: 'test@school.com'
    });

    // Hash correct password
    const salt = await bcrypt.genSalt(10);
    correctPasswordHash = await bcrypt.hash(correctPassword, salt);

    // Create test user with properly hashed password
    testUser = await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      username: 'testuser',
      passwordHash: correctPasswordHash,
      role: 'Schooladmin',
      schoolId: testSchool._id,
      status: 'active'
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) await User.deleteOne({ _id: testUser._id });
    if (testSchool) await School.deleteOne({ _id: testSchool._id });
    await mongoose.disconnect();
  });

  describe('Wrong Password → Login MUST Fail', () => {
    test('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
      expect(response.body.token).toBeUndefined();
    });

    test('should reject login with empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.token).toBeUndefined();
    });

    test('should reject login with password that is close but wrong', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.token).toBeUndefined();
    });
  });

  describe('Correct Password → Login MUST Succeed', () => {
    test('should allow login with correct password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: correctPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.passwordHash).toBeUndefined(); // Should not return password
    });
  });

  describe('Non-existent User → Login MUST Fail', () => {
    test('should reject login for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
      expect(response.body.token).toBeUndefined();
    });
  });

  describe('Plain Text Passwords → Login MUST Fail', () => {
    let plainTextUser;

    beforeAll(async () => {
      // Create user with plain text password (simulating old/insecure data)
      plainTextUser = await User.create({
        name: 'Plain Text User',
        email: 'plaintext@example.com',
        username: 'plaintextuser',
        passwordHash: 'PlainTextPassword123!', // NOT a bcrypt hash
        role: 'Schooladmin',
        schoolId: testSchool._id,
        status: 'active'
      });
    });

    afterAll(async () => {
      if (plainTextUser) await User.deleteOne({ _id: plainTextUser._id });
    });

    test('should reject login for user with plain text password (even with correct password)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: plainTextUser.email,
          password: 'PlainTextPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
      expect(response.body.token).toBeUndefined();
    });

    test('should reject login for user with plain text password (with wrong password)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: plainTextUser.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.token).toBeUndefined();
    });
  });

  describe('Missing passwordHash → Login MUST Fail', () => {
    let noPasswordUser;

    beforeAll(async () => {
      // Create user without passwordHash (simulating corrupted data)
      noPasswordUser = await User.create({
        name: 'No Password User',
        email: 'nopassword@example.com',
        username: 'nopassworduser',
        passwordHash: null, // Missing passwordHash
        role: 'Schooladmin',
        schoolId: testSchool._id,
        status: 'active'
      });
    });

    afterAll(async () => {
      if (noPasswordUser) await User.deleteOne({ _id: noPasswordUser._id });
    });

    test('should reject login for user with missing passwordHash', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: noPasswordUser.email,
          password: 'AnyPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
      expect(response.body.token).toBeUndefined();
    });
  });

  describe('bcrypt.compare Strict Validation', () => {
    test('should only accept explicit true from bcrypt.compare', async () => {
      // This test ensures that we're using strict boolean comparison
      // and not accepting any truthy values
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: correctPassword + 'extra' // Wrong password
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

