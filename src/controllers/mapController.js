import dotenv from 'dotenv';
import { 
  searchHealthcareProviders, 
  formatProviderFromGoogleMaps, 
  generateStaticMapUrl,
  getPlaceDetails,
  geocodePincode
} from '../utils/googleMapsUtils.js';
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
        mapProvider: 'google',
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
      
      const { query, lat, lng, pincode, type, specialty, priceRange, radius = 5000, insurance, country = 'IN' } = req.query;
      
      // Check if we have enough parameters to perform search
      if (!query && !lat && !lng && !pincode) {
        return res.status(400).json({ 
          error: 'Search query, location (lat/lng), or pincode is required',
          providers: [],
          mapUrl: null
        });
      }
      
      // Default coordinates (will be overridden if lat/lng or pincode is provided)
      let latitude = 37.7749;
      let longitude = -122.4194;
      let isUserLocation = false;
      let formattedAddress = null;
      
      // Handle pincode search if provided
      if (pincode) {
        try {
          console.log(`Geocoding pincode: ${pincode}`);
          const geocodeResult = await geocodePincode(pincode, country);
          latitude = geocodeResult.lat;
          longitude = geocodeResult.lng;
          formattedAddress = geocodeResult.formattedAddress;
          isUserLocation = true;
          
          console.log(`Pincode ${pincode} geocoded to:`, {
            lat: latitude,
            lng: longitude,
            address: formattedAddress
          });
        } catch (geocodeError) {
          console.error('Error geocoding pincode:', geocodeError);
          return res.status(400).json({
            error: `Invalid pincode: ${geocodeError.message}`,
            providers: [],
            mapUrl: null
          });
        }
      } else if (lat && lng) {
        // Parse coordinates if lat/lng are provided directly
        latitude = parseFloat(lat);
        longitude = parseFloat(lng);
        isUserLocation = true;
      }
      
      console.log('Searching providers with params:', { 
        query, 
        location: { lat: latitude, lng: longitude }, 
        radius: parseInt(radius),
        type,
        specialty,
        isUserLocation
      });
      
      let providers = [];
      
      if (query && !lat && !lng && !pincode) {
        // Text-based search using Google Maps
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
          console.error('Google Maps search API error:', apiError);
          return res.status(500).json({ 
            error: 'Failed to search providers', 
            details: apiError.message,
            providers: [],
            mapUrl: null
          });
        }
      } else {
        // Location-based search (using coordinates from pincode or direct lat/lng)
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
            // If no results in database, use Google Maps
            // For pincode or location-based searches, we focus on medical facilities
            const searchKeyword = type || specialty || 'medical healthcare';
            providers = await searchHealthcareProviders(searchKeyword, {
              lat: latitude,
              lng: longitude,
              radius: parseInt(radius),
              type: type || 'hospital', // Default to hospital if no type specified
              specialty
            });
            console.log(`Found ${providers.length} providers via Google Maps location search`);
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
        center: { lat: latitude, lng: longitude },
        formattedAddress // Include the formatted address if we have it from pincode
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

  // Get provider details
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
        // If not found in database, fetch from Google Maps
        try {
          const placeDetails = await getPlaceDetails(placeId);
          if (placeDetails) {
            // Save to database for future requests
            await providerService.saveProviderDetails(placeDetails);
            res.json({ provider: placeDetails });
          } else {
            res.status(404).json({ error: 'Provider not found' });
          }
        } catch (error) {
          console.error('Error fetching place details:', error);
          res.status(500).json({ error: 'Failed to get provider details' });
        }
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
        mapProvider: 'google',
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Error in test API endpoint:', error);
      res.status(500).json({ error: 'Failed to test API' });
    }
  }
}

export default new MapController();
