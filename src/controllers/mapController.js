import dotenv from 'dotenv';
import { 
  searchHealthcareProviders, 
  formatProviderFromGoogleMaps, 
  generateStaticMapUrl,
  getPlaceDetails,
  geocodePincode,
  getRouteDirections
} from '../utils/googleMapsUtils.js';
import { validateApiKeys, logRequestInfo } from '../utils/diagnostics.js';
import { 
  isValidCoordinates, 
  getSafeCoordinates, 
  filterValidCoordinates, 
  createGoogleMapsBounds, 
  toGoogleMapsLatLng 
} from '../utils/coordinateUtils.js';
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
      // Return Google Maps configuration
      const defaultCenter = {
        lat: 37.7749,
        lng: -122.4194
      };
      res.json({
        initialCenter: defaultCenter,
        apiStatus: 'ok',
        mapProvider: 'google', // explicitly specify google
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY, // include API key for frontend
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
      
      const { 
        query, 
        lat, 
        lng, 
        pincode, 
        type, 
        specialty, 
        priceRange, 
        radius = 5000, 
        insurance, 
        minRating = 0,
        country = 'IN' 
      } = req.query;
      
      // Process insurance parameters (can be a single string or an array)
      let insuranceParams = [];
      if (insurance) {
        if (Array.isArray(insurance)) {
          insuranceParams = insurance;
        } else {
          // Handle comma-separated values or single value
          insuranceParams = insurance.includes(',') 
            ? insurance.split(',').map(item => item.trim()) 
            : [insurance.trim()];
        }
      }
      
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
          
          // Validate geocode results
          if (isValidCoordinates(geocodeResult)) {
            latitude = geocodeResult.lat;
            longitude = geocodeResult.lng;
            formattedAddress = geocodeResult.formattedAddress;
            isUserLocation = true;
            
            console.log(`Pincode ${pincode} geocoded to:`, {
              lat: latitude,
              lng: longitude,
              address: formattedAddress
            });
          } else {
            throw new Error('Invalid coordinates returned from geocoding');
          }
        } catch (geocodeError) {
          console.error('Error geocoding pincode:', geocodeError);
          return res.status(400).json({
            error: `Invalid pincode: ${geocodeError.message}`,
            providers: [],
            mapUrl: null
          });
        }
      } else if (lat && lng) {
        // Parse and validate coordinates
        if (isValidCoordinates({ lat, lng })) {
          latitude = parseFloat(lat);
          longitude = parseFloat(lng);
          isUserLocation = true;
        } else {
          return res.status(400).json({
            error: 'Invalid coordinates provided',
            providers: [],
            mapUrl: null
          });
        }
      }
      
      console.log('Searching providers with params:', { 
        query, 
        location: { lat: latitude, lng: longitude }, 
        radius: parseInt(radius),
        type,
        specialty,
        insurance: insuranceParams,
        minRating: parseFloat(minRating),
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
            insurance: insuranceParams,
            minRating: parseFloat(minRating)
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
      
      // Ensure all providers have valid coordinates
      providers = filterValidCoordinates(providers);
      
      // Convert location to proper Google Maps format
      const centerLocation = toGoogleMapsLatLng({ lat: latitude, lng: longitude });
      
      // Generate static map URL with provider markers
      const mapUrl = generateStaticMapUrl(
        centerLocation,
        providers,
        14,
        600,
        400
      );
      
      // Create Google Maps bounds for frontend
      const viewportBounds = createGoogleMapsBounds([centerLocation, ...providers]);
      
      // Return formatted response with providers and map URL
      res.json({
        providers,
        mapUrl,
        center: centerLocation,
        formattedAddress,
        bounds: viewportBounds,
        mapProvider: 'google' // explicitly specify google
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
  
  /**
   * Calculate route between two points using the modern Google Routes API
   * Replaces the legacy Directions API with more features and better performance
   */
  async getRoute(req, res) {
    try {
      const { 
        originLat, originLng, originPlaceId,
        destLat, destLng, destPlaceId,
        travelMode = 'DRIVE', 
        alternatives = false,
        avoidTolls = false, 
        avoidHighways = false,
        language = 'en-US'
      } = req.query;
      
      // Validate that we have at least one type of origin and destination
      if ((!originLat || !originLng) && !originPlaceId) {
        return res.status(400).json({ error: 'Origin location is required (coordinates or placeId)' });
      }
      
      if ((!destLat || !destLng) && !destPlaceId) {
        return res.status(400).json({ error: 'Destination location is required (coordinates or placeId)' });
      }
      
      // Prepare origin and destination parameters
      let origin, destination;
      
      // Format origin based on what was provided
      if (originPlaceId) {
        origin = originPlaceId;
      } else {
        origin = {
          lat: parseFloat(originLat),
          lng: parseFloat(originLng)
        };
      }
      
      // Format destination based on what was provided
      if (destPlaceId) {
        destination = destPlaceId;
      } else {
        destination = {
          lat: parseFloat(destLat),
          lng: parseFloat(destLng)
        };
      }
      
      // Prepare options
      const options = {
        travelMode,
        alternatives: alternatives === 'true' || alternatives === true,
        avoidTolls: avoidTolls === 'true' || avoidTolls === true,
        avoidHighways: avoidHighways === 'true' || avoidHighways === true,
        language
      };
      
      // Get waypoints if provided
      if (req.query.waypoints) {
        try {
          // Waypoints can be provided as a JSON string of coordinates or placeIds
          options.waypoints = JSON.parse(req.query.waypoints);
        } catch (e) {
          console.warn('Invalid waypoints format, ignoring waypoints:', e.message);
        }
      }
      
      // Log the route request
      console.log('Route request:', {
        origin: originPlaceId || { lat: originLat, lng: originLng },
        destination: destPlaceId || { lat: destLat, lng: destLng },
        options
      });
      
      // Get route from Google Routes API
      const routeData = await getRouteDirections(origin, destination, options);
      
      // Return route data to the client
      res.json({
        route: routeData,
        origin: originPlaceId || { lat: originLat, lng: originLng },
        destination: destPlaceId || { lat: destLat, lng: destLng },
        options
      });
    } catch (error) {
      console.error('Error calculating route:', error);
      res.status(500).json({ 
        error: 'Failed to calculate route',
        message: error.message 
      });
    }
  }
}

export default new MapController();
