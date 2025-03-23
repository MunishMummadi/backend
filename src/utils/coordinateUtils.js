/**
 * Utilities for handling and validating geographic coordinates for Google Maps
 */

/**
 * Checks if a value is a valid numeric latitude
 * @param {any} lat - The latitude value to check
 * @returns {boolean} True if valid latitude
 */
export const isValidLatitude = (lat) => {
  if (lat === undefined || lat === null) return false;
  const latitude = parseFloat(lat);
  return !isNaN(latitude) && latitude >= -90 && latitude <= 90;
};

/**
 * Checks if a value is a valid numeric longitude
 * @param {any} lng - The longitude value to check
 * @returns {boolean} True if valid longitude
 */
export const isValidLongitude = (lng) => {
  if (lng === undefined || lng === null) return false;
  const longitude = parseFloat(lng);
  return !isNaN(longitude) && longitude >= -180 && longitude <= 180;
};

/**
 * Validates if an object contains valid lat/lng coordinates for Google Maps
 * @param {Object} coords - The coordinate object to validate
 * @returns {boolean} True if the coordinates are valid
 */
export const isValidCoordinates = (coords) => {
  if (!coords || typeof coords !== 'object') return false;
  return isValidLatitude(coords.lat) && isValidLongitude(coords.lng);
};

/**
 * Validates an array of coordinate objects
 * @param {Array} coordsArray - Array of coordinate objects
 * @returns {Array} Filtered array containing only valid coordinates
 */
export const filterValidCoordinates = (coordsArray) => {
  if (!Array.isArray(coordsArray)) return [];
  return coordsArray.filter(coords => isValidCoordinates(coords));
};

/**
 * Creates default coordinates for when valid coordinates are not available
 * @param {Object} [fallbackCenter] - Optional fallback center coordinate
 * @returns {Object} Default coordinate object
 */
export const createDefaultCoordinates = (fallbackCenter = null) => {
  // Use provided fallback if valid
  if (fallbackCenter && isValidCoordinates(fallbackCenter)) {
    return fallbackCenter;
  }
  
  // Default to a center point in New Delhi, India
  return { lat: 28.6139, lng: 77.2090 };
};

/**
 * Gets a safe coordinate object, using a fallback if input is invalid
 * @param {Object} coords - The coordinate object to validate
 * @param {Object} [fallback] - Optional fallback coordinates
 * @returns {Object} Valid coordinate object
 */
export const getSafeCoordinates = (coords, fallback = null) => {
  return isValidCoordinates(coords) ? coords : createDefaultCoordinates(fallback);
};

/**
 * Convert coordinates to Google Maps LatLng literal format
 * @param {Object} coords - Coordinate object with lat/lng properties 
 * @returns {Object} Google Maps LatLng literal
 */
export const toGoogleMapsLatLng = (coords) => {
  if (!isValidCoordinates(coords)) {
    coords = createDefaultCoordinates();
  }
  return { lat: parseFloat(coords.lat), lng: parseFloat(coords.lng) };
};

/**
 * Creates a bounds object for Google Maps
 * @param {Array} coordsArray - Array of coordinate objects
 * @returns {Object|null} Google Maps bounds object, or null if not enough valid points
 */
export const createGoogleMapsBounds = (coordsArray) => {
  const validCoords = filterValidCoordinates(coordsArray);
  
  if (validCoords.length === 0) return null;
  
  // Initialize with the first valid coordinate
  let minLat = validCoords[0].lat;
  let maxLat = validCoords[0].lat;
  let minLng = validCoords[0].lng;
  let maxLng = validCoords[0].lng;
  
  // Find min/max values for all coordinates
  validCoords.forEach(coord => {
    minLat = Math.min(minLat, coord.lat);
    maxLat = Math.max(maxLat, coord.lat);
    minLng = Math.min(minLng, coord.lng);
    maxLng = Math.max(maxLng, coord.lng);
  });
  
  // Format for Google Maps
  return {
    south: minLat,
    west: minLng,
    north: maxLat,
    east: maxLng
  };
};
