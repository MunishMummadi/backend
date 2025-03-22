# Medical Facility Locator API

A backend service that helps users find medical facilities, get AI-generated feedback, and send information via SMS.

## Features

- **Google Maps Integration**: Find nearby medical facilities with custom filters (type, specialty, price range)
- **AI-Powered Feedback**: Generate insights about medical facilities using DeepSeek AI
- **SMS Notifications**: Send facility information via Twilio SMS
- **Search History**: Store and retrieve user search history with Supabase

## Setup

### Prerequisites

- Node.js 16+ and npm
- Supabase account
- Google Maps API key
- DeepSeek API key
- Twilio account

### Database Setup

In your Supabase project, create the following table:

```sql
CREATE TABLE search_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  search_params JSONB NOT NULL,
  result_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);

-- Create index for faster user history retrieval
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
```

### Environment Variables

Create a `.env` file with the following variables:

```
# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key

# Supabase
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
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

### Facilities

- `GET /api/facilities` - Find medical facilities near a location
  - Query parameters: `lat`, `lng`, `type`, `speciality`, `priceRange`, `userId`

### AI Feedback

- `GET /api/facility/feedback/:facilityName` - Get AI-generated feedback about a facility

### SMS Notifications

- `POST /api/send-sms` - Send facility information via SMS
  - Body: `{ phoneNumber, facilityInfo }`

### Search History

- `GET /api/history/:userId` - Get search history for a user
- `GET /api/history/:searchId/results` - Get detailed results for a specific historical search
- `DELETE /api/history/:userId` - Clear search history for a user

## Deployment Options

This application can be deployed to various platforms:

### Render

1. Create a new Web Service
2. Connect your repository
3. Set the build command: `npm install`
4. Set the start command: `npm start`
5. Add environment variables

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Add environment variables in the Vercel dashboard

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
