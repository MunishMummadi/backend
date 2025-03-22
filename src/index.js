import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client } from '@googlemaps/google-maps-services-js';
import twilio from 'twilio';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = 'https://krowugwaxsfnljsuftzz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const googleMapsClient = new Client({});

// Initialize Twilio client only if valid credentials exist
const twilioClient = process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',  // Adjust this URL based on DeepSeek's API endpoint
});

// Fetch medical facilities near a location
app.get('/api/facilities', async (req, res) => {
  try {
    const { lat, lng, type, speciality, priceRange, userId } = req.query;
    
    const response = await googleMapsClient.placesNearby({
      params: {
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radius: 5000, // 5km radius
        type: 'hospital',
        keyword: type || '',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    let facilities = response.data.results;

    // Filter by speciality if provided
    if (speciality) {
      facilities = facilities.filter(f => 
        f.types.includes(speciality.toLowerCase()));
    }

    // Filter by price range if provided
    if (priceRange) {
      facilities = facilities.filter(f => 
        f.price_level && f.price_level <= parseInt(priceRange));
    }

    // Save search to history if userId is provided
    if (userId) {
      const searchData = {
        user_id: userId,
        search_params: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          type,
          speciality,
          priceRange
        },
        result_count: facilities.length,
        timestamp: new Date().toISOString()
      };
      
      // Store search in Supabase
      const { error } = await supabase
        .from('search_history')
        .insert(searchData);
        
      if (error) {
        console.error('Error saving search history:', error);
      }
    }

    res.json(facilities);
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ error: 'Failed to fetch medical facilities' });
  }
});

// Get search history for a user
app.get('/api/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});

// Get detailed results for a specific historical search
app.get('/api/history/:searchId/results', async (req, res) => {
  try {
    const { searchId } = req.params;
    
    // Get the search parameters from history
    const { data: searchData, error: searchError } = await supabase
      .from('search_history')
      .select('*')
      .eq('id', searchId)
      .single();
      
    if (searchError || !searchData) {
      return res.status(404).json({ error: 'Search not found' });
    }
    
    // Re-run the search using the stored parameters
    const params = searchData.search_params;
    const response = await googleMapsClient.placesNearby({
      params: {
        location: { lat: params.lat, lng: params.lng },
        radius: 5000,
        type: 'hospital',
        keyword: params.type || '',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    let facilities = response.data.results;
    
    // Apply the same filters as the original search
    if (params.speciality) {
      facilities = facilities.filter(f => 
        f.types.includes(params.speciality.toLowerCase()));
    }
    
    if (params.priceRange) {
      facilities = facilities.filter(f => 
        f.price_level && f.price_level <= parseInt(params.priceRange));
    }
    
    res.json({
      searchParams: params,
      results: facilities,
      timestamp: searchData.timestamp
    });
    
  } catch (error) {
    console.error('Error retrieving historical search results:', error);
    res.status(500).json({ error: 'Failed to retrieve historical search results' });
  }
});

// Get AI-generated feedback about a facility
app.get('/api/facility/feedback/:facilityName', async (req, res) => {
  try {
    const { facilityName } = req.params;
    
    const systemPrompt = `You are an AI assistant that provides balanced and factual feedback about medical facilities based on typical patient experiences. For ${facilityName}, generate a summary that includes:
1. Overall reputation
2. Quality of care
3. Staff professionalism
4. Wait times
5. Facility conditions

Keep the response concise and objective. If you don't have specific information about the facility, provide general insights about similar facilities in the area.`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",  // Adjust model name based on DeepSeek's available models
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please provide feedback about ${facilityName}.` }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const feedback = {
      summary: completion.choices[0].message.content,
      generatedAt: new Date().toISOString()
    };

    res.json(feedback);
  } catch (error) {
    console.error('Error generating facility feedback:', error);
    res.status(500).json({ error: 'Failed to generate facility feedback' });
  }
});

// Send facility information via SMS
app.post('/api/send-sms', async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(503).json({ 
        error: 'SMS service is not configured. Please check Twilio credentials.' 
      });
    }

    const { phoneNumber, facilityInfo } = req.body;

    const message = `
Nearby Medical Facility:
${facilityInfo.name}
Address: ${facilityInfo.address}
Phone: ${facilityInfo.phone || 'N/A'}
Rating: ${facilityInfo.rating || 'N/A'}/5
    `.trim();

    await twilioClient.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    res.json({ success: true, message: 'SMS sent successfully' });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Clear search history for a user
app.delete('/api/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);
      
    if (error) {
      throw error;
    }
    
    res.json({ success: true, message: 'Search history cleared successfully' });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({ error: 'Failed to clear search history' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});