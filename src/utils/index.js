/**
 * Central export point for all utility functions
 * Makes importing utilities cleaner throughout the application
 */

export * from './sentimentUtils.js';
export * from './responseUtils.js';
export * from './errorUtils.js';
export * from './validationUtils.js';
export * from './loggerUtils.js';
export * from './dateUtils.js';

// Add custom exports or utility compositions here

/**
 * Generate a random ID with specified length
 * @param {number} length - Length of the ID
 * @returns {string} Random ID
 */
export const generateId = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
};
