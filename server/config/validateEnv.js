/**
 * Environment Variable Validation
 * 
 * Validates required environment variables and fails fast with clear errors
 * if any are missing. This prevents silent misconfiguration.
 */

const requiredEnvVars = {
  MONGO_URI: {
    name: 'MONGO_URI',
    description: 'MongoDB connection string',
    example: 'mongodb://localhost:27017/multischool'
  },
  JWT_SECRET: {
    name: 'JWT_SECRET',
    description: 'Secret key for JWT token signing',
    example: 'your-super-secret-jwt-key-change-this-in-production'
  }
};

const optionalEnvVars = {
  PORT: {
    name: 'PORT',
    description: 'Server port number',
    default: 5001
  },
  NODE_ENV: {
    name: 'NODE_ENV',
    description: 'Node environment (development, production, test)',
    default: 'development'
  },
  MONGODB_URI: {
    name: 'MONGODB_URI',
    description: 'Alternative MongoDB connection string (alias for MONGO_URI)',
    alias: 'MONGO_URI'
  }
};

/**
 * Validates required environment variables
 * @throws {Error} If any required environment variable is missing
 */
function validateEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      // Check for alias (e.g., MONGODB_URI for MONGO_URI)
      if (config.alias && process.env[config.alias]) {
        // Alias exists, use it
        process.env[key] = process.env[config.alias];
        warnings.push(`Using ${config.alias} as ${key}`);
      } else {
        missing.push({
          name: key,
          description: config.description,
          example: config.example
        });
      }
    }
  }

  // If any required vars are missing, fail fast with clear error
  if (missing.length > 0) {
    console.error('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:\n');
    missing.forEach(({ name, description, example }) => {
      console.error(`   ${name}`);
      console.error(`   Description: ${description}`);
      console.error(`   Example: ${example}`);
      console.error(`   Add to .env file: ${name}=${example}\n`);
    });
    console.error('💡 Create a .env file in the project root with the required variables.\n');
    throw new Error(`Missing required environment variables: ${missing.map(v => v.name).join(', ')}`);
  }

  // Show warnings for aliases
  if (warnings.length > 0) {
    warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
  }

  // Validate JWT_SECRET is not the default value in production
  if (process.env.NODE_ENV === 'production' && 
      process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    console.error('\n❌ SECURITY WARNING:');
    console.error('   JWT_SECRET is set to the default value in production!');
    console.error('   This is a security risk. Please set a strong, unique JWT_SECRET.\n');
    throw new Error('JWT_SECRET must be changed from default value in production');
  }

  // Validate MONGO_URI format (basic check)
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (mongoUri && !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('\n❌ INVALID MONGO_URI FORMAT:');
    console.error(`   Current value: ${mongoUri}`);
    console.error('   Must start with "mongodb://" or "mongodb+srv://"\n');
    throw new Error('Invalid MONGO_URI format');
  }

  console.log('✅ Environment variables validated successfully');
}

module.exports = { validateEnv, requiredEnvVars, optionalEnvVars };

