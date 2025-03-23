import { v4 as uuidv4 } from 'uuid';
import AnonymousUser from '../models/AnonymousUser.js';
import SearchHistory from '../models/SearchHistory.js';

class UserService {
  // Generate or retrieve an anonymous user ID
  async getOrCreateAnonymousId(existingId) {
    try {
      if (existingId) {
        // Check if the ID exists in our database
        const existingUser = await AnonymousUser.findOne({ anonymousId: existingId });
        
        if (existingUser) {
          // Update last access time
          existingUser.lastAccess = new Date();
          await existingUser.save();
          return existingId;
        }
      }
      
      // Generate a new ID
      const anonymousId = uuidv4();
      
      // Create a new anonymous user entry
      await AnonymousUser.create({
        anonymousId,
        savedProviders: [],
        createdAt: new Date(),
        lastAccess: new Date()
      });
      
      return anonymousId;
    } catch (error) {
      console.error('Error managing anonymous ID:', error);
      throw error;
    }
  }
  
  // Save a provider to user's saved list
  async saveProvider(anonymousId, providerId) {
    try {
      const user = await AnonymousUser.findOne({ anonymousId });
      
      if (!user) {
        throw new Error('Anonymous user not found');
      }
      
      // Check if already saved
      const alreadySaved = user.savedProviders.some(p => p.providerId === providerId);
      
      if (alreadySaved) {
        return { success: true, message: 'Provider already saved', alreadySaved: true };
      }
      
      // Add to saved providers
      user.savedProviders.push({
        providerId,
        savedAt: new Date()
      });
      
      await user.save();
      
      return { success: true, message: 'Provider saved successfully' };
    } catch (error) {
      console.error('Error saving provider:', error);
      throw error;
    }
  }
  
  // Remove a provider from user's saved list
  async removeProvider(anonymousId, providerId) {
    try {
      const result = await AnonymousUser.updateOne(
        { anonymousId },
        { $pull: { savedProviders: { providerId } } }
      );
      
      if (result.modifiedCount === 0) {
        return { success: false, message: 'Provider not found in saved list' };
      }
      
      return { success: true, message: 'Provider removed from saved list' };
    } catch (error) {
      console.error('Error removing provider:', error);
      throw error;
    }
  }
  
  // Get user's saved providers
  async getSavedProviders(anonymousId) {
    try {
      const user = await AnonymousUser.findOne({ anonymousId });
      
      if (!user) {
        return [];
      }
      
      return user.savedProviders;
    } catch (error) {
      console.error('Error getting saved providers:', error);
      throw error;
    }
  }
  
  // Save search to history
  async saveSearchHistory(anonymousId, searchParams, resultCount) {
    try {
      const searchHistory = new SearchHistory({
        anonymousId,
        searchParams,
        resultCount,
        timestamp: new Date()
      });
      
      await searchHistory.save();
      
      return searchHistory;
    } catch (error) {
      console.error('Error saving search history:', error);
      throw error;
    }
  }
  
  // Get user's search history
  async getSearchHistory(anonymousId) {
    try {
      const searchHistory = await SearchHistory.find({ anonymousId })
        .sort({ timestamp: -1 })
        .limit(20);
      
      return searchHistory;
    } catch (error) {
      console.error('Error getting search history:', error);
      throw error;
    }
  }
  
  // Get specific search details
  async getSearchDetails(searchId) {
    try {
      const search = await SearchHistory.findById(searchId);
      
      if (!search) {
        throw new Error('Search not found');
      }
      
      return search;
    } catch (error) {
      console.error('Error getting search details:', error);
      throw error;
    }
  }
  
  // Clear user's search history
  async clearSearchHistory(anonymousId) {
    try {
      await SearchHistory.deleteMany({ anonymousId });
      return { success: true, message: 'Search history cleared successfully' };
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw error;
    }
  }
}

export default new UserService();
