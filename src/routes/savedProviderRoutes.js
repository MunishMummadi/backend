import express from 'express';
import * as savedProviderController from '../controllers/savedProviderController.js';

const router = express.Router();

// Save a provider
router.post('/', savedProviderController.saveProvider);

// Get all saved providers
router.get('/', savedProviderController.getSavedProviders);

// Unsave a provider
router.delete('/:providerId', savedProviderController.unsaveProvider);

export default router;
