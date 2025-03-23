import express from 'express';
import mapController from '../controllers/mapController.js';

const router = express.Router();

// Get map configuration
router.get('/config', mapController.getMapConfig);

// Unified search endpoint for providers
router.get('/providers', mapController.searchProviders);

// Get provider details
router.get('/providers/:placeId', mapController.getProviderDetails);

export default router;
