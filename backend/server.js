console.log("RAILWAY STARTED");

const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

const app = require('./server/app');
const env = require('./server/config/env');

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  console.error(err.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

// Handle uncaught exceptions from async operations
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error(`Uncaught Exception Monitor: ${err.message}`);
  console.error(err.stack);
});

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = server;