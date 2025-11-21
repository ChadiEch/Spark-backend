// Test script to verify token exchange with Google OAuth
const axios = require('axios');

console.log('=== GOOGLE OAUTH TOKEN EXCHANGE TEST ===\n');

// Test data (you would replace these with actual values)
const testData = {
  clientId: 'your_google_drive_client_id',
  clientSecret: 'your_google_drive_client_secret',
  redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
  code: 'test_authorization_code' // This would be a real code from OAuth flow
};

console.log('Test Configuration:');
console.log('==================');
console.log(`Client ID: ${testData.clientId}`);
console.log(`Client Secret: ${testData.clientSecret ? 'SET' : 'NOT SET'}`);
console.log(`Redirect URI: ${testData.redirectUri}`);
console.log(`Authorization Code: ${testData.code}\n`);

// Show the exact request that would be sent
console.log('Request that would be sent to Google:');
console.log('====================================');
console.log('POST https://oauth2.googleapis.com/token');
console.log('Content-Type: application/json');
console.log('Body:');
console.log(JSON.stringify({
  client_id: testData.clientId,
  client_secret: testData.clientSecret,
  redirect_uri: testData.redirectUri,
  grant_type: 'authorization_code',
  code: testData.code
}, null, 2));

console.log('\nExpected Response:');
console.log('=================');
console.log('{');
console.log('  "access_token": "ya29.a0AfH6SMC...",');
console.log('  "expires_in": 3599,');
console.log('  "refresh_token": "1//0e...",');
console.log('  "scope": "https://www.googleapis.com/auth/drive",');
console.log('  "token_type": "Bearer"');
console.log('}');

console.log('\nCommon Issues:');
console.log('=============');
console.log('1. Invalid client ID or secret');
console.log('2. Redirect URI mismatch');
console.log('3. Expired authorization code');
console.log('4. Insufficient scopes');
console.log('5. Google OAuth app not properly configured');

console.log('\nTo test with real data:');
console.log('=====================');
console.log('1. Get a real authorization code by visiting the authorization URL');
console.log('2. Replace the test values in this script with real values');
console.log('3. Uncomment the axios request below and run the script');

/*
// Uncomment to test with real data
(async () => {
  try {
    console.log('\nSending request to Google OAuth...');
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: testData.clientId,
      client_secret: testData.clientSecret,
      redirect_uri: testData.redirectUri,
      grant_type: 'authorization_code',
      code: testData.code
    });
    
    console.log('\nSuccess! Token response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\nError exchanging token:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
  }
})();
*/