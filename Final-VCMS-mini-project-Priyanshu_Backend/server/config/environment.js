/**
 * Environment Configuration Manager
 * Validates and manages all environment variables
 * Ensures production-safe defaults
 */

const path = require('path');
const fs = require('fs');

// Load .env file if it exists
if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

/**
 * Configuration schema with defaults and validation
 */
const CONFIG_SCHEMA = {
  // Server Configuration
  NODE_ENV: {
    env: 'NODE_ENV',
    default: 'development',
    enum: ['development', 'production', 'staging', 'test'],
    validate: (val) => ['development', 'production', 'staging', 'test'].includes(val)
  },
  PORT: {
    env: 'PORT',
    default: 5000,
    validate: (val) => Number.isInteger(Number(val)) && val > 0 && val < 65536
  },

  // Database Configuration
  MONGODB_URI: {
    env: 'MONGODB_URI',
    default: 'mongodb://localhost:27017/vcms',
    validate: (val) => val.startsWith('mongodb://') || val.startsWith('mongodb+srv://')
  },
  MONGO_ROOT_USER: {
    env: 'MONGO_ROOT_USER',
    default: 'admin',
    validate: (val) => val && val.length >= 3
  },
  MONGO_ROOT_PASSWORD: {
    env: 'MONGO_ROOT_PASSWORD',
    default: '',
    validate: (val) => val && val.length >= 8
  },
  MONGO_PORT: {
    env: 'MONGO_PORT',
    default: 27017,
    validate: (val) => Number.isInteger(Number(val))
  },

  // JWT Configuration
  JWT_SECRET: {
    env: 'JWT_SECRET',
    default: '',
    validate: (val) => {
      if (!val) {
        console.error('❌ JWT_SECRET is required and must be set');
        return false;
      }
      if (val.length < 32) {
        console.error('❌ JWT_SECRET must be at least 32 characters');
        return false;
      }
      return true;
    }
  },
  JWT_EXPIRE: {
    env: 'JWT_EXPIRE',
    default: '24h',
    validate: (val) => /^\d+[hdm]$/.test(val)
  },

  // Frontend Configuration
  FRONTEND_URL: {
    env: 'FRONTEND_URL',
    default: 'http://localhost:5173',
    validate: (val) => val.startsWith('http://') || val.startsWith('https://')
  },

  // Email Configuration
  EMAIL_USER: {
    env: 'EMAIL_USER',
    default: '',
    validate: (val) => val && val.includes('@')
  },
  EMAIL_APP_PASSWORD: {
    env: 'EMAIL_APP_PASSWORD',
    default: '',
    validate: (val) => val && val.length >= 8
  },

  // Logging Configuration
  LOG_LEVEL: {
    env: 'LOG_LEVEL',
    default: 'info',
    enum: ['error', 'warn', 'info', 'debug'],
    validate: (val) => ['error', 'warn', 'info', 'debug'].includes(val)
  },

  // Security Configuration
  RATE_LIMIT_WINDOW_MS: {
    env: 'RATE_LIMIT_WINDOW_MS',
    default: 15 * 60 * 1000,
    validate: (val) => Number.isInteger(Number(val)) && val > 0
  },
  RATE_LIMIT_MAX_REQUESTS: {
    env: 'RATE_LIMIT_MAX_REQUESTS',
    default: 100,
    validate: (val) => Number.isInteger(Number(val)) && val > 0
  }
};

/**
 * Get and validate configuration
 */
function getConfig() {
  const config = {};
  const errors = [];
  const warnings = [];

  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    const value = process.env[schema.env] !== undefined 
      ? process.env[schema.env] 
      : schema.default;

    // Validate value
    if (schema.validate) {
      if (!schema.validate(value)) {
        errors.push(`Invalid value for ${key}: ${value}`);
      }
    }

    // Check enum values
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${key} must be one of: ${schema.enum.join(', ')}`);
    }

    // Warn if using default for important configs
    if (process.env[schema.env] === undefined) {
      if (['JWT_SECRET', 'MONGO_ROOT_PASSWORD', 'EMAIL_APP_PASSWORD'].includes(key)) {
        if (process.env.NODE_ENV === 'production') {
          errors.push(`${key} must be set in production`);
        } else {
          warnings.push(`Using default for ${key} (development only)`);
        }
      }
    }

    config[key] = value;
  }

  // Report errors and warnings
  if (errors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    throw new Error('Invalid configuration');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:');
    warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  return config;
}

/**
 * Validate configuration on startup
 */
function validateConfig(config) {
  const validationResults = {
    passed: [],
    failed: []
  };

  // Test MongoDB connection string
  if (!config.MONGODB_URI.includes('mongodb')) {
    validationResults.failed.push('Invalid MongoDB URI');
  } else {
    validationResults.passed.push('MongoDB URI format valid');
  }

  // Test JWT secret
  if (config.JWT_SECRET.length >= 32) {
    validationResults.passed.push('JWT secret strong enough');
  } else {
    validationResults.failed.push('JWT secret too weak');
  }

  // Test Frontend URL
  try {
    new URL(config.FRONTEND_URL);
    validationResults.passed.push('Frontend URL valid');
  } catch (err) {
    validationResults.failed.push('Invalid Frontend URL');
  }

  return validationResults;
}

/**
 * Print configuration summary
 */
function printConfigSummary(config) {
  console.log('\n📋 Configuration Summary:');
  console.log('========================');
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Server Port: ${config.PORT}`);
  console.log(`Database: ${config.MONGODB_URI.substring(0, 50)}...`);
  console.log(`Frontend URL: ${config.FRONTEND_URL}`);
  console.log(`JWT Expiry: ${config.JWT_EXPIRE}`);
  console.log(`Log Level: ${config.LOG_LEVEL}`);
  console.log('========================\n');
}

// Get and validate configuration
let config = null;

function getConfigInstance() {
  if (!config) {
    config = getConfig();
    const validation = validateConfig(config);
    
    if (validation.failed.length > 0) {
      console.warn('⚠️  Configuration Validation Issues:');
      validation.failed.forEach(issue => console.warn(`   - ${issue}`));
    }
    
    if (process.env.NODE_ENV !== 'test') {
      printConfigSummary(config);
    }
  }
  return config;
}

module.exports = {
  getConfig: getConfigInstance,
  validateConfig,
  CONFIG_SCHEMA
};
