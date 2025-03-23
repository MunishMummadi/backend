import { Client } from '@googlemaps/google-maps-services-js';
import { Provider } from '../models/index.js';
import { Op } from 'sequelize';

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Define medical-related place types for consistent filtering
const MEDICAL_PLACE_TYPES = [
  'hospital', 
  'doctor', 
  'health', 
  'dentist', 
  'pharmacy', 
  'physiotherapist', 
  'medical_office'
];

class ProviderService {
  // Find providers near a location with filtering
  async findNearbyProviders(params) {
    const {
      lat,
      lng,
      type,
      specialty,
      priceRange,
      radius = 5000,
      insurance
    } = params;

    try {
      // First check if we have providers in our database that match criteria
      const dbProviders = await this.findProvidersInDatabase(lat, lng, radius, type, specialty, priceRange, insurance);
      
      // If we have enough providers in DB, return them
      if (dbProviders.length >= 10) {
        return dbProviders;
      }
      
      // Otherwise, fetch from Google Maps API
      // Build the base search parameters
      const searchParams = {
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radius: parseInt(radius),
        key: process.env.GOOGLE_MAPS_API_KEY
      };
      
      // Add type filter if provided and it's a valid medical type
      if (type && MEDICAL_PLACE_TYPES.includes(type.toLowerCase())) {
        searchParams.type = type.toLowerCase();
      } else {
        // Default to healthcare-related places
        searchParams.type = 'hospital';
      }
      
      // Build keyword to ensure we get medical results
      let keyword = 'healthcare';
      if (specialty) {
        keyword += ` ${specialty}`;
      }
      if (type && !MEDICAL_PLACE_TYPES.includes(type.toLowerCase())) {
        // If type is not a standard Google Maps type, include it as keyword
        keyword += ` ${type}`;
      }
      searchParams.keyword = keyword;
      
      const response = await googleMapsClient.placesNearby({
        params: searchParams
      });

      let providers = response.data.results;

      // Apply filters
      if (specialty) {
        providers = providers.filter(p => 
          p.types.some(t => t.toLowerCase().includes(specialty.toLowerCase())));
      }

      if (priceRange) {
        providers = providers.filter(p => 
          p.price_level && p.price_level <= parseInt(priceRange));
      }

      // Convert Google Maps results to our provider format
      const formattedProviders = providers.map(provider => ({
        name: provider.name,
        placeId: provider.place_id,
        address: provider.vicinity,
        latitude: provider.geometry.location.lat,
        longitude: provider.geometry.location.lng,
        types: provider.types,
        rating: provider.rating,
        priceLevel: provider.price_level
      }));

      // Save new providers to database for future queries
      await this.saveProvidersToDatabase(formattedProviders);

      return formattedProviders;
    } catch (error) {
      console.error('Error finding nearby providers:', error);
      throw error;
    }
  }

