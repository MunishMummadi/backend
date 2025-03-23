import express from 'express';
import twilioController from '../controllers/twilioController.js';

const router = express.Router();

// Webhook for incoming SMS messages
router.post('/webhook/incoming', twilioController.handleIncomingSms);

// Webhook for message status updates
router.post('/webhook/status', twilioController.handleStatusCallback);

// Health check endpoint
router.get('/health', twilioController.checkSmsServiceHealth);

// Test message endpoint (for admin/debugging)
router.post('/test-message', twilioController.sendTestMessage);

export default router;
