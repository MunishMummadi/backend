import dotenv from 'dotenv';
import { 
  searchHealthcareProviders, 
  formatProviderFromMapbox, 
  generateStaticMapUrl 
} from '../utils/mapboxUtils.js';
import { validateApiKeys, logRequestInfo } from '../utils/diagnostics.js';
import providerService from '../services/providerService.js';

// Load environment variables
dotenv.config();

// Check if API keys are available
const apiKeyValidation = validateApiKeys();
console.log('API Key Validation:', apiKeyValidation);

class MapController {
  // Get map configuration for frontend
  async getMapConfig(req, res) {
    try {
      console.log('Map config endpoint called');
      res.json({
        initialCenter: {
          lat: 37.7749,
          lng: -122.4194
        },
        apiStatus: 'ok',
        mapProvider: 'mapbox',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting map config:', error);
      res.status(500).json({ error: 'Failed to get map configuration' });
    }
  }

  // Unified search endpoint for providers
  async searchProviders(req, res) {
    try {
      // Log request info for debugging
      console.log('Provider search request:', logRequestInfo(req));
      
      const { query, lat, lng, type, specialty, priceRange, radius = 5000, insurance } = req.query;
      
      // Check if we have enough parameters to perform search
      if (!query && !lat && !lng) {
        return res.status(400).json({ 
          error: 'Search query or location (lat/lng) is required',
          providers: [],
          mapUrl: null
        });
      }
      
      // Parse coordinates if provided
      let latitude = lat ? parseFloat(lat) : 37.7749;
      let longitude = lng ? parseFloat(lng) : -122.4194;
      let isUserLocation = Boolean(lat && lng);
      
      console.log('Searching providers with params:', { 
        query, 
        location: { lat: latitude, lng: longitude }, 
        radius: parseInt(radius),
        type,
        specialty,
        isUserLocation
      });
      
      let providers = [];
      
      if (query && !lat && !lng) {
        // Text-based search using Mapbox
        try {
          providers = await searchHealthcareProviders(query, {
            type,
            specialty
          });
          
          console.log(`Found ${providers.length} providers via text search`);
          
          // Extract location from first result for map centering
          if (providers.length > 0) {
            latitude = providers[0].lat;
            longitude = providers[0].lng;
          }
        } catch (apiError) {
          console.error('Mapbox search API error:', apiError);
          return res.status(500).json({ 
            error: 'Failed to search providers', 
            details: apiError.message,
            providers: [],
            mapUrl: null
          });
        }
      } else {
        // Location-based search
        try {
          // First try our database
          const dbProviders = await providerService.findNearbyProviders({
            lat: latitude,
            lng: longitude,
            type,
            specialty,
            priceRange,
            radius: parseInt(radius),
            insurance
          });
          
          if (dbProviders && dbProviders.length > 0) {
            providers = dbProviders;
            console.log(`Found ${providers.length} providers in database`);
          } else {
            // If no results in database, use Mapbox
            providers = await searchHealthcareProviders('healthcare', {
              lat: latitude,
              lng: longitude,
              type,
              specialty
            });
            console.log(`Found ${providers.length} providers via Mapbox location search`);
          }
        } catch (serviceError) {
          console.error('Provider service error:', serviceError);
          return res.status(500).json({ 
            error: 'Failed to find nearby providers', 
            details: serviceError.message,
            providers: [],
            mapUrl: null
          });
        }
      }
      
      // Generate static map URL with provider markers
      const mapUrl = generateStaticMapUrl(
        { 
          lat: latitude, 
          lng: longitude,
          isUserLocation
        },
        providers,
        14,
        600,
        400
      );
      
      // Return formatted response with providers and map URL
      res.json({
        providers,
        mapUrl,
        center: { lat: latitude, lng: longitude }
      });
      
    } catch (error) {
      console.error('Error searching providers:', error);
      res.status(500).json({ 
        error: 'Failed to search providers',
        providers: [],
        mapUrl: null
      });
    }
  }

  // Get provider details - no change needed as we'll use our DB for this
  async getProviderDetails(req, res) {
    try {
      const { placeId } = req.params;
      
      if (!placeId) {
        return res.status(400).json({ error: 'Provider ID is required' });
      }
      
      // First check our database
      const provider = await providerService.getProviderByPlaceId(placeId);
      
      if (provider) {
        res.json({ provider });
      } else {
        // If not found in database, handle appropriately
        res.status(404).json({ error: 'Provider not found' });
      }
    } catch (error) {
      console.error('Error getting provider details:', error);
      res.status(500).json({ error: 'Failed to get provider details' });
    }
  }
  
  // Test endpoint to check API connectivity
  async testApi(req, res) {
    try {
      res.json({ 
        message: 'API is up and running', 
        mapProvider: 'mapbox',
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Error in test API endpoint:', error);
      res.status(500).json({ error: 'Failed to test API' });
    }
  }
}

export default new MapController();
