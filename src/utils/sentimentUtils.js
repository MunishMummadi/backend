/**
 * Utility functions for sentiment analysis
 */

/**
 * Determines sentiment based on numeric rating
 * @param {number} rating - Rating value, typically 1-5
 * @param {Object} options - Custom threshold options
 * @param {number} options.positiveThreshold - Threshold for positive sentiment (default: 4)
 * @param {number} options.negativeThreshold - Threshold for negative sentiment (default: 2)
 * @returns {string} sentiment - 'positive', 'negative', or 'neutral'
 */
export const determineSentiment = (rating, options = {}) => {
  const { positiveThreshold = 4, negativeThreshold = 2 } = options;
  
  if (!rating && rating !== 0) return 'neutral';
  if (rating >= positiveThreshold) return 'positive';
  if (rating <= negativeThreshold) return 'negative';
  return 'neutral';
};

/**
 * Analyzes text content to detect sentiment markers
 * @param {string} content - The text content to analyze
 * @returns {string} sentiment - 'positive', 'negative', or 'neutral'
 */
export const analyzeTextSentiment = (content) => {
  if (!content) return 'neutral';
  
  const positiveWords = ['great', 'excellent', 'good', 'wonderful', 'fantastic', 
    'amazing', 'outstanding', 'helpful', 'recommend', 'best', 'caring'];
  
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'poor', 
    'disappointed', 'disappointing', 'rude', 'unprofessional', 'avoid', 'worst'];
  
  content = content.toLowerCase();
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex) || [];
    positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex) || [];
    negativeCount += matches.length;
  });
  
  if (positiveCount > negativeCount + 2) return 'positive';
  if (negativeCount > positiveCount + 1) return 'negative';
  return 'neutral';
};

/**
 * Aggregate sentiment from multiple sources
 * @param {Array} items - Array of objects with sentiment property
 * @returns {Object} - Sentiment breakdown with counts and primary sentiment
 */
export const aggregateSentiment = (items) => {
  if (!items || items.length === 0) {
    return {
      primary: 'neutral',
      breakdown: { positive: 0, neutral: 0, negative: 0 }
    };
  }
  
  const breakdown = items.reduce((acc, item) => {
    if (!item.sentiment) return acc;
    acc[item.sentiment]++;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 });
  
  let primary = 'neutral';
  if (breakdown.positive > breakdown.negative && breakdown.positive > breakdown.neutral) {
    primary = 'positive';
  } else if (breakdown.negative > breakdown.positive && breakdown.negative > breakdown.neutral) {
    primary = 'negative';
  }
  
  return { primary, breakdown };
};
