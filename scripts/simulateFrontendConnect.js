// Script to simulate frontend connecting to Google Drive integration
const axios = require('axios');

console.log('=== SIMULATING FRONTEND CONNECT REQUEST ===\n');

// This is what the frontend would send to the backend
const connectRequest = {
  integrationId: 'google-drive', // Could also be the ObjectId
  // Note: Frontend might not always send redirectUri, letting backend use the one from DB
};

console.log('Frontend request to backend:');
console.log('POST /api/integrations/connect');
console.log('Body:', JSON.stringify(connectRequest, null, 2));

console.log('\nSimulating backend processing...\n');

// Let's also test what happens when frontend sends redirectUri
const connectRequestWithRedirect = {
  integrationId: 'google-drive',
  redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback'
};

console.log('Alternative frontend request (with redirectUri):');
console.log('POST /api/integrations/connect');
console.log('Body:', JSON.stringify(connectRequestWithRedirect, null, 2));

console.log('\n=== TESTING ACTUAL BACKEND CALL ===\n');

// Test actual backend call
(async () => {
  try {
    console.log('Making actual call to backend...');
    
    // Use localhost since we're testing locally
    const response = await axios.post('http://localhost:5001/api/integrations/connect', connectRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\nBackend response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.authorizationUrl) {
      console.log('\nAuthorization URL from backend:');
      console.log(response.data.data.authorizationUrl);
      
      // Parse the redirect_uri from the URL
      const url = new URL(response.data.data.authorizationUrl);
      const redirectUri = url.searchParams.get('redirect_uri');
      if (redirectUri) {
        const decodedRedirectUri = decodeURIComponent(redirectUri);
        console.log('\nDecoded redirect_uri from authorization URL:');
        console.log(decodedRedirectUri);
      }
    }
  } catch (error) {
    console.error('\nError calling backend:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
})();