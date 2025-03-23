import smsService from '../services/smsService.js';

// Subscribe to SMS updates
export const subscribe = async (req, res) => {
  try {
    const { phoneNumber, preferences, anonymousId } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    if (!anonymousId) {
      return res.status(400).json({ error: 'Anonymous ID is required for tracking subscriptions' });
    }
    
    const result = await smsService.subscribe(phoneNumber, preferences || {}, anonymousId);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in subscribe:', error);
    res.status(500).json({ error: 'Failed to subscribe to SMS updates' });
  }
};

// Send provider information via SMS
export const sendProviderInfo = async (req, res) => {
  try {
    const { phoneNumber, providerInfo } = req.body;
    
    if (!phoneNumber || !providerInfo) {
      return res.status(400).json({ error: 'Phone number and provider information are required' });
    }
    
    const result = await smsService.sendProviderInfo(phoneNumber, providerInfo);
    res.json(result);
  } catch (error) {
    console.error('Error in sendProviderInfo:', error);
    res.status(500).json({ error: 'Failed to send provider information via SMS' });
  }
};

// Admin only - send bulk SMS to subscribers
export const sendBulkSms = async (req, res) => {
  try {
    const { providerInfo, filter } = req.body;
    
    if (!providerInfo) {
      return res.status(400).json({ error: 'Provider information is required' });
    }
    
    const result = await smsService.sendBulkSms(providerInfo, filter || {});
    res.json(result);
  } catch (error) {
    console.error('Error in sendBulkSms:', error);
    res.status(500).json({ error: 'Failed to send bulk SMS messages' });
  }
};

// Get subscriptions by anonymousId
export const getSubscriptions = async (req, res) => {
  try {
    const { anonymousId } = req.params;
    
    if (!anonymousId) {
      return res.status(400).json({ error: 'Anonymous ID is required' });
    }
    
    const subscriptions = await smsService.getSubscriptionsByAnonymousId(anonymousId);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error in getSubscriptions:', error);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
};

// Unsubscribe from SMS updates
export const unsubscribe = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await smsService.unsubscribe(phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Error in unsubscribe:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from SMS updates' });
  }
};

// Webhook for Twilio incoming messages and status callbacks
export const twilioWebhook = async (req, res) => {
  try {
    console.log('Received Twilio webhook:', req.body);
    
    // Process different types of Twilio webhooks
    if (req.body.MessageStatus) {
      // This is a status update webhook
      const { MessageSid, MessageStatus, To } = req.body;
      
      console.log(`Message ${MessageSid} to ${To} status: ${MessageStatus}`);
      
      // Update message status in database if needed
      await smsService.updateMessageStatus(MessageSid, MessageStatus);
      
      return res.status(200).send();
    } else if (req.body.Body) {
      // This is an incoming message webhook
      const { From, Body, MessageSid } = req.body;
      
      console.log(`Received message from ${From}: ${Body}`);
      
      // Process the incoming message
      const response = await smsService.processIncomingMessage(From, Body, MessageSid);
      
      // If there's a response to be sent back
      if (response && response.message) {
        // Use TwiML to respond
        res.set('Content-Type', 'text/xml');
        return res.send(`
          <Response>
            <Message>${response.message}</Message>
          </Response>
        `);
      }
      
      return res.status(200).send();
    }
    
    // Default response for other webhook types
    res.status(200).send();
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    res.status(500).send();
  }
};
