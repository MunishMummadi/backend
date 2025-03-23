/**
 * Map utility functions for working with Google Maps API
 */

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
    url += `&markers=color:red%7Clabel:${index+1}%7C${lat},${lng}`;
  });
  
  // Add user location marker if provided and different from center
  if (center.isUserLocation) {
    url += `&markers=color:blue%7Csize:small%7C${center.lat},${center.lng}`;
  }
  
  // Add styling
  url += '&style=feature:poi.business|visibility:on&style=feature:poi.medical|visibility:on';
  
  // Add API key
  url += `&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  
  return url;
}

/**
 * Format provider data from Google Maps API to application format
 * @param {Object} googlePlace - Google Maps place result
 * @returns {Object} - Formatted provider object
 */
export function formatProviderFromGooglePlace(googlePlace) {
  return {
    id: googlePlace.place_id,
    name: googlePlace.name,
    address: googlePlace.formatted_address || googlePlace.vicinity,
    lat: googlePlace.geometry.location.lat,
    lng: googlePlace.geometry.location.lng,
    type: googlePlace.types?.[0]?.replace(/_/g, ' ') || 'Healthcare Provider',
    rating: googlePlace.rating || 0,
    reviews: googlePlace.user_ratings_total || 0,
    distance: 'Nearby',
    price: googlePlace.price_level ? '$'.repeat(googlePlace.price_level) : '$$',
    hours: 'Call for hours',
    phone: 'See details',
    insurance: ['Call to verify']
  };
}
