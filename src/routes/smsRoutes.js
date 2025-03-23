import express from 'express';
import * as smsController from '../controllers/smsController.js';

const router = express.Router();

// Allow users to subscribe to SMS updates
router.post('/subscribe', smsController.subscribe);

// Send SMS updates about providers (admin only)
router.post('/send', smsController.sendProviderInfo);

// Get subscriptions by anonymous ID
router.get('/subscriptions/:anonymousId', smsController.getSubscriptions);

// Unsubscribe from SMS updates
router.delete('/unsubscribe/:phoneNumber', smsController.unsubscribe);

// Twilio webhook endpoint for incoming SMS and status callbacks
router.post('/webhook', smsController.twilioWebhook);

export default router;
