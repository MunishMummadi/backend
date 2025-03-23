/**
 * Postal Code Utilities for HealthSpot
 * Provides reliable global postal code geocoding and validation
 */

import { Client } from '@googlemaps/google-maps-services-js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Google Maps client
const googleMapsClient = new Client({});

/**
 * Multi-service geocoder for postal codes that tries multiple APIs
 * to ensure maximum reliability across all global postal codes
 * 
 * @param {string} postalCode - The postal code to geocode
 * @param {string} country - Optional country code
 * @returns {Promise<Object>} - Geocoded coordinates {lat, lng, formattedAddress}
 */
export async function geocodePostalCode(postalCode, country = null) {
  const cleanPostalCode = postalCode.replace(/[\s\-\.]+/g, '');
  console.log(`Geocoding postal code: ${cleanPostalCode}${country ? ` (${country})` : ''}`);
  
  // Try different services in sequence until one succeeds
  const services = [
    tryGoogleMapsGeocoding,
    tryZipcodebaseAPI,
    tryPostcodeioAPI,
    tryOpenStreetMapNominatim
  ];
  
  let lastError = null;
  
  // Try each service in order until one succeeds
  for (const geocodingService of services) {
    try {
      const result = await geocodingService(cleanPostalCode, country);
      if (result) {
        console.log(`Successfully geocoded postal code ${cleanPostalCode} using ${geocodingService.name}`);
        return result;
      }
    } catch (error) {
      console.log(`Service ${geocodingService.name} failed:`, error.message);
      lastError = error;
      // Continue to next service
    }
  }
  
  // If we've reached here, all services failed
  throw new Error(lastError ? lastError.message : 'Failed to geocode postal code with all available services');
}

/**
 * Try geocoding with Google Maps API
 * 
 * @param {string} postalCode - Clean postal code
 * @param {string} country - Country code (optional)
 * @returns {Promise<Object>} - Geocoded result or null
 */
