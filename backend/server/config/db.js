const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  if (!env.mongoUri) {
    console.error('MongoDB connection error: MONGO_URI environment variable is not set');
    throw new Error('MONGO_URI is required');
  }
  try {
    const conn = await mongoose.connect(env.mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;