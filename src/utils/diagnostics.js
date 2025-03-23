/**
 * Diagnostic utilities for troubleshooting API connections
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Check if required API keys are available
 * @returns {Object} Object containing validation results
 */
export const validateApiKeys = () => {
  const results = {
    googleMapsApiKey: {
      available: !!process.env.GOOGLE_MAPS_API_KEY,
      maskedValue: process.env.GOOGLE_MAPS_API_KEY ? 
        `${process.env.GOOGLE_MAPS_API_KEY.substring(0, 3)}...${process.env.GOOGLE_MAPS_API_KEY.substring(process.env.GOOGLE_MAPS_API_KEY.length - 3)}` : 
        null
    }
  };
  
  return results;
};

/**
 * Log API request information without sensitive data
 * @param {Object} req - Express request object
 * @returns {Object} Safe request info for logging
 */
export const logRequestInfo = (req) => {
  return {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      'accept': req.headers.accept,
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin,
      'referer': req.headers.referer
    }
  };
};