async function tryGoogleMapsGeocoding(postalCode, country) {
  try {
    // Try different geocoding strategies
    const strategies = [
      // Strategy 1: Direct postal code with country component
      async () => {
        if (!country) return null;
        
        const response = await googleMapsClient.geocode({
          params: {
            address: postalCode,
            components: `country:${country}`,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        return checkGoogleResponse(response);
      },
      
      // Strategy 2: Postal code + country name in address
      async () => {
        if (!country) return null;
        
        // Get country name from code
        const countryNames = {
          'US': 'USA',
          'IN': 'India',
          'GB': 'UK',
          'CA': 'Canada',
          'AU': 'Australia',
          // Add more as needed
        };
        
        const countryName = countryNames[country] || country;
        
        const response = await googleMapsClient.geocode({
          params: {
            address: `${postalCode} ${countryName}`,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        return checkGoogleResponse(response);
      },
      
      // Strategy 3: Just the postal code
      async () => {
        const response = await googleMapsClient.geocode({
          params: {
            address: postalCode,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        return checkGoogleResponse(response);
      },
      
      // Strategy 4: With "postal code" prefix
      async () => {
        const response = await googleMapsClient.geocode({
          params: {
            address: `postal code ${postalCode}`,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        return checkGoogleResponse(response);
      }
    ];
    
    // Try each strategy
    for (const strategy of strategies) {
      const result = await strategy();
      if (result) return result;
    }
    
    return null;
  } catch (error) {
    console.error('Google Maps geocoding error:', error);
    return null;
  }
}

/**
 * Helper to check Google Maps API response
 */
function checkGoogleResponse(response) {
  if (response.data.results && response.data.results.length > 0) {
    const result = response.data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      source: 'google'
    };
  }
  return null;
}

/**
 * Try geocoding with Zipcodebase API (fallback service)
 * Note: Would need API key in actual implementation
 */
async function tryZipcodebaseAPI(postalCode, country) {
  try {
    // This is a placeholder - in a real implementation, you would:
    // 1. Sign up for a Zipcodebase API key (they have a free tier)
    // 2. Make the API call with your key
    
    if (!process.env.ZIPCODEBASE_API_KEY) {
      console.log('No Zipcodebase API key configured, skipping');
      return null;
    }
    
    const url = `https://app.zipcodebase.com/api/v1/search?apikey=${process.env.ZIPCODEBASE_API_KEY}&codes=${postalCode}${country ? `&country=${country}` : ''}`;
    
    const response = await axios.get(url);
    
    if (response.data && response.data.results && response.data.results[postalCode]) {
      const result = response.data.results[postalCode][0];
      return {
        lat: parseFloat(result.latitude),
        lng: parseFloat(result.longitude),
        formattedAddress: `${result.city}, ${result.state} ${postalCode}, ${result.country_code}`,
        source: 'zipcodebase'
      };
    }
    
    return null;
  } catch (error) {
    console.log('Zipcodebase API error:', error.message);
    return null;
  }
}

/**
 * Try geocoding with postcodes.io (UK postcodes)
 */
async function tryPostcodeioAPI(postalCode, country) {
  // Only try for UK postcodes
  if (country && country !== 'GB' && country !== 'UK') {
    return null;
  }
  
  try {
    const response = await axios.get(`https://api.postcodes.io/postcodes/${postalCode}`);
    
    if (response.data && response.data.result) {
      const result = response.data.result;
      return {
        lat: result.latitude,
        lng: result.longitude,
        formattedAddress: `${result.admin_district}, ${result.postcode}, UK`,
        source: 'postcodes.io'
      };
    }
    
    return null;
  } catch (error) {
    console.log('Postcodes.io API error:', error.message);
    return null;
  }
}

/**
 * Try geocoding with OpenStreetMap Nominatim (free, open source)
 */
async function tryOpenStreetMapNominatim(postalCode, country) {
  try {
    const countryParam = country ? `&countrycodes=${country}` : '';
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?postalcode=${postalCode}${countryParam}&format=json`,
      { headers: { 'User-Agent': 'HealthSpot-App/1.0' } } // Required by Nominatim ToS
    );
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formattedAddress: result.display_name,
        source: 'nominatim'
      };
    }
    
    return null;
  } catch (error) {
    console.log('Nominatim API error:', error.message);
    return null;
  }
}

/**
 * Fallback coordinates for common countries when all geocoding fails
 * This ensures the app can always show something rather than just erroring out
 */
export const fallbackCountryCoordinates = {
  'US': { lat: 39.8333333, lng: -98.585522 }, // Geographic center of US
  'IN': { lat: 20.5937, lng: 78.9629 },       // Center of India
  'GB': { lat: 55.3781, lng: -3.4360 },       // Center of UK
  'CA': { lat: 56.1304, lng: -106.3468 },     // Center of Canada
  'AU': { lat: -25.2744, lng: 133.7751 },     // Center of Australia
  'BR': { lat: -14.2350, lng: -51.9253 },     // Center of Brazil
  'MX': { lat: 23.6345, lng: -102.5528 },     // Center of Mexico
  'ZA': { lat: -30.5595, lng: 22.9375 },      // Center of South Africa
  'NG': { lat: 9.0820, lng: 8.6753 },         // Center of Nigeria
  'KE': { lat: 0.0236, lng: 37.9062 },        // Center of Kenya
  'DEFAULT': { lat: 0, lng: 0 }               // Fallback for unknown countries
};

/**
 * Get fallback coordinates for a country if geocoding fails
 * 
 * @param {string} country - Country code
 * @returns {Object} - Coordinates {lat, lng}
 */
export function getFallbackCoordinates(country) {
  return fallbackCountryCoordinates[country] || fallbackCountryCoordinates.DEFAULT;
}

/**
 * Validate postal code format based on country
 * For most common postal code formats
 * 
 * @param {string} postalCode - Postal code to validate
 * @param {string} country - Country code (optional)
 * @returns {boolean} - Whether the postal code is valid
 */
export function isValidPostalCode(postalCode, country) {
  if (!postalCode) return false;
  
  // Clean the postal code
  const cleanPostalCode = postalCode.replace(/[\s\-\.]+/g, '');
  
  // Country-specific validation
  if (country) {
    const patterns = {
      'US': /^\d{5}(\d{4})?$/,           // US: 12345 or 12345-6789
      'IN': /^\d{6}$/,                    // India: 123456
      'GB': /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, // UK: AB1 2CD or AB12 3CD
      'CA': /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i, // Canada: A1B 2C3
      'AU': /^\d{4}$/,                    // Australia: 1234
      'BR': /^\d{5}-?\d{3}$/,             // Brazil: 12345-678
      'MX': /^\d{5}$/                     // Mexico: 12345
    };
    
    return patterns[country] ? patterns[country].test(cleanPostalCode) : true;
  }
  
  // Generic validation - at least 3 characters with letters/numbers
  return /^[A-Z0-9]{3,}$/i.test(cleanPostalCode);
}
