import axios from 'axios';

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
    this.model = 'deepseek-chat'; // Default model, can be configured
  }

  // Check if DeepSeek API is configured
  isConfigured() {
    return !!this.apiKey;
  }

  // Generate a response using DeepSeek API
  async generateResponse(userMessage, context = {}) {
    if (!this.isConfigured()) {
      throw new Error('DeepSeek API is not configured');
    }

    try {
      // Construct system message with HealthSpot context
      const systemPrompt = `You are HealthSpot's AI assistant, helping users with healthcare provider questions via SMS.
Keep responses under 160 characters whenever possible to fit in a single SMS.
If the message doesn't seem related to healthcare, provide a friendly response directing the user back to healthcare topics.
Avoid using emojis or special characters that might not render well in SMS.`;

      // Construct the conversation history
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      // Add context if available
      if (context.previousMessages && context.previousMessages.length > 0) {
        // Insert previous messages before the current user message
        messages.splice(1, 0, ...context.previousMessages);
      }

      // Make API request
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.model,
          messages: messages,
          max_tokens: 300,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      // Extract and return the generated response
      const assistantResponse = response.data.choices[0]?.message?.content || 
        'Sorry, I could not generate a response at this time. Please try again later.';
      
      return {
        success: true,
        message: assistantResponse,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('Error generating response from DeepSeek API:', error);
      
      // Provide a fallback response
      return {
        success: false,
        message: 'Sorry, we encountered an issue processing your message. Please try again later or contact support.',
        error: error.message
      };
    }
  }

  // Check health/status of the DeepSeek API connection
  async checkHealth() {
    if (!this.isConfigured()) {
      return { status: 'unconfigured', message: 'DeepSeek API key is not configured' };
    }

    try {
      // Simple health check request
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello' }
          ],
          max_tokens: 5,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return { 
        status: 'healthy', 
        message: 'DeepSeek API connection is working properly',
        modelInfo: response.data.model
      };
    } catch (error) {
      console.error('DeepSeek API health check failed:', error);
      return { 
        status: 'error', 
        message: 'Failed to connect to DeepSeek API', 
        error: error.message 
      };
    }
  }
}

export default new DeepSeekService();
