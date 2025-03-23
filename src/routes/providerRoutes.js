import express from 'express';
import * as providerController from '../controllers/providerController.js';

const router = express.Router();

// Get providers with filtering
router.get('/', providerController.getNearbyProviders);

// Get detailed provider information
router.get('/:id', providerController.getProviderDetails);

// Get providers near a location
router.get('/nearby', providerController.getNearbyProviders);

export default router;
