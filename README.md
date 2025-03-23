# Healthspot Backend API

A backend service that helps users find healthcare providers, read and analyze reviews, and receive provider updates via SMS.

## Features

- **Provider Search**: Find nearby healthcare providers with custom filters
- **Review Analysis**: Get reviews from Google and synthetic Reddit discussions with sentiment analysis
- **SMS Notifications**: Subscribe to provider updates via Twilio SMS
- **Provider Saving**: Allow anonymous users to save their favorite providers

## Setup

### Prerequisites

- Node.js 16+ and npm
- Google Maps API key
- OpenAI/DeepSeek API key
- Twilio account (for SMS functionality)

### Database Setup

The application uses SQLite with Sequelize ORM, which requires minimal setup:

1. The database file will be automatically created in the project directory
2. Models will be automatically synchronized with the database on startup

### Environment Variables

Create a `.env` file with the following variables:

```
# Server Configuration
PORT=3000

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# OpenAI/DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

### Providers

- `GET /api/providers` - Find healthcare providers near a location
  - Query parameters: `lat`, `lng`, `type`, `specialty`, `radius`, `insurance`, `anonymousId`
- `GET /api/providers/:id` - Get detailed information about a provider

### Reviews

- `GET /api/reviews/google/:providerId` - Get Google reviews for a provider
- `GET /api/reviews/reddit/:providerId` - Get synthetic Reddit discussions about a provider
- `GET /api/reviews/analysis/:providerId` - Get AI analysis of provider reviews

### SMS Subscriptions

- `POST /api/sms/subscribe` - Subscribe to SMS updates about providers
  - Body: `{ phoneNumber, preferences, anonymousId }`
- `POST /api/sms/send` - Send provider information via SMS
  - Body: `{ phoneNumber, providerInfo }`
- `GET /api/sms/subscriptions/:anonymousId` - Get subscriptions for an anonymous user
- `DELETE /api/sms/unsubscribe/:phoneNumber` - Unsubscribe from SMS updates

### Saved Providers

- `POST /api/saved` - Save a provider for an anonymous user
  - Body: `{ providerId }`
- `GET /api/saved` - Get saved providers for the current anonymous user
- `DELETE /api/saved/:providerId` - Remove a provider from saved list

## Models

### Provider
- Stores healthcare provider information fetched from Google Maps API

### Review
- Stores reviews for providers from both Google and synthetic Reddit sources

### SmsSubscription
- Manages user subscriptions for SMS updates about providers

### SavedProvider
- Tracks providers saved by anonymous users via cookies

## Technology Stack

- **Framework**: Express.js
- **Database**: SQLite
- **ORM**: Sequelize
- **External APIs**: Google Maps, OpenAI/DeepSeek, Twilio
- **Authentication**: Anonymous tracking via cookies

## Deployment Options

This application can be deployed to various platforms:

### Render

1. Create a new Web Service
2. Connect your repository
3. Set the build command: `npm install`
4. Set the start command: `npm start`
5. Add environment variables

### Railway

1. Connect your repository
2. Set environment variables
3. Railway will automatically detect Node.js and deploy

### AWS Elastic Beanstalk

1. Create a new application
2. Create a new environment (Web server environment)
3. Select Node.js platform
4. Upload your code as a .zip file
5. Add environment variables under Configuration > Software

## License

MIT
