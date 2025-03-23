import reviewService from '../services/reviewService.js';

// Get Google reviews for a provider
export const getGoogleReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    
    if (!providerId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }
    
    const reviews = await reviewService.getGoogleReviews(providerId);
    res.json(reviews);
  } catch (error) {
    console.error('Error in getGoogleReviews:', error);
    res.status(500).json({ error: 'Failed to fetch Google reviews' });
  }
};

// Get Reddit reviews for a provider
export const getRedditReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    
    if (!providerId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }
    
    const reviews = await reviewService.getRedditReviews(providerId);
    res.json(reviews);
  } catch (error) {
    console.error('Error in getRedditReviews:', error);
    res.status(500).json({ error: 'Failed to fetch Reddit reviews' });
  }
};

// Get analysis of provider reviews
export const getReviewAnalysis = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { name } = req.query;
    
    if (!providerId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Provider name is required for review analysis' });
    }
    
    const analysis = await reviewService.analyzeReviews(providerId, name);
    res.json(analysis);
  } catch (error) {
    console.error('Error in getReviewAnalysis:', error);
    res.status(500).json({ error: 'Failed to analyze reviews' });
  }
};
