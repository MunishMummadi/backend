import providerService from '../services/providerService.js';
import userService from '../services/userService.js';

// Get nearby providers
export const getNearbyProviders = async (req, res) => {
  try {
    const { lat, lng, type, specialty, priceRange, radius, insurance, anonymousId } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location coordinates (lat, lng) are required' });
    }
    
    // Save search to history if anonymousId is provided
    if (anonymousId) {
      await userService.saveSearchHistory(
        anonymousId,
        {
          location: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          type,
          specialty,
          priceRange,
          radius,
          insurance
        },
        0 // Will update result count after fetching
      );
    }
    
    const providers = await providerService.findNearbyProviders({
      lat, 
      lng, 
      type, 
      specialty, 
      priceRange,
      radius,
      insurance
    });
    
    // Update result count in search history if anonymousId is provided
    if (anonymousId) {
      await userService.saveSearchHistory(
        anonymousId,
        {
          location: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          type,
          specialty,
          priceRange,
          radius,
          insurance
        },
        providers.length
      );
    }
    
    res.json(providers);
  } catch (error) {
    console.error('Error in getNearbyProviders:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
};

// Get provider details
export const getProviderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }
    
    const provider = await providerService.getProviderDetails(id);
    
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    res.json(provider);
  } catch (error) {
    console.error('Error in getProviderDetails:', error);
    res.status(500).json({ error: 'Failed to fetch provider details' });
  }
};