  // Get detailed information about a specific provider
  async getProviderDetails(providerId) {
    try {
      // First check if we have detailed provider info in our database
      let provider = await Provider.findOne({ 
        where: {
          [Op.or]: [
            { id: isNaN(providerId) ? null : providerId },
            { placeId: providerId }
          ]
        }
      });

      // If found in database with complete details, return it
      if (provider && provider.phone) {
        return provider;
      }

      // If not in database or incomplete details, fetch from Google Maps API
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: provider?.placeId || providerId,
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'geometry', 'type', 'price_level', 'rating'],
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      const placeDetails = response.data.result;
      
      // If provider doesn't exist in DB yet, create it
      if (!provider) {
        provider = await Provider.create({
          name: placeDetails.name,
          placeId: placeDetails.place_id,
          address: placeDetails.formatted_address,
          latitude: placeDetails.geometry.location.lat,
          longitude: placeDetails.geometry.location.lng,
          phone: placeDetails.formatted_phone_number,
          website: placeDetails.website,
          types: placeDetails.types,
          rating: placeDetails.rating,
          priceLevel: placeDetails.price_level
        });
      } else {
        // Update provider with any new information
        await provider.update({
          phone: placeDetails.formatted_phone_number,
          website: placeDetails.website
        });
      }

      return provider;
    } catch (error) {
      console.error('Error getting provider details:', error);
      throw error;
    }
  }

  /**
   * Save provider details to the database
   * @param {Object} providerData - Provider details from Google Maps
   * @returns {Promise<Object>} - Saved provider
   */
  async saveProviderDetails(providerData) {
    try {
      // Check if provider already exists
      const existingProvider = await Provider.findOne({
        where: {
          [Op.or]: [
            { placeId: providerData.placeId },
            { 
              name: providerData.name,
              lat: providerData.lat,
              lng: providerData.lng
            }
          ]
        }
      });

      if (existingProvider) {
        // Update existing provider
        await existingProvider.update({
          ...providerData,
          updatedAt: new Date()
        });
        return existingProvider;
      }

      // Create new provider
      const provider = await Provider.create({
        ...providerData,
        // Make sure we have the required fields
        name: providerData.name || 'Unknown Provider',
        lat: providerData.lat || 0,
        lng: providerData.lng || 0,
        type: providerData.type || 'Healthcare Provider',
        placeId: providerData.placeId || providerData.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return provider;
    } catch (error) {
      console.error('Error saving provider details:', error);
      throw new Error('Failed to save provider details');
    }
  }

  /**
   * Get provider by place ID
   * @param {string} placeId - The place ID
   * @returns {Promise<Object>} - Provider details
   */
  async getProviderByPlaceId(placeId) {
    try {
      const provider = await Provider.findOne({
        where: { placeId },
        include: [
          { 
            model: Review, 
            as: 'reviews',
            required: false
          }
        ]
      });

      return provider;
    } catch (error) {
      console.error('Error getting provider by place ID:', error);
      throw new Error('Failed to get provider by place ID');
    }
  }

  // Save providers to database for future queries
  async saveProvidersToDatabase(providers) {
    for (const provider of providers) {
      await Provider.findOrCreate({
        where: { placeId: provider.placeId },
        defaults: provider
      });
    }
  }

  // Find providers in our database
  async findProvidersInDatabase(lat, lng, radius, type, specialty, priceRange, insurance) {
    // Calculate the lat/lng boundaries for a rectangular area
    // Note: This is an approximation, as we're not using geospatial functions in SQLite
    const metersPerDegreeLat = 111000; // approx meters per degree of latitude
    const metersPerDegreeLng = 111000 * Math.cos(lat * (Math.PI / 180)); // adjust for longitude
    
    const latRange = radius / metersPerDegreeLat;
    const lngRange = radius / metersPerDegreeLng;
    
    const minLat = lat - latRange;
    const maxLat = lat + latRange;
    const minLng = lng - lngRange;
    const maxLng = lng + lngRange;
    
    const query = {
      where: {
        latitude: {
          [Op.between]: [minLat, maxLat]
        },
        longitude: {
          [Op.between]: [minLng, maxLng]
        }
      }
    };
    
    if (type) {
      // For JSON data stored as text, we have to use raw SQL or text search
      // This is a simplification; in production you'd want better JSON handling
      query.where.types = {
        [Op.like]: `%${type.toLowerCase()}%`
      };
    }
    
    if (specialty && specialty.trim() !== '') {
      query.where.specialties = {
        [Op.like]: `%${specialty.toLowerCase()}%`
      };
    }
    
    if (priceRange) {
      query.where.priceLevel = {
        [Op.lte]: parseInt(priceRange)
      };
    }
    
    if (insurance && insurance.trim() !== '') {
      query.where.insuranceAccepted = {
        [Op.like]: `%${insurance}%`
      };
    }
    
    return Provider.findAll(query);
  }
}

export default new ProviderService();
