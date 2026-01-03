const dotenv = require('dotenv');

// ============================================================================
// STEP 1: Load environment variables FIRST (before any process.env access)
// ============================================================================
dotenv.config();

// ============================================================================
// STEP 2: Validate required environment variables (fail fast if missing)
// ============================================================================
const { validateEnv } = require('./server/config/validateEnv');

try {
  validateEnv();
} catch (error) {
  console.error(`\n❌ Environment validation failed: ${error.message}\n`);
  process.exit(1);
}

// ============================================================================
// STEP 3: Load app and configuration (after validation)
// ============================================================================
const app = require('./server/app');
const env = require('./server/config/env');

// ============================================================================
// STEP 4: Setup error handlers (before starting server)
// ============================================================================
// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('\n❌ Unhandled Promise Rejection:');
  console.error(`   ${err.message}`);
  if (err.stack) {
    console.error(`   ${err.stack}`);
  }
  // In production, you might want to exit here
  // For development, log and continue
  if (env.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('\n❌ Uncaught Exception:');
  console.error(`   ${err.message}`);
  if (err.stack) {
    console.error(`   ${err.stack}`);
  }
  // Always exit on uncaught exceptions - they indicate serious problems
  process.exit(1);
});

// Handle uncaught exceptions from async operations (monitoring only)
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error(`\n⚠️  Uncaught Exception Monitor: ${err.message}`);
  if (err.stack) {
    console.error(`   ${err.stack}`);
  }
});

// ============================================================================
// STEP 5: Start the server (only if validation passed)
// ============================================================================
const PORT = env.port;

// Ensure app.listen is called only once
let server;
try {
  server = app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`   Environment: ${env.nodeEnv}`);
    console.log(`   MongoDB: ${env.mongoUri ? 'Configured' : 'Not configured'}`);
    console.log(`   JWT Secret: ${env.jwtSecret ? 'Configured' : 'Not configured'}\n`);
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error(`   Please use a different port or stop the process using port ${PORT}\n`);
    } else {
      console.error(`\n❌ Server error: ${error.message}\n`);
    }
    process.exit(1);
  });
} catch (error) {
  console.error(`\n❌ Failed to start server: ${error.message}\n`);
  process.exit(1);
}

module.exports = server;