import { SavedProvider, Provider } from '../models/index.js';

// Save a provider
export const saveProvider = async (req, res) => {
  try {
    const { providerId } = req.body;
    const anonymousId = req.cookies.anonymousId;
    
    if (!providerId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }
    
    if (!anonymousId) {
      return res.status(400).json({ error: 'Anonymous ID cookie is required' });
    }
    
    // Check if provider exists
    const provider = await Provider.findByPk(providerId);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    // Check if already saved
    const existing = await SavedProvider.findOne({
      where: {
        providerId,
        anonymousId
      }
    });
    
    if (existing) {
      return res.status(200).json({ message: 'Provider already saved', saved: true });
    }
    
    // Save the provider
    await SavedProvider.create({
      providerId,
      anonymousId
    });
    
    res.status(201).json({ message: 'Provider saved successfully', saved: true });
  } catch (error) {
    console.error('Error in saveProvider:', error);
    res.status(500).json({ error: 'Failed to save provider' });
  }
};

// Get saved providers
export const getSavedProviders = async (req, res) => {
  try {
    const anonymousId = req.cookies.anonymousId;
    
    if (!anonymousId) {
      return res.status(400).json({ error: 'Anonymous ID cookie is required' });
    }
    
    // Get saved providers with details
    const savedProviders = await SavedProvider.findAll({
      where: { anonymousId },
      include: [{ model: Provider }]
    });
    
    res.json(savedProviders.map(sp => sp.Provider));
  } catch (error) {
    console.error('Error in getSavedProviders:', error);
    res.status(500).json({ error: 'Failed to get saved providers' });
  }
};

// Unsave a provider
export const unsaveProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const anonymousId = req.cookies.anonymousId;
    
    if (!providerId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }
    
    if (!anonymousId) {
      return res.status(400).json({ error: 'Anonymous ID cookie is required' });
    }
    
    // Remove saved provider
    const result = await SavedProvider.destroy({
      where: {
        providerId,
        anonymousId
      }
    });
    
    if (result === 0) {
      return res.status(404).json({ error: 'Saved provider not found' });
    }
    
    res.json({ message: 'Provider removed from saved list', saved: false });
  } catch (error) {
    console.error('Error in unsaveProvider:', error);
    res.status(500).json({ error: 'Failed to remove saved provider' });
  }
};
