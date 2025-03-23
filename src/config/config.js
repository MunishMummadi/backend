// Configuration file
import dotenv from 'dotenv';

dotenv.config();

export default {
  port: process.env.PORT || 3000,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthspot'
  },
  cookieSecret: process.env.COOKIE_SECRET || 'healthspot-secret',
  // Configurable parameters
  searchRadius: 5000, // Default search radius in meters
  defaultProviderType: 'hospital',
  maxResultsPerRequest: 50
};
