import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

// Import routes
import providerRoutes from './routes/providerRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import savedProviderRoutes from './routes/savedProviderRoutes.js';
import mapRoutes from './routes/mapRoutes.js';

// Import middleware
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import database
import sequelize from './config/database.js';
import { initializeDatabase } from './models/index.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiter);

// Initialize the database
(async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
})();

// Anonymous ID cookie middleware
app.use((req, res, next) => {
  if (!req.cookies.anonymousId) {
    // Generate a random ID
    const anonymousId = crypto.randomBytes(16).toString('hex');
    
    // Set cookie that expires in 1 year
    res.cookie('anonymousId', anonymousId, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      sameSite: 'strict'
    });
    
    req.cookies.anonymousId = anonymousId;
  }
  next();
});

// API Routes
app.use('/api/providers', providerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/saved', savedProviderRoutes);
app.use('/api/maps', mapRoutes);

// Error handling middleware
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server on explicitly defined port 3001
app.listen(3001, () => {
  console.log('Server running on port 3001');
});