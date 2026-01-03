const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connect to MongoDB database
 * @throws {Error} If connection fails - server should not start without database
 */
const connectDB = async () => {
  try {
    if (!env.mongoUri) {
      throw new Error('MONGO_URI environment variable is not set. Cannot connect to database.');
    }

    const conn = await mongoose.connect(env.mongoUri, {
      // Connection options for better error handling
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('\n❌ MongoDB connection error:');
    console.error(`   ${error.message}`);
    console.error('\n💡 Check your MONGO_URI in .env file');
    console.error('   Example: MONGO_URI=mongodb://localhost:27017/multischool\n');
    
    // Fail fast - server should not start without database
    console.error('❌ Server startup aborted due to database connection failure\n');
    process.exit(1);
  }
};

module.exports = connectDB;