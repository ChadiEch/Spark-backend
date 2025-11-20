# Integration Setup Guide

This guide will help you set up and configure integrations with third-party services.

## OAuth Provider Configuration

### 1. Facebook/Instagram
1. Go to [Facebook Developer Portal](https://developers.facebook.com/)
2. Create a new app
3. Add the Facebook Login product
4. Set the OAuth redirect URI to: `http://localhost:5001/api/integrations/callback`
5. Copy the App ID and App Secret to your `.env` file

### 2. TikTok
1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Create a new app
3. Set the OAuth redirect URI to: `http://localhost:5001/api/integrations/callback`
4. Copy the Client Key and Client Secret to your `.env` file

### 3. Google Drive/YouTube
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3 and Google Drive API
4. Create OAuth 2.0 credentials
5. Set the OAuth redirect URIs to:
   - `http://localhost:5001/api/integrations/callback`
   - `https://spark-backend-production-ab14.up.railway.app/api/integrations/callback`
6. Copy the Client ID and Client Secret to your `.env` file

## Environment Variables

All integration credentials are stored as environment variables in the `.env` file. Never commit actual credentials to version control.

### Required Environment Variables

```env
# Integration Credentials
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
GOOGLE_DRIVE_CLIENT_ID=your_google_drive_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_drive_client_secret
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# Token Encryption
TOKEN_ENCRYPTION_KEY=your_32_byte_base64_encoded_encryption_key_here
```

## Setting Up Integrations

### 1. Generate Encryption Key

Run the following command to generate a secure encryption key:

```bash
npm run generate-encryption-key
```

Add the generated key to your `.env` file as `TOKEN_ENCRYPTION_KEY`.

### 2. Configure Third-Party Applications

For each integration, you'll need to create an application in the respective developer portal:

#### Facebook/Instagram
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add the Facebook Login product
4. Set the OAuth redirect URI to: `http://localhost:5001/api/integrations/callback`
5. Copy the App ID and App Secret to your `.env` file

#### TikTok
1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Create a new app
3. Set the OAuth redirect URI to: `http://localhost:5001/api/integrations/callback`
4. Copy the Client Key and Client Secret to your `.env` file

#### Google Drive/YouTube
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3 and Google Drive API
4. Create OAuth 2.0 credentials
5. Set the OAuth redirect URIs to:
   - `http://localhost:5001/api/integrations/callback`
   - `https://spark-backend-production-ab14.up.railway.app/api/integrations/callback`
6. Copy the Client ID and Client Secret to your `.env` file

### 3. Initialize Integrations

Run the following command to initialize the integrations in the database:

```bash
npm run init-integrations
```

This will create entries in the database for each integration with the credentials from your `.env` file.

## Testing Integrations

### Validate Environment Variables

Run the validation script to ensure all required environment variables are set:

```bash
npm run validate-env
```

### Test Integration Connections

Run the integration test script to check the status of integrations:

```bash
npm run test-integrations
```

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment-specific credentials** for development, staging, and production
3. **Regularly rotate credentials** and update them in the `.env` file
4. **Monitor integration usage** through the admin dashboard
5. **Review permissions** granted to each integration regularly

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**: Ensure all variables in the `.env` file are set
2. **"Invalid client credentials"**: Verify the client ID and secret are correct
3. **"Redirect URI mismatch"**: Ensure the redirect URI in your application matches the one in the code
4. **"Token refresh failed"**: The refresh token may have expired; reconnect the integration

### Debugging OAuth Flow

1. Check the server logs for detailed error messages
2. Verify the OAuth redirect URI matches exactly
3. Ensure the client credentials are correct
4. Check that the integration is enabled in the database

## Integration Monitoring

The system automatically monitors integration connections every 30 minutes and attempts to refresh tokens before they expire. You can check the status of integrations through the admin dashboard or by running:

```bash
npm run test-integrations
```