import twilio from 'twilio';
import { SmsSubscription } from '../models/index.js';
import { Op } from 'sequelize';

// Initialize Twilio client only if valid credentials exist
const twilioClient = process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

class SmsService {
  // Check if SMS service is configured
  isConfigured() {
    return twilioClient !== null;
  }
  
  // Subscribe user to SMS updates
  async subscribe(phoneNumber, preferences, anonymousId) {
    if (!this.isConfigured()) {
      throw new Error('SMS service is not configured');
    }
    
    try {
      // Check if already subscribed
      let subscription = await SmsSubscription.findOne({ 
        where: { phoneNumber }
      });
      
      if (subscription) {
        // Update existing subscription
        await subscription.update({
          providerTypes: preferences.providerTypes || [],
          latitude: preferences.latitude,
          longitude: preferences.longitude,
          radius: preferences.radius,
          anonymousId
        });
        
        return { success: true, message: 'SMS subscription updated', subscription };
      }
      
      // Create new subscription
      subscription = await SmsSubscription.create({
        phoneNumber,
        providerTypes: preferences.providerTypes || [],
        latitude: preferences.latitude,
        longitude: preferences.longitude,
        radius: preferences.radius || 10,
        anonymousId,
        isVerified: false
      });
      
      // Send verification SMS
      await this.sendVerificationSms(phoneNumber);
      
      return { success: true, message: 'SMS subscription created', subscription };
    } catch (error) {
      console.error('Error subscribing to SMS updates:', error);
      throw error;
    }
  }
  
  // Send verification SMS
  async sendVerificationSms(phoneNumber) {
    if (!this.isConfigured()) {
      throw new Error('SMS service is not configured');
    }
    
    const message = `Welcome to Healthspot! You are now subscribed to receive updates about healthcare providers. Reply STOP to unsubscribe at any time.`;
    
    try {
      await twilioClient.messages.create({
        body: message,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });
      
      // Mark as verified after sending message
      await SmsSubscription.update(
        { isVerified: true, lastNotificationSent: new Date() },
        { where: { phoneNumber } }
      );
      
      return { success: true, message: 'Verification SMS sent' };
    } catch (error) {
      console.error('Error sending verification SMS:', error);
      throw error;
    }
  }
  
  // Send information about a healthcare provider
  async sendProviderInfo(phoneNumber, providerInfo) {
    if (!this.isConfigured()) {
      throw new Error('SMS service is not configured');
    }
    
    try {
      // Check if phone number is subscribed
      const subscription = await SmsSubscription.findOne({ 
        where: { phoneNumber, isVerified: true }
      });
      
      if (!subscription) {
        throw new Error('Phone number not subscribed or not verified');
      }
      
      const message = `
Healthspot Provider Information:
${providerInfo.name}
Address: ${providerInfo.address}
Phone: ${providerInfo.phone || 'N/A'}
Rating: ${providerInfo.rating || 'N/A'}/5
${providerInfo.website ? `Website: ${providerInfo.website}` : ''}
`.trim();
      
      await twilioClient.messages.create({
        body: message,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });
      
      // Update last notification sent timestamp
      await subscription.update({
        lastNotificationSent: new Date()
      });
      
      return { success: true, message: 'Provider info sent via SMS' };
    } catch (error) {
      console.error('Error sending provider info via SMS:', error);
      throw error;
    }
  }
  
  // Send SMS to multiple subscribed users (admin function)
  async sendBulkSms(providerInfo, filter = {}) {
    if (!this.isConfigured()) {
      throw new Error('SMS service is not configured');
    }
    
    try {
      // Find subscribers based on filter
      const queryFilter = {
        where: {
          isVerified: true
        }
      };
      
      // Add additional filters if provided
      if (filter.providerTypes && filter.providerTypes.length > 0) {
        // This is a simplification for SQLite; in a production app with a better DB, 
        // you'd use proper JSON functions
        const typeFilters = filter.providerTypes.map(type => ({
          providerTypes: { [Op.like]: `%${type}%` }
        }));
        queryFilter.where[Op.or] = typeFilters;
      }
      
      if (filter.anonymousId) {
        queryFilter.where.anonymousId = filter.anonymousId;
      }
      
      const subscribers = await SmsSubscription.findAll(queryFilter);
      
      if (subscribers.length === 0) {
        return { success: false, message: 'No subscribed users match the filter' };
      }
      
      const message = `
Healthspot Provider Update:
${providerInfo.name}
Address: ${providerInfo.address}
Phone: ${providerInfo.phone || 'N/A'}
Rating: ${providerInfo.rating || 'N/A'}/5
${providerInfo.website ? `Website: ${providerInfo.website}` : ''}
`.trim();
      
      const results = await Promise.all(
        subscribers.map(async (subscriber) => {
          try {
            await twilioClient.messages.create({
              body: message,
              to: subscriber.phoneNumber,
              from: process.env.TWILIO_PHONE_NUMBER
            });
            
            // Update last notification sent timestamp
            await subscriber.update({
              lastNotificationSent: new Date()
            });
            
            return { phoneNumber: subscriber.phoneNumber, success: true };
          } catch (error) {
            console.error(`Error sending to ${subscriber.phoneNumber}:`, error);
            return { phoneNumber: subscriber.phoneNumber, success: false, error: error.message };
          }
        })
      );
      
      return { 
        success: true, 
        message: `SMS sent to ${results.filter(r => r.success).length} out of ${subscribers.length} subscribers`,
        results
      };
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      throw error;
    }
  }
  
  // Get subscriptions by anonymous ID
  async getSubscriptionsByAnonymousId(anonymousId) {
    try {
      const subscriptions = await SmsSubscription.findAll({ 
        where: { anonymousId }
      });
      return subscriptions;
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      throw error;
    }
  }
  
  // Unsubscribe from SMS updates
  async unsubscribe(phoneNumber) {
    try {
      const result = await SmsSubscription.destroy({ 
        where: { phoneNumber }
      });
      
      if (!result) {
        return { success: false, message: 'Subscription not found' };
      }
      
      return { success: true, message: 'Successfully unsubscribed from SMS updates' };
    } catch (error) {
      console.error('Error unsubscribing from SMS updates:', error);
      throw error;
    }
  }
  
  // Process incoming SMS messages from users
  async processIncomingMessage(from, body, messageSid) {
    try {
      console.log(`Processing incoming message from ${from}: "${body}" (SID: ${messageSid})`);
      
      // Convert body to lowercase for case-insensitive command matching
      const message = body.trim().toLowerCase();
      
      // Check if subscription exists
      const subscription = await SmsSubscription.findOne({ 
        where: { phoneNumber: from }
      });
      
      // Handle commands
      if (message === 'stop' || message === 'cancel' || message === 'unsubscribe') {
        // Note: Twilio automatically handles STOP messages for compliance,
        // but we can add our own handling as well
        if (subscription) {
          await this.unsubscribe(from);
          return { success: true, message: 'You have been unsubscribed from Healthspot messages. We hope to see you again soon!' };
        } else {
          return { success: true, message: 'You are not currently subscribed to Healthspot messages.' };
        }
      } else if (message === 'start' || message === 'subscribe') {
        if (subscription) {
          // If already subscribed, just update the status
          await subscription.update({ isVerified: true });
          return { success: true, message: 'Welcome back to Healthspot! You are now resubscribed to receive updates.' };
        } else {
          // Without anonymous ID, we can't create a full subscription here
          // So we'll create a minimal one
          await SmsSubscription.create({
            phoneNumber: from,
            providerTypes: [],
            isVerified: true,
            anonymousId: 'sms-initiated' // Placeholder
          });
          
          return { 
            success: true, 
            message: 'Thank you for subscribing to Healthspot! Visit our website to customize your preferences.' 
          };
        }
      } else if (message === 'help') {
        return { 
          success: true, 
          message: 'Healthspot commands: STOP to unsubscribe, START to resubscribe, HELP for assistance, STATUS to check your subscription.' 
        };
      } else if (message === 'status') {
        if (subscription) {
          const providerTypes = subscription.providerTypes.length > 0 
            ? `You are receiving updates for: ${subscription.providerTypes.join(', ')}.` 
            : 'You have not set specific provider preferences.';
            
          return {
            success: true,
            message: `You are subscribed to Healthspot messages. ${providerTypes} Visit our website to update your preferences.`
          };
        } else {
          return { 
            success: true, 
            message: 'You are not currently subscribed to Healthspot messages. Text START to subscribe.' 
          };
        }
      } else {
        // Default response for unrecognized messages
        return {
          success: true,
          message: 'Thank you for your message. Please text HELP for available commands, or visit our website for more information.'
        };
      }
    } catch (error) {
      console.error('Error processing incoming SMS message:', error);
      return { 
        success: false, 
        message: 'Sorry, we encountered an error processing your message. Please try again later or contact support.' 
      };
    }
  }
  
  // Update message status from Twilio webhook
  async updateMessageStatus(messageSid, status) {
    try {
      console.log(`Updating message ${messageSid} status to ${status}`);
      
      // Here you would typically update a message status in your database
      // For now, we'll just log it since we don't have a messages table
      
      // Example implementation if you had a Message model:
      // await Message.update({ status }, { where: { messageSid } });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating message status:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new SmsService();
