import express from 'express';
import * as reviewController from '../controllers/reviewController.js';

const router = express.Router();

// Get Google reviews for a provider
router.get('/google/:providerId', reviewController.getGoogleReviews);

// Get Reddit reviews for a provider
router.get('/reddit/:providerId', reviewController.getRedditReviews);

// Get AI analysis of reviews
router.get('/analysis/:providerId', reviewController.getReviewAnalysis);

export default router;
