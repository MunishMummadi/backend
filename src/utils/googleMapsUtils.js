/**
 * Utility functions for Google Maps API integration
 */

import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Define medical-related place types
const MEDICAL_PLACE_TYPES = [
  'hospital', 
  'doctor', 
  'health', 
  'dentist', 
  'pharmacy', 
  'physiotherapist', 
  'medical_office'
];

/**
 * Geocode a pincode to get latitude and longitude
 * @param {string} pincode - Postal code/ZIP code to geocode
 * @param {string} country - Optional country code (e.g., 'IN' for India)
 * @returns {Promise<Object>} - Geocoded coordinates {lat, lng}
 */
export const geocodePincode = async (pincode, country = 'IN') => {
  try {
    // Validate pincode
    if (!pincode || pincode.length < 4) {
      throw new Error('Invalid pincode format');
    }

    // Use Google Geocoding API to get coordinates
    const response = await googleMapsClient.geocode({
      params: {
        address: pincode,
        components: {
          postal_code: pincode,
          country: country
        },
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
    } else {
      throw new Error('No location found for this pincode');
    }
  } catch (error) {
    console.error('Error geocoding pincode:', error);
    throw new Error(`Failed to geocode pincode: ${error.message}`);
  }
};

/**
 * Search for healthcare providers using Google Maps Places API
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
    
    // If we have coordinates, use Places Nearby Search
    if (options.lat && options.lng) {
      const searchParams = {
        location: { lat: parseFloat(options.lat), lng: parseFloat(options.lng) },
        radius: options.radius || 5000,
        keyword: finalKeyword,
        key: process.env.GOOGLE_MAPS_API_KEY
      };
      
      // Only use valid place types recognized by Google
      if (options.type && MEDICAL_PLACE_TYPES.includes(options.type.toLowerCase())) {
        searchParams.type = options.type.toLowerCase();
      }
      
      const response = await googleMapsClient.placesNearby({
        params: searchParams
      });
      
      if (response && response.data && response.data.results) {
        // Filter results for medical locations if no specific type was set
        let results = response.data.results;
        
        if (!options.type) {
          results = results.filter(place => 
            // Check if any of the place types match our medical types
            place.types && place.types.some(type => MEDICAL_PLACE_TYPES.includes(type))
          );
        }
        
        return results.map(place => formatProviderFromGoogleMaps(place));
      }
    } else {
      // Otherwise, use Places Text Search
      const searchParams = {
        query: finalKeyword,
        key: process.env.GOOGLE_MAPS_API_KEY
      };
      
      // Only use valid place types recognized by Google
      if (options.type && MEDICAL_PLACE_TYPES.includes(options.type.toLowerCase())) {
        searchParams.type = options.type.toLowerCase();
      }
      
      const response = await googleMapsClient.textSearch({
        params: searchParams
      });
      
      if (response && response.data && response.data.results) {
        // Filter results for medical locations if no specific type was set
        let results = response.data.results;
        
        if (!options.type) {
          results = results.filter(place => 
            // Check if any of the place types match our medical types
            place.types && place.types.some(type => MEDICAL_PLACE_TYPES.includes(type))
          );
        }
        
        return results.map(place => formatProviderFromGoogleMaps(place));
      }
    }
    
    return [];
  } catch (error) {
    console.error('Google Maps search error:', error);
    throw new Error('Failed to search healthcare providers');
  }
};

/**
 * Format provider data from Google Maps response to application format
 * @param {Object} place - Google Maps place object
 * @returns {Object} Formatted provider object
 */
export const formatProviderFromGoogleMaps = (place) => {
  if (!place) return null;
  
  return {
    id: place.id,
    placeId: place.place_id,
    name: place.name || 'Unknown Provider',
    address: place.vicinity || place.formatted_address || '',
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    type: getProviderType(place.types, place),
    rating: place.rating || Math.floor(Math.random() * 3) + 3, // Default random rating between 3-5
    phoneNumber: place.formatted_phone_number || '',
    website: place.website || '',
    openNow: place.opening_hours ? place.opening_hours.open_now : true,
    priceLevel: place.price_level || Math.floor(Math.random() * 3) + 1,
    reviewCount: place.user_ratings_total || Math.floor(Math.random() * 20) + 5,
    photos: place.photos ? place.photos.map(photo => ({
      reference: photo.photo_reference,
      width: photo.width,
      height: photo.height
    })) : [],
  };
};

/**
 * Generate a static map URL with markers for providers
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
    
    // Add API key
    url += `&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    return url;
  } catch (error) {
    console.error('Error generating static map URL:', error);
    return '';
  }
};

/**
 * Determine provider type based on Google Maps place types
 * @param {Array} types - Types from Google Maps
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
 * Get place details using Google Maps Places API
 * @param {string} placeId - Google Maps place ID
 * @returns {Promise<Object>} Place details
 */
export const getPlaceDetails = async (placeId) => {
  try {
    const response = await googleMapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number', 'website', 'types', 'price_level', 'rating', 'opening_hours', 'photos'],
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
