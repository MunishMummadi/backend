// Simple rate limiter middleware
const requestCounts = {};
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 60; // 60 requests per minute

export const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Initialize or clean up old requests
  requestCounts[ip] = requestCounts[ip] || [];
  requestCounts[ip] = requestCounts[ip].filter(time => time > now - WINDOW_MS);
  
  // Check if rate limit exceeded
  if (requestCounts[ip].length >= MAX_REQUESTS) {
    return res.status(429).json({ 
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil((requestCounts[ip][0] + WINDOW_MS - now) / 1000)
    });
  }
  
  // Add current request timestamp
  requestCounts[ip].push(now);
  
  next();
};
