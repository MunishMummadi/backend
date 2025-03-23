import OpenAI from 'openai';
import { Review, Provider } from '../models/index.js';
import { Client } from '@googlemaps/google-maps-services-js';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if we have the DeepSeek API key
const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.warn('Warning: DEEPSEEK_API_KEY is not set. AI review generation will not work.');
}

// Initialize OpenAI client (for DeepSeek) only if we have the API key
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.deepseek.com',
}) : null;

// Initialize Google Maps client
const googleMapsClient = new Client({});

class ReviewService {
  // Get Google reviews for a provider
  async getGoogleReviews(providerId) {
    try {
      // First check if we have cached reviews in the database
      const cachedReviews = await Review.findAll({ 
        where: {
          placeId: providerId,
          source: 'google',
          createdAt: { 
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Within last 7 days
          }
        },
        order: [['createdAt', 'DESC']]
      });
      
      if (cachedReviews.length > 0) {
        return cachedReviews;
      }
      
      // If not cached or stale, fetch from Google Places API
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: providerId,
          fields: ['reviews'],
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });
      
      if (!response.data.result.reviews) {
        return [];
      }
      
      // Find or create provider entry
      const provider = await Provider.findOne({
        where: { placeId: providerId }
      });

      if (!provider) {
        return [];
      }
      
      const googleReviews = response.data.result.reviews.map(review => ({
        providerId: provider.id,
        placeId: providerId,
        source: 'google',
        content: review.text,
        author: review.author_name,
        rating: review.rating,
        sentiment: this.determineSentiment(review.rating)
      }));
      
      // Save to database for future use
      if (googleReviews.length > 0) {
        await Review.bulkCreate(googleReviews);
      }
      
      return googleReviews;
    } catch (error) {
      console.error('Error fetching Google reviews:', error);
      throw error;
    }
  }
  
  // Get Reddit discussions about a provider using DeepSeek
  async getRedditReviews(providerId, providerName) {
    try {
      // Check for cached Reddit reviews
      const cachedReviews = await Review.findAll({ 
        where: {
          placeId: providerId,
          source: 'reddit',
          createdAt: { 
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Within last 30 days
          }
        },
        order: [['createdAt', 'DESC']]
      });
      
      if (cachedReviews.length > 0) {
        return cachedReviews;
      }
      
      // Find provider in database
      const provider = await Provider.findOne({
        where: { 
          [Op.or]: [
            { id: isNaN(providerId) ? null : providerId },
            { placeId: providerId }
          ]
        }
      });

      if (!provider) {
        return [];
      }
      
      // Use DeepSeek to generate synthetic Reddit reviews
      const prompt = `Generate 3 realistic Reddit discussions about the healthcare provider "${providerName}". 
      Each discussion should include:
      1. A post title asking about experiences with ${providerName}
      2. A main post with a personal question
      3. 2-3 comments with varied experiences (positive, neutral, and negative)
      4. Realistic usernames, writing styles, and details
      
      Format each discussion as JSON with the following structure:
      {
        "title": "Post title",
        "mainPost": "Post content",
        "comments": [
          {
            "username": "username1",
            "content": "Comment content",
            "sentiment": "positive|neutral|negative"
          }
        ]
      }`;
      
      if (!openai) {
        console.error('Error generating Reddit reviews: DeepSeek client not initialized due to missing API key.');
        return [];
      }
      
      const completion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates realistic Reddit discussions about healthcare providers." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      // Parse the response and format as reviews
      let redditContent;
      try {
        redditContent = JSON.parse(completion.choices[0].message.content);
      } catch (e) {
        // If not valid JSON, just use the raw text
        redditContent = [{ 
          title: "Discussion about " + providerName,
          mainPost: completion.choices[0].message.content,
          comments: []
        }];
      }
      
      // Format as reviews
      const redditReviews = [];
      
      // For each discussion, add the main post and comments as separate reviews
      for (const discussion of Array.isArray(redditContent) ? redditContent : [redditContent]) {
        // Add main post as a review
        redditReviews.push({
          providerId: provider.id,
          placeId: providerId,
          source: 'reddit',
          content: `${discussion.title}\n\n${discussion.mainPost}`,
          author: 'RedditUser',
          sentiment: 'neutral'
        });
        
        // Add each comment as a review
        if (discussion.comments && Array.isArray(discussion.comments)) {
          for (const comment of discussion.comments) {
            redditReviews.push({
              providerId: provider.id,
              placeId: providerId,
              source: 'reddit',
              content: comment.content,
              author: comment.username || 'RedditCommenter',
              sentiment: comment.sentiment || 'neutral'
            });
          }
        }
      }
      
      // Save to database for future use
      if (redditReviews.length > 0) {
        await Review.bulkCreate(redditReviews);
      }
      
      return redditReviews;
    } catch (error) {
      console.error('Error generating Reddit reviews:', error);
      throw error;
    }
  }
  
  // Analyze reviews for a provider
  async analyzeReviews(providerId, providerName) {
    try {
      // Get both Google and Reddit reviews
      let googleReviews = await this.getGoogleReviews(providerId);
      let redditReviews = await this.getRedditReviews(providerId, providerName);
      
      const allReviews = [...googleReviews, ...redditReviews];
      
      if (allReviews.length === 0) {
        return {
          summary: "No reviews available for analysis.",
          sentimentBreakdown: {
            positive: 0,
            neutral: 0,
            negative: 0
          },
          reviewCount: 0
        };
      }
      
      // Count sentiment breakdown
      const sentimentBreakdown = allReviews.reduce((acc, review) => {
        if (!review.sentiment) return acc;
        acc[review.sentiment]++;
        return acc;
      }, { positive: 0, neutral: 0, negative: 0 });
      
      // Concatenate review content for analysis
      const reviewContent = allReviews.map(review => review.content).join('\n\n');
      
      // Generate analysis using DeepSeek
      const prompt = `Analyze the following reviews for the healthcare provider "${providerName}":

${reviewContent.substring(0, 2000)}... (content truncated)

Provide a concise summary that includes:
1. Overall sentiment and satisfaction level
2. Common positive points mentioned
3. Common negative points or concerns
4. Key insights about the provider
5. Recommendations for potential patients

Keep your analysis factual, balanced, and helpful for someone deciding whether to use this provider.`;
      
      if (!openai) {
        console.error('Error analyzing reviews: OpenAI client not initialized due to missing API key.');
        return {
          summary: "Analysis not available due to missing API key.",
          sentimentBreakdown,
          reviewCount: allReviews.length,
          generatedAt: new Date().toISOString()
        };
      }
      
      const completion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are an AI assistant that analyzes healthcare provider reviews to extract meaningful insights." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 800
      });
      
      return {
        summary: completion.choices[0].message.content,
        sentimentBreakdown,
        reviewCount: allReviews.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing reviews:', error);
      throw error;
    }
  }
  
  // Determine sentiment based on rating
  determineSentiment(rating) {
    if (!rating) return 'neutral';
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    return 'neutral';
  }
}

export default new ReviewService();
