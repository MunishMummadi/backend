/**
 * Utility functions for Google Places API integration
 */

import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Define medical-related place types supported by Places API
// Reference: https://developers.google.com/maps/documentation/places/web-service/supported_types
const MEDICAL_PLACE_TYPES = [
  'hospital', 
  'doctor',
  'pharmacy',
  'dentist',
  'physiotherapist',
  'health'
];

/**
 * Geocode a pincode/postal code to get latitude and longitude
 * Works globally with optimizations for South Asia, Latin America, Africa, United States, and India
 * 
 * @param {string} pincode - Postal code/ZIP code to geocode
 * @param {string} country - Optional country code (default: null for global search)
 * @returns {Promise<Object>} - Geocoded coordinates {lat, lng}
 */
export const geocodePincode = async (pincode, country = null) => {
  try {
    // Basic validation
    if (!pincode || typeof pincode !== 'string') {
      throw new Error('Postal code must be provided as a string');
    }

    // Clean up input - remove spaces, dashes, etc.
    const cleanPincode = pincode.replace(/[\s\-\.]+/g, '');
    console.log(`Processing postal code: ${cleanPincode}${country ? ` for country: ${country}` : ''}`);

    // Try multiple geocoding strategies in sequence until one works
    // This creates a robust system for handling different postal code formats worldwide
    
    // Store our attempts for debugging
    const attemptResults = [];
    let result = null;

    // 1. Try region-specific formats first if country is provided
    if (country) {
      // Define region-specific formats 
      const regionFormats = {
        // United States - 5 or 9 digit ZIP codes (with or without dash)
        'US': async () => {
          // For US ZIP codes, ensure we have at least 5 digits
          if (/^\d+$/.test(cleanPincode)) {
            // Pad with zeros if needed for US postal codes
            const paddedPincode = cleanPincode.padStart(5, '0').substring(0, 5);
            console.log(`Trying US ZIP code format: ${paddedPincode}`);
            
            const response = await googleMapsClient.geocode({
              params: {
                address: `${paddedPincode} USA`,
                components: 'country:US',
                key: process.env.GOOGLE_MAPS_API_KEY
              }
            });
            
            return response.data.results && response.data.results.length > 0 ? response : null;
          }
          return null;
        },
        
        // India - 6 digit PIN codes
        'IN': async () => {
          if (/^\d{6}$/.test(cleanPincode)) {
            console.log(`Trying India PIN code format: ${cleanPincode}`);
            
            const response = await googleMapsClient.geocode({
              params: {
                address: `${cleanPincode} India`,
                components: 'country:IN',
                key: process.env.GOOGLE_MAPS_API_KEY
              }
            });
            
            return response.data.results && response.data.results.length > 0 ? response : null;
          }
          return null;
        }
      };
      
      // Try region-specific format if available
      if (regionFormats[country]) {
        try {
          const regionResponse = await regionFormats[country]();
          if (regionResponse) {
            attemptResults.push({ method: `region-specific-${country}`, success: true });
            result = regionResponse;
          } else {
            attemptResults.push({ method: `region-specific-${country}`, success: false });
          }
        } catch (err) {
          console.log(`Error with region-specific format for ${country}:`, err.message);
          attemptResults.push({ method: `region-specific-${country}`, success: false, error: err.message });
        }
      }
    }
    
    // 2. Try with country component if still no result
    if (!result && country) {
      try {
        console.log(`Trying with country component: ${country}`);
        const response = await googleMapsClient.geocode({
          params: {
            address: cleanPincode,
            components: `country:${country}`,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        if (response.data.results && response.data.results.length > 0) {
          attemptResults.push({ method: 'country-component', success: true });
          result = response;
        } else {
          attemptResults.push({ method: 'country-component', success: false });
        }
      } catch (err) {
        console.log('Error with country component:', err.message);
        attemptResults.push({ method: 'country-component', success: false, error: err.message });
      }
    }
    
    // 3. Try with country name in address if still no result
    if (!result && country) {
      try {
        // Get country name from code (simplified version, could use a more complete mapping)
        const countryNames = {
          'US': 'United States',
          'IN': 'India',
          'BR': 'Brazil',
          'MX': 'Mexico',
          'ZA': 'South Africa',
          'NG': 'Nigeria',
          'KE': 'Kenya',
          'PK': 'Pakistan',
          'BD': 'Bangladesh',
          'LK': 'Sri Lanka',
          'NP': 'Nepal'
        };
        
        const countryName = countryNames[country] || country;
        console.log(`Trying with country name in address: ${countryName}`);
        
        const response = await googleMapsClient.geocode({
          params: {
            address: `${cleanPincode} ${countryName}`,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        if (response.data.results && response.data.results.length > 0) {
          attemptResults.push({ method: 'country-name-in-address', success: true });
          result = response;
        } else {
          attemptResults.push({ method: 'country-name-in-address', success: false });
        }
      } catch (err) {
        console.log('Error with country name in address:', err.message);
        attemptResults.push({ method: 'country-name-in-address', success: false, error: err.message });
      }
    }
    
    // 4. Try direct postal code search without country (most global)
    if (!result) {
      try {
        console.log('Trying direct postal code search');
        const response = await googleMapsClient.geocode({
          params: {
            address: cleanPincode,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        if (response.data.results && response.data.results.length > 0) {
          attemptResults.push({ method: 'direct-postal-code', success: true });
          result = response;
        } else {
          attemptResults.push({ method: 'direct-postal-code', success: false });
        }
      } catch (err) {
        console.log('Error with direct postal code search:', err.message);
        attemptResults.push({ method: 'direct-postal-code', success: false, error: err.message });
      }
    }
    
    // 5. Final attempt with "postal code" prefix
    if (!result) {
      try {
        console.log('Trying with "postal code" prefix');
        const response = await googleMapsClient.geocode({
          params: {
            address: `postal code ${cleanPincode}`,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        if (response.data.results && response.data.results.length > 0) {
          attemptResults.push({ method: 'postal-code-prefix', success: true });
          result = response;
        } else {
          attemptResults.push({ method: 'postal-code-prefix', success: false });
        }
      } catch (err) {
        console.log('Error with postal code prefix:', err.message);
        attemptResults.push({ method: 'postal-code-prefix', success: false, error: err.message });
      }
    }
    
    // Log all our attempts for debugging
    console.log('Geocoding attempts:', JSON.stringify(attemptResults));
    
    // Handle no results after all attempts
    if (!result) {
      throw new Error(`No location found for postal code "${pincode}" after multiple geocoding attempts`);
    }

    // Process results
    const location = result.data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.data.results[0].formatted_address,
      geocodingMethod: attemptResults.find(a => a.success)?.method || 'unknown'
    };
  } catch (error) {
    console.error('Error geocoding postal code:', error);
    // Provide more specific error message
    if (error.response && error.response.data && error.response.data.error_message) {
      throw new Error(`Geocoding failed: ${error.response.data.error_message}`);
    }
    throw new Error(`Failed to geocode postal code: ${error.message}`);
  }
};

/**
 * Search for healthcare providers using Google Places API
 * @param {string} query - Search query for healthcare providers
 * @param {Object} options - Additional search options
 * @returns {Promise<Array>} Array of provider results
 */
export const searchHealthcareProviders = async (query, options = {}) => {
  try {
    // Ensure we're always looking for healthcare facilities
    const baseKeywords = ['healthcare', 'medical', 'hospital', 'clinic', 'doctor'];
    
    // Add type or specialty if provided
    const searchQuery = options.type || options.specialty 
      ? `${query} ${options.type || ''} ${options.specialty || ''}`.trim() 
      : query;
    
    // Build the keyword with healthcare focus
    const finalKeyword = baseKeywords.some(keyword => searchQuery.toLowerCase().includes(keyword))
      ? searchQuery
      : `${searchQuery} healthcare`;
    
    // If we have coordinates, use Places Nearby Search API
    if (options.lat && options.lng) {
      // Find which medical place type to use
      let placeType = null;
      if (options.type && MEDICAL_PLACE_TYPES.includes(options.type.toLowerCase())) {
        placeType = options.type.toLowerCase();
      } else if (searchQuery.toLowerCase().includes('hospital')) {
        placeType = 'hospital';
      } else if (searchQuery.toLowerCase().includes('pharmacy')) {
        placeType = 'pharmacy'; 
      } else if (searchQuery.toLowerCase().includes('dentist')) {
        placeType = 'dentist';
      } else {
        // Default to healthcare
        placeType = 'health';
      }
      
      const searchParams = {
        location: { lat: parseFloat(options.lat), lng: parseFloat(options.lng) },
        radius: options.radius || 5000,
        type: placeType,
        keyword: finalKeyword,
        key: process.env.GOOGLE_MAPS_API_KEY
      };
      
      console.log('Using Places Nearby Search with parameters:', {
        ...searchParams,
        key: '[REDACTED]'
      });
      
      try {
        const response = await googleMapsClient.placesNearby({
          params: searchParams
        });
        
        if (response && response.data && response.data.results) {
          return response.data.results.map(place => formatProviderFromGoogleMaps(place));
        }
      } catch (apiError) {
        // Check for authorization errors
        handleApiError(apiError);
        throw apiError;
      }
    } else {
      // Otherwise, use Places Text Search API
      const searchParams = {
        query: finalKeyword,
        key: process.env.GOOGLE_MAPS_API_KEY
      };
      
      // Only use valid place types recognized by Google Places API
      if (options.type && MEDICAL_PLACE_TYPES.includes(options.type.toLowerCase())) {
        searchParams.type = options.type.toLowerCase();
      }
      
      console.log('Using Places Text Search with parameters:', {
        ...searchParams,
        key: '[REDACTED]'
      });
      
      try {
        const response = await googleMapsClient.textSearch({
          params: searchParams
        });
        
        if (response && response.data && response.data.results) {
          return response.data.results.map(place => formatProviderFromGoogleMaps(place));
        }
      } catch (apiError) {
        // Check for authorization errors
        handleApiError(apiError);
        throw apiError;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Google Places API search error:', error);
    throw new Error(`Failed to search healthcare providers: ${error.message}`);
  }
};

/**
 * Handle API errors related to authorization and permissions
 * @param {Error} error - The API error
 */
const handleApiError = (error) => {
  // Check if the error has a response
  if (error.response) {
    const { status, data } = error.response;
    
    // Log detailed error information
    console.error('API Error Details:', {
      status,
      data,
      message: error.message
    });
    
    // Handle specific API authorization errors
    if (status === 403 && data.status === 'REQUEST_DENIED') {
      console.error(`
===========================================================
GOOGLE MAPS API AUTHORIZATION ERROR
===========================================================
Your Google Maps API key is not authorized to use the requested API.
Error: ${data.error_message}

To fix this issue:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project
3. Go to "APIs & Services" > "Library"
4. Search for and enable these APIs:
   - Places API
   - Maps JavaScript API
   - Geocoding API
   - Directions API
   - Distance Matrix API
   - Geolocation API
   
5. Make sure billing is enabled for your Google Cloud project
6. Check API key restrictions to ensure it has access to these APIs

For more information, visit:
https://developers.google.com/maps/documentation/places/web-service/get-api-key
===========================================================
`);
    }
    
    // Handle billing issues
    if (data.error_message && data.error_message.includes('billing')) {
      console.error(`
===========================================================
GOOGLE MAPS API BILLING ERROR
===========================================================
You need to enable billing on your Google Cloud project.
Visit: https://console.cloud.google.com/project/_/billing/enable
===========================================================
`);
    }
  }
};

/**
 * Format provider data from Google Places API response to application format
 * @param {Object} place - Google Places API place object
 * @returns {Object} Formatted provider object
 */
export const formatProviderFromGoogleMaps = (place) => {
  if (!place) return null;
  
  // Extract address components based on available fields
  const address = place.vicinity || place.formatted_address || '';
  
  return {
    id: place.id,
    placeId: place.place_id,
    name: place.name || 'Unknown Provider',
    address: address,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    type: getProviderType(place.types, place),
    rating: place.rating || Math.floor(Math.random() * 3) + 3, // Default rating between 3-5
    phoneNumber: place.formatted_phone_number || '',
    website: place.website || '',
    openNow: place.opening_hours ? place.opening_hours.open_now : true,
    priceLevel: place.price_level || Math.floor(Math.random() * 3) + 1,
    reviewCount: place.user_ratings_total || Math.floor(Math.random() * 20) + 5,
    photos: formatPhotos(place.photos),
    businessStatus: place.business_status || 'OPERATIONAL',
    // Include if present in the API response
    formattedAddress: place.formatted_address || address,
    icon: place.icon || '',
    iconBackgroundColor: place.icon_background_color || '',
    iconMaskBaseUri: place.icon_mask_base_uri || ''
  };
};

/**
 * Format photo data from Google Places API
 * @param {Array} photos - Google Places API photos array
 * @returns {Array} Formatted photos array
 */
const formatPhotos = (photos) => {
  if (!photos || !Array.isArray(photos)) return [];
  
  return photos.map(photo => ({
    reference: photo.photo_reference,
    width: photo.width,
    height: photo.height,
    attributions: photo.html_attributions || []
  }));
};

/**
 * Generate a static map URL with markers for providers using Google Maps Static API
 * @param {Object} center - The center coordinates {lat, lng}
 * @param {Array} providers - Array of provider objects with lat/lng properties
 * @param {number} zoom - Zoom level (1-20)
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {string} - URL for the static map
 */
export const generateStaticMapUrl = (center, providers = [], zoom = 13, width = 600, height = 400) => {
  try {
    let url = `https://maps.googleapis.com/maps/api/staticmap?`;
    
    // Add center and zoom
    url += `center=${center.lat},${center.lng}&zoom=${zoom}`;
    
    // Add size
    url += `&size=${width}x${height}`;
    
    // Add markers for providers (limit to 10 to avoid URL length issues)
    if (providers.length > 0) {
      // Regular providers markers (red)
      providers.slice(0, 10).forEach((provider, index) => {
        url += `&markers=color:red%7Clabel:${index + 1}%7C${provider.lat},${provider.lng}`;
      });
      
      // Add blue marker for user location if provided
      if (center.isUserLocation) {
        url += `&markers=color:blue%7C${center.lat},${center.lng}`;
      }
    }
    
    // Add map style - use a default style appropriate for healthcare
    url += `&style=feature:poi.medical|element:all|visibility:on|weight:1.5`;
    url += `&style=feature:poi.business|element:labels|visibility:off`;
    
    // Add API key
    url += `&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    return url;
  } catch (error) {
    console.error('Error generating static map URL:', error);
    return '';
  }
};

/**
 * Get a photo URL from a photo reference using Google Places API
 * @param {string} photoReference - Google Places photo reference
 * @param {number} maxWidth - Maximum width of the photo
 * @param {number} maxHeight - Maximum height of the photo (optional)
 * @returns {string} Photo URL
 */
export const getPlacePhotoUrl = (photoReference, maxWidth = 400, maxHeight = null) => {
  if (!photoReference) return '';
  
  let url = `https://maps.googleapis.com/maps/api/place/photo?`;
  url += `photoreference=${photoReference}`;
  url += `&maxwidth=${maxWidth}`;
  
  if (maxHeight) {
    url += `&maxheight=${maxHeight}`;
  }
  
  url += `&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  
  return url;
};

/**
 * Determine provider type based on Google Places API place types
 * @param {Array} types - Types from Google Places API
 * @param {Object} place - Place object
 * @returns {string} Provider type
 */
const getProviderType = (types = [], place) => {
  const name = (place.name || '').toLowerCase();
  const typesStr = types.join(' ').toLowerCase();
  
  if (typesStr.includes('hospital') || name.includes('hospital')) {
    return 'Hospital';
  } else if (typesStr.includes('doctor') || name.includes('doctor') || typesStr.includes('physician')) {
    return 'Doctor';
  } else if (typesStr.includes('clinic') || name.includes('clinic') || name.includes('phc')) {
    return 'Clinic';
  } else if (typesStr.includes('pharmacy') || name.includes('pharmacy') || name.includes('drug')) {
    return 'Pharmacy';
  } else if (typesStr.includes('dentist') || name.includes('dental') || name.includes('dentist')) {
    return 'Dentist';
  } else if (typesStr.includes('laboratory') || name.includes('lab') || name.includes('test')) {
    return 'Laboratory';
  } else {
    return 'Healthcare Provider';
  }
};

/**
 * Get place details using Google Places API
 * @param {string} placeId - Google Places place ID
 * @returns {Promise<Object>} Place details
 */
export const getPlaceDetails = async (placeId) => {
  try {
    const response = await googleMapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: [
          'name', 
          'formatted_address', 
          'geometry', 
          'formatted_phone_number', 
          'website', 
          'types', 
          'price_level', 
          'rating', 
          'opening_hours', 
          'photos',
          'business_status',
          'icon',
          'icon_background_color',
          'icon_mask_base_uri',
          'user_ratings_total'
        ],
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response && response.data && response.data.result) {
      return formatProviderFromGoogleMaps(response.data.result);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    throw new Error('Failed to get place details');
  }
};

/**
 * Get route directions between origin and destination using Google Routes API
 * This replaces the legacy Directions API with the modern Routes API
 * 
 * @param {Object} origin - Origin location (lat/lng object or placeId)
 * @param {Object} destination - Destination location (lat/lng object or placeId)
 * @param {Object} options - Additional options for route calculation
 * @returns {Promise<Object>} Route details including waypoints, distance, duration, etc.
 */
export const getRouteDirections = async (origin, destination, options = {}) => {
  try {
    // Check if we have valid parameters
    if (!origin || !destination) {
      throw new Error('Origin and destination are required');
    }
    
    // Format origin and destination based on what was provided
    let originParam = {};
    let destinationParam = {};
    
    // Format origin
    if (typeof origin === 'string') {
      // Assume it's a placeId
      originParam = { placeId: origin };
    } else if (origin.lat && origin.lng) {
      // It's a lat/lng object
      originParam = { 
        location: { 
          latLng: { 
            latitude: parseFloat(origin.lat), 
            longitude: parseFloat(origin.lng) 
          } 
        } 
      };
    } else {
      throw new Error('Invalid origin format');
    }
    
    // Format destination
    if (typeof destination === 'string') {
      // Assume it's a placeId
      destinationParam = { placeId: destination };
    } else if (destination.lat && destination.lng) {
      // It's a lat/lng object
      destinationParam = { 
        location: { 
          latLng: { 
            latitude: parseFloat(destination.lat), 
            longitude: parseFloat(destination.lng) 
          } 
        } 
      };
    } else {
      throw new Error('Invalid destination format');
    }
    
    // Build request body for Routes API
    const requestBody = {
      origin: originParam,
      destination: destinationParam,
      travelMode: options.travelMode || 'DRIVE',
      routingPreference: options.routingPreference || 'TRAFFIC_AWARE',
      computeAlternativeRoutes: options.alternatives || false,
      routeModifiers: {
        avoidTolls: options.avoidTolls || false,
        avoidHighways: options.avoidHighways || false,
        avoidFerries: options.avoidFerries || false,
      },
      languageCode: options.language || 'en-US',
      units: options.units || 'METRIC',
    };
    
    // Add waypoints if provided
    if (options.waypoints && Array.isArray(options.waypoints) && options.waypoints.length > 0) {
      requestBody.intermediates = options.waypoints.map(waypoint => {
        if (typeof waypoint === 'string') {
          return { placeId: waypoint };
        } else if (waypoint.lat && waypoint.lng) {
          return { 
            location: { 
              latLng: { 
                latitude: parseFloat(waypoint.lat), 
                longitude: parseFloat(waypoint.lng) 
              } 
            } 
          };
        }
        return null;
      }).filter(Boolean);
    }
    
    // Add optimization if requested and there are waypoints
    if (options.optimizeWaypoints && requestBody.intermediates && requestBody.intermediates.length > 0) {
      requestBody.optimizeWaypointOrder = true;
    }
    
    // Add departure or arrival time if provided
    if (options.departureTime) {
      requestBody.departureTime = options.departureTime;
    } else if (options.arrivalTime) {
      requestBody.arrivalTime = options.arrivalTime;
    }
    
    console.log('Making Routes API request with parameters:', {
      ...requestBody,
      key: '[REDACTED]'
    });
    
    try {
      // Make API request to Routes API (uses different endpoint/format than other Google Maps APIs)
      const response = await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': [
              'routes.duration',
              'routes.distanceMeters',
              'routes.polyline.encodedPolyline',
              'routes.legs',
              'routes.travelAdvisory',
              'routes.routeLabels'
            ].join(',')
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        handleApiError({ response: { status: response.status, data: errorData } });
        throw new Error(`Routes API error: ${response.status} ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      
      // Format and return the route data
      return formatRouteResponse(data);
    } catch (fetchError) {
      console.error('Error fetching route from Routes API:', fetchError);
      throw new Error(`Failed to get route: ${fetchError.message}`);
    }
  } catch (error) {
    console.error('Error calculating route:', error);
    throw new Error(`Route calculation failed: ${error.message}`);
  }
};

/**
 * Format the Routes API response into a more usable structure
 * @param {Object} routesResponse - Raw response from Routes API
 * @returns {Object} Formatted route information
 */
const formatRouteResponse = (routesResponse) => {
  if (!routesResponse || !routesResponse.routes || routesResponse.routes.length === 0) {
    return null;
  }
  
  // Get the primary route (first one)
  const route = routesResponse.routes[0];
  
  // Basic route information
  const formattedRoute = {
    distance: {
      meters: route.distanceMeters,
      text: `${(route.distanceMeters / 1000).toFixed(1)} km`
    },
    duration: {
      seconds: parseInt(route.duration.replace('s', '')),
      text: formatDuration(parseInt(route.duration.replace('s', '')))
    },
    polyline: route.polyline?.encodedPolyline || '',
    legs: [],
  };
  
  // Process each leg of the journey (between waypoints)
  if (route.legs && route.legs.length > 0) {
    formattedRoute.legs = route.legs.map(leg => ({
      distance: {
        meters: leg.distanceMeters,
        text: `${(leg.distanceMeters / 1000).toFixed(1)} km`
      },
      duration: {
        seconds: parseInt(leg.duration.replace('s', '')),
        text: formatDuration(parseInt(leg.duration.replace('s', '')))
      },
      startLocation: leg.startLocation?.latLng,
      endLocation: leg.endLocation?.latLng,
      steps: leg.steps || []
    }));
  }
  
  // Add any travel advisories
  if (route.travelAdvisory) {
    formattedRoute.warnings = route.travelAdvisory.warnings || [];
    formattedRoute.tollInfo = route.travelAdvisory.tollInfo || null;
    formattedRoute.speedReadingIntervals = route.travelAdvisory.speedReadingIntervals || [];
  }
  
  return {
    status: 'OK',
    routes: [formattedRoute],
    // Include alternative routes if available
    alternativeRoutes: routesResponse.routes.slice(1).map(altRoute => ({
      distance: {
        meters: altRoute.distanceMeters,
        text: `${(altRoute.distanceMeters / 1000).toFixed(1)} km`
      },
      duration: {
        seconds: parseInt(altRoute.duration.replace('s', '')),
        text: formatDuration(parseInt(altRoute.duration.replace('s', '')))
      },
      polyline: altRoute.polyline?.encodedPolyline || '',
    }))
  };
};

/**
 * Format duration in seconds to a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
};
