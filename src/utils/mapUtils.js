/**
 * Map utility functions for working with Google Maps API
 */

import { isValidCoordinates } from './coordinateUtils.js';

/**
 * Generate a static map URL with markers for providers
 * @param {Object} center - The center coordinates {lat, lng}
 * @param {Array} providers - Array of provider objects with lat/lng properties
 * @param {number} zoom - Zoom level (1-20)
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {string} - URL for the static map
 */
export function generateStaticMapUrl(center, providers = [], zoom = 13, width = 600, height = 400) {
  // Base URL for Google Static Maps API
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  
  // Start building the URL with center, zoom, size and map type
  let url = `${baseUrl}?center=${center.lat},${center.lng}&zoom=${zoom}&size=${width}x${height}&maptype=roadmap&scale=2`;
  
  // Add markers for providers (limit to 10 to avoid URL length issues)
  const limitedProviders = providers.slice(0, 10);
  limitedProviders.forEach((provider, index) => {
    const lat = typeof provider.lat === 'string' ? parseFloat(provider.lat) : provider.lat;
    const lng = typeof provider.lng === 'string' ? parseFloat(provider.lng) : provider.lng;
    
    // Skip invalid coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn(`Skipping invalid coordinates for provider ${provider.name || index}`);
      return;
    }
    
    url += `&markers=color:red%7Clabel:${index+1}%7C${lat},${lng}`;
  });
  
  // Add user location marker if provided and different from center
  if (center.isUserLocation) {
    url += `&markers=color:blue%7Csize:small%7C${center.lat},${center.lng}`;
  }
  
  // Add styling
  url += '&style=feature:poi.business|visibility:on&style=feature:poi.medical|visibility:on';
  
  // Add API key placeholder - will be replaced with actual key
  url += '&key=${GOOGLE_MAPS_API_KEY}';
  
  return url;
}

/**
 * Format provider data from Google Maps API to application format
 * @param {Object} googlePlace - Google Maps place result
 * @returns {Object} - Formatted provider object
 */
export function formatProviderFromGooglePlace(googlePlace) {
  if (!googlePlace) return null;
  
  // Safely extract location
  const location = googlePlace.geometry?.location || {};
  const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
  const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
  
  return {
    id: googlePlace.place_id,
    placeId: googlePlace.place_id,
    name: googlePlace.name || 'Unknown Provider',
    address: googlePlace.formatted_address || googlePlace.vicinity || '',
    lat: lat,
    lng: lng,
    type: getProviderType(googlePlace),
    rating: googlePlace.rating || 0,
    reviewCount: googlePlace.user_ratings_total || 0,
    distance: googlePlace.distance ? `${(googlePlace.distance / 1000).toFixed(1)} km` : 'Nearby',
    priceLevel: googlePlace.price_level || 2,
    openNow: getOpenStatus(googlePlace),
    phoneNumber: googlePlace.formatted_phone_number || googlePlace.international_phone_number || '',
    website: googlePlace.website || '',
    photos: formatPhotos(googlePlace.photos)
  };
}

/**
 * Determine provider type based on Google Place types
 * @param {Object} place - Google Place object
 * @returns {string} Provider type
 */
function getProviderType(place) {
  if (!place || !place.types) return 'Healthcare Provider';
  
  const types = Array.isArray(place.types) ? place.types : [];
  const name = (place.name || '').toLowerCase();
  
  if (types.includes('hospital') || name.includes('hospital')) {
    return 'Hospital';
  } else if (types.includes('doctor') || name.includes('doctor') || name.includes('physician')) {
    return 'Doctor';
  } else if (types.includes('pharmacy') || name.includes('pharmacy') || name.includes('drugstore')) {
    return 'Pharmacy';
  } else if (types.includes('dentist') || name.includes('dentist') || name.includes('dental')) {
    return 'Dentist';
  } else if (types.includes('physiotherapist') || name.includes('physio') || name.includes('physical therapy')) {
    return 'Physiotherapist';
  } else if (types.includes('health') || name.includes('clinic') || name.includes('healthcare') || name.includes('medical')) {
    return 'Clinic';
  }
  
  return 'Healthcare Provider';
}

/**
 * Get open status from a Google Place result
 * @param {Object} place - Google Place object
 * @returns {boolean} Open status
 */
function getOpenStatus(place) {
  if (!place) return false;
  
  // Try to get from opening_hours if available
  if (place.opening_hours && typeof place.opening_hours.isOpen === 'function') {
    return place.opening_hours.isOpen();
  }
  
  if (place.opening_hours && typeof place.opening_hours.open_now === 'boolean') {
    return place.opening_hours.open_now;
  }
  
  // Default to closed if we can't determine
  return false;
}

/**
 * Format photo data from Google Place API
 * @param {Array} photos - Google Places API photos array
 * @returns {Array} Formatted photos array
 */
function formatPhotos(photos) {
  if (!photos || !Array.isArray(photos)) return [];
  
  return photos.slice(0, 5).map(photo => ({
    reference: photo.photo_reference,
    width: photo.width,
    height: photo.height,
    url: photo.getUrl ? photo.getUrl() : null,
  }));
}

/**
 * Check if Google Maps API is loaded
 * @returns {boolean} True if Google Maps API is available
 */
export function isGoogleMapsLoaded() {
  return typeof window !== 'undefined' && window.google && window.google.maps;
}

/**
 * Helper to create a Google Maps LatLng object from coordinates
 * @param {Object} coords - Object with lat/lng properties
 * @returns {google.maps.LatLng|null} Google Maps LatLng object or null if invalid
 */
export function createGoogleLatLng(coords) {
  if (!isGoogleMapsLoaded() || !isValidCoordinates(coords)) return null;
  return new window.google.maps.LatLng(coords.lat, coords.lng);
}

/**
 * Helper to create a Google Maps LatLngBounds object
 * @param {Object} bounds - Object with south, west, north, east properties
 * @returns {google.maps.LatLngBounds|null} Google Maps LatLngBounds object or null if invalid
 */
export function createGoogleLatLngBounds(bounds) {
  if (!isGoogleMapsLoaded() || !bounds) return null;
  
  const sw = new window.google.maps.LatLng(bounds.south, bounds.west);
  const ne = new window.google.maps.LatLng(bounds.north, bounds.east);
  
  const googleBounds = new window.google.maps.LatLngBounds(sw, ne);
  return googleBounds;
}

/**
 * Handle error with Google Maps
 * @param {Error} error - Error object
 * @returns {string} Error message
 */
export function handleGoogleMapsError(error) {
  console.error('Google Maps Error:', error);
  
  if (error.code === 'ZERO_RESULTS') {
    return 'No results found for this location.';
  } else if (error.code === 'OVER_QUERY_LIMIT') {
    return 'API request limit exceeded. Please try again later.';
  } else if (error.code === 'REQUEST_DENIED') {
    return 'API request was denied. Check your API key configuration.';
  } else if (error.code === 'INVALID_REQUEST') {
    return 'Invalid request. Please check your parameters.';
  } else if (error.code === 'UNKNOWN_ERROR') {
    return 'Unknown error occurred. Please try again.';
  }
  
  return 'An error occurred with Google Maps. Please try again.';
}
