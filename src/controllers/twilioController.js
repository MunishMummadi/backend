import smsService from '../services/smsService.js';
import deepSeekService from '../services/deepSeekService.js';

class TwilioController {
  // Handle incoming SMS messages (webhook from Twilio)
  async handleIncomingSms(req, res) {
    try {
      // Validate the request is from Twilio (in production, use proper signature validation)
      // For a full implementation, use Twilio's validateExpressRequest middleware
      
      // Extract data from the Twilio webhook request
      const { From: from, Body: body, MessageSid: messageSid } = req.body;
      
      if (!from || !body) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required parameters' 
        });
      }
      
      console.log(`Received SMS from ${from}: "${body}"`);
      
      // Process the incoming message
      const response = await smsService.processIncomingMessage(from, body, messageSid);
      
      // Send a response back to the user via Twilio's TwiML
      res.set('Content-Type', 'text/xml');
      
      // Only respond with a message if we want to reply to the user
      if (response.message) {
        res.send(`
          <Response>
            <Message>${response.message}</Message>
          </Response>
        `);
      } else {
        // Empty response if we don't want to reply
        res.send('<Response></Response>');
      }
      
      // Log processing outcome
      if (response.isAiGenerated) {
        console.log(`Sent AI-generated response to ${from}`);
      } else {
        console.log(`Sent standard response to ${from}`);
      }
    } catch (error) {
      console.error('Error handling incoming SMS:', error);
      
      // Send a generic error response
      res.set('Content-Type', 'text/xml');
      res.send(`
        <Response>
          <Message>Sorry, we encountered an error processing your message. Please try again later.</Message>
        </Response>
      `);
    }
  }
  
  // Handle message status updates (webhook from Twilio)
  async handleStatusCallback(req, res) {
    try {
      const { MessageSid, MessageStatus } = req.body;
      
      if (!MessageSid || !MessageStatus) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required parameters' 
        });
      }
      
      console.log(`Message ${MessageSid} status update: ${MessageStatus}`);
      
      // Update message status in our system
      await smsService.updateMessageStatus(MessageSid, MessageStatus);
      
      // Acknowledge receipt of status update
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling status callback:', error);
      res.status(500).send('Error processing status update');
    }
  }
  
  // Health check for SMS services
  async checkSmsServiceHealth(req, res) {
    try {
      const healthData = {
        twilio: {
          status: smsService.isConfigured() ? 'configured' : 'unconfigured',
          message: smsService.isConfigured() 
            ? 'Twilio client is properly configured'
            : 'Twilio client is not configured. Check environment variables.'
        }
      };
      
      // Check DeepSeek API health if available
      if (deepSeekService.isConfigured()) {
        const deepSeekHealth = await deepSeekService.checkHealth();
        healthData.deepSeek = deepSeekHealth;
      } else {
        healthData.deepSeek = {
          status: 'unconfigured',
          message: 'DeepSeek API is not configured. Check environment variables.'
        };
      }
      
      return res.status(200).json({
        success: true,
        health: healthData
      });
    } catch (error) {
      console.error('Error checking SMS service health:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking SMS service health',
        error: error.message
      });
    }
  }
  
  // Send a test message
  async sendTestMessage(req, res) {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and message are required'
        });
      }
      
      // Check if Twilio is configured
      if (!smsService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'SMS service is not configured'
        });
      }
      
      // Send the test message
      const result = await smsService.sendProviderInfo(phoneNumber, {
        name: 'Test Provider',
        address: '123 Test St, Test City, TS 12345',
        phone: '(555) 123-4567',
        rating: 4.8,
        website: 'https://example.com'
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error sending test message:', error);
      return res.status(500).json({
        success: false,
        message: 'Error sending test message',
        error: error.message
      });
    }
  }
}

export default new TwilioController();
