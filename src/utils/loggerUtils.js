/**
 * Utility functions for logging
 */
import fs from 'fs';
import path from 'path';

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Default log directory
const LOG_DIR = process.env.LOG_DIR || 'logs';

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log message
 */
const formatLogMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message} ${metaString}`.trim() + '\n';
};

/**
 * Write log to file
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const writeToFile = (level, message, meta = {}) => {
  if (process.env.NODE_ENV === 'test') return;
  
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `app-${today}.log`);
  const logMessage = formatLogMessage(level, message, meta);
  
  fs.appendFileSync(logFile, logMessage);
};

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata
 */
export const logError = (message, meta = {}) => {
  console.error(`ERROR: ${message}`, meta);
  writeToFile(LOG_LEVELS.ERROR, message, meta);
};

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
export const logWarn = (message, meta = {}) => {
  console.warn(`WARN: ${message}`, meta);
  writeToFile(LOG_LEVELS.WARN, message, meta);
};

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
export const logInfo = (message, meta = {}) => {
  console.log(`INFO: ${message}`, meta);
  writeToFile(LOG_LEVELS.INFO, message, meta);
};

/**
 * Log debug message (only in development)
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
export const logDebug = (message, meta = {}) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`DEBUG: ${message}`, meta);
    writeToFile(LOG_LEVELS.DEBUG, message, meta);
  }
};

/**
 * Log request information (middleware)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime: `${duration}ms`
    };
    
    const message = `${req.method} ${req.originalUrl} ${res.statusCode}`;
    
    if (res.statusCode >= 500) {
      logError(message, meta);
    } else if (res.statusCode >= 400) {
      logWarn(message, meta);
    } else {
      logInfo(message, meta);
    }
  });
  
  next();
};
