/**
 * Utility functions for Mapbox API integration
 */

import mbxClient from '@mapbox/mapbox-sdk';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding.js';
import mbxStatic from '@mapbox/mapbox-sdk/services/static.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Mapbox client with access token
const mapboxClient = mbxClient({ accessToken: process.env.MAPBOX_ACCESS_TOKEN });
const geocodingService = mbxGeocoding(mapboxClient);
const staticMapService = mbxStatic(mapboxClient);

/**
 * Search for healthcare providers using Mapbox Geocoding API
 * @param {string} query - Search query for healthcare providers
 * @param {Object} options - Additional search options
 * @returns {Promise<Array>} Array of provider results
 */
export const searchHealthcareProviders = async (query, options = {}) => {
  try {
    // Add healthcare-related keywords to improve results
    const searchQuery = options.type || options.specialty 
      ? `${query} ${options.type || ''} ${options.specialty || ''}`.trim() 
      : query;
    
    const searchParams = {
      query: `${searchQuery} healthcare`,
      types: ['poi'],
      limit: 10,
    };
    
    // Add proximity if coordinates are provided
    if (options.lat && options.lng) {
      searchParams.proximity = [options.lng, options.lat];
    }
    
    const response = await geocodingService.forwardGeocode(searchParams).send();
    
    if (response && response.body && response.body.features) {
      return response.body.features.map(feature => formatProviderFromMapbox(feature));
    }
    
    return [];
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    throw new Error('Failed to search healthcare providers');
  }
};

/**
 * Format provider data from Mapbox response to application format
 * @param {Object} feature - Mapbox feature object
 * @returns {Object} Formatted provider object
 */
export const formatProviderFromMapbox = (feature) => {
  if (!feature) return null;
  
  // Extract relevant data from the feature
  const properties = feature.properties || {};
  const coordinates = feature.geometry?.coordinates || [0, 0];
  
  return {
    id: feature.id || properties.id,
    placeId: feature.id,
    name: properties.name || 'Unknown Provider',
    address: properties.address || properties.full_address || '',
    lat: coordinates[1],  // Mapbox uses [longitude, latitude]
    lng: coordinates[0],
    type: getProviderType(properties.category, properties),
    rating: properties.rating || Math.floor(Math.random() * 3) + 3, // Default random rating between 3-5
    phoneNumber: properties.phone || properties.tel || '',
    website: properties.website || '',
    openNow: true, // Default as we don't have this data from Mapbox
    priceLevel: getPriceLevel(properties),
    distance: properties.distance,
    reviewCount: properties.reviews ? properties.reviews.length : Math.floor(Math.random() * 20) + 5,
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
    // Configure the static map request
    const staticMapOptions = {
      width,
      height,
      position: {
        coordinates: [center.lng, center.lat],
        zoom
      },
      style: 'mapbox/streets-v11'
    };
    
    // Add markers for providers
    if (providers.length > 0) {
      staticMapOptions.overlays = providers.slice(0, 10).map((provider, index) => ({
        marker: {
          coordinates: [
            typeof provider.lng === 'string' ? parseFloat(provider.lng) : provider.lng,
            typeof provider.lat === 'string' ? parseFloat(provider.lat) : provider.lat
          ],
          color: '#FF0000',
          label: (index + 1).toString()
        }
      }));
      
      // Add blue marker for user location if provided
      if (center.isUserLocation) {
        staticMapOptions.overlays.push({
          marker: {
            coordinates: [center.lng, center.lat],
            color: '#0000FF',
            size: 'small'
          }
        });
      }
    }
    
    // Generate URL
    const staticMapRequest = staticMapService.getStaticImage(staticMapOptions);
    return staticMapRequest.url();
  } catch (error) {
    console.error('Error generating static map URL:', error);
    return '';
  }
};

/**
 * Determine provider type based on Mapbox category
 * @param {string} category - Category from Mapbox
 * @param {Object} properties - Additional properties
 * @returns {string} Provider type
 */
const getProviderType = (category, properties) => {
  const name = (properties.name || '').toLowerCase();
  const categories = Array.isArray(category) ? category : [category];
  const categoryStr = categories.join(' ').toLowerCase();
  
  if (categoryStr.includes('hospital') || name.includes('hospital')) {
    return 'Hospital';
  } else if (categoryStr.includes('clinic') || name.includes('clinic')) {
    return 'Clinic';
  } else if (categoryStr.includes('pharmacy') || name.includes('pharmacy') || name.includes('drug')) {
    return 'Pharmacy';
  } else if (categoryStr.includes('dentist') || name.includes('dental') || name.includes('dentist')) {
    return 'Dentist';
  } else if (categoryStr.includes('doctor') || name.includes('doctor') || name.includes('physician')) {
    return 'Doctor';
  } else {
    return 'Healthcare Provider';
  }
};

/**
 * Estimate price level based on available properties
 * @param {Object} properties - Mapbox properties
 * @returns {number} Price level (1-4)
 */
const getPriceLevel = (properties) => {
  if (properties.price_level) {
    return properties.price_level;
  }
  
  // If we have a price_level property, use it
  if (properties.price) {
    return properties.price.length; // Assuming price is something like "$" or "$$"
  }
  
  // Otherwise return a random value between 1-3
  return Math.floor(Math.random() * 3) + 1;
};
