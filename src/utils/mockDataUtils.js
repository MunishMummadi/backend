/**
 * Utility functions for generating mock healthcare provider data
 * Used as fallback when no real providers are found
 */

import { generateRandomInsuranceData } from './insuranceUtils.js';

// Common healthcare provider types
const PROVIDER_TYPES = [
  'hospital',
  'doctor',
  'clinic',
  'dentist',
  'pharmacy',
  'physiotherapist',
  'laboratory',
  'specialist'
];

// Common healthcare specialties
const SPECIALTIES = [
  'general practitioner',
  'pediatrician',
  'cardiologist',
  'dermatologist',
  'orthopedic',
  'gynecologist',
  'neurologist',
  'ophthalmologist',
  'psychiatrist',
  'radiologist'
];

// Provider name prefixes
const NAME_PREFIXES = [
  'City',
  'Metro',
  'Regional',
  'Community',
  'United',
  'Care',
  'Health',
  'Premier',
  'Advanced',
  'Family'
];

// Provider name suffixes
const NAME_SUFFIXES = [
  'Medical Center',
  'Hospital',
  'Clinic',
  'Health Care',
  'Specialists',
  'Associates',
  'Medical Group',
  'Physicians',
  'Healthcare',
  'Wellness Center'
];

/**
 * Generate a random provider name
 * @returns {string} Random provider name
 */
function generateProviderName() {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

/**
 * Generate a random address for a location
 * @param {string} locality - Area name or city
 * @returns {string} Random address
 */
function generateAddress(locality = '') {
  const streetNumber = Math.floor(Math.random() * 1000) + 1;
  const streets = [
    'Main Street',
    'Park Avenue',
    'Oak Drive',
    'Maple Road',
    'Washington Boulevard',
    'Highland Avenue',
    'Cedar Lane',
    'Sunset Boulevard',
    'River Road',
    'University Drive'
  ];
  const street = streets[Math.floor(Math.random() * streets.length)];
  
  return `${streetNumber} ${street}${locality ? `, ${locality}` : ''}`;
}

/**
 * Generate a random rating between 3 and 5
 * @returns {number} Rating value
 */
function generateRating() {
  // Most providers should have reasonably good ratings (3.0-5.0)
  return (Math.random() * 2 + 3).toFixed(1);
}

/**
 * Generate a random price level (1-4)
 * @returns {number} Price level
 */
function generatePriceLevel() {
  return Math.floor(Math.random() * 4) + 1;
}

/**
 * Generate random provider types
 * @returns {string[]} Array of provider types
 */
function generateTypes() {
  const numTypes = Math.floor(Math.random() * 3) + 1;
  const types = [];
  
  for (let i = 0; i < numTypes; i++) {
    const type = PROVIDER_TYPES[Math.floor(Math.random() * PROVIDER_TYPES.length)];
    if (!types.includes(type)) {
      types.push(type);
    }
  }
  
  return types;
}

/**
 * Generate a random specialty based on provider type
 * @param {string[]} types - Provider types
 * @returns {string} Specialty
 */
function generateSpecialty(types) {
  if (types.includes('specialist')) {
    return SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)];
  }
  return '';
}

/**
 * Generate slightly varied coordinates around a center point
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radiusKm - Radius in kilometers to distribute points
 * @returns {Object} Object with lat and lng properties
 */
function generateNearbyCoordinates(centerLat, centerLng, radiusKm = 2) {
  // Convert radius from km to degrees (rough approximation)
  const radiusDegrees = radiusKm / 111;
  
  // Generate random offset within the radius
  const randomDistance = Math.random() * radiusDegrees;
  const randomAngle = Math.random() * 2 * Math.PI;
  
  // Calculate new coordinates
  const lat = centerLat + (randomDistance * Math.cos(randomAngle));
  const lng = centerLng + (randomDistance * Math.sin(randomAngle));
  
  return { lat, lng };
}

/**
 * Generate a unique place ID for mock data
 * @returns {string} Unique place ID
 */
function generatePlaceId() {
  return `mock_place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate an array of mock providers around a location
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {string} locality - Locality name (city, neighborhood)
 * @param {Object} options - Additional options
 * @param {number} options.count - Number of providers to generate (default: 10)
 * @param {string} options.type - Provider type filter
 * @param {string} options.specialty - Provider specialty filter
 * @returns {Array} Array of mock provider objects
 */
export function generateMockProviders(lat, lng, locality = '', options = {}) {
  const count = options.count || 10;
  const typeFilter = options.type ? options.type.toLowerCase() : null;
  const specialtyFilter = options.specialty ? options.specialty.toLowerCase() : null;
  
  const providers = [];
  
  for (let i = 0; i < count; i++) {
    // Generate types that match the filter if provided
    let types = generateTypes();
    if (typeFilter) {
      if (!types.includes(typeFilter)) {
        types.push(typeFilter);
      }
    }
    
    // Generate specialty
    let specialty = generateSpecialty(types);
    if (specialtyFilter && (!specialty || !specialty.toLowerCase().includes(specialtyFilter))) {
      specialty = specialtyFilter;
    }
    
    // Generate location with some variation
    const coordinates = generateNearbyCoordinates(lat, lng);
    
    // Create mock provider
    const provider = {
      name: generateProviderName(),
      placeId: generatePlaceId(),
      address: generateAddress(locality),
      lat: coordinates.lat,
      lng: coordinates.lng,
      latitude: coordinates.lat, // Include both formats for compatibility
      longitude: coordinates.lng,
      types: types,
      specialty: specialty,
      rating: generateRating(),
      priceLevel: generatePriceLevel(),
      insuranceAccepted: generateRandomInsuranceData(Math.floor(Math.random() * 5) + 3),
      isMockData: true // Flag to indicate this is mock data
    };
    
    providers.push(provider);
  }
  
  return providers;
}
