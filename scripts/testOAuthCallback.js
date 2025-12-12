// Script to test OAuth callback handling
const axios = require('axios');

console.log('=== TESTING OAUTH CALLBACK HANDLING ===\n');

// Test what happens when Google redirects back to our callback URL
// This simulates the callback that Google would make after user authorization

const testCallbackUrl = 'http://localhost:5001/api/integrations/callback';

console.log('Testing OAuth callback endpoint:', testCallbackUrl);
console.log('');

// Test with minimal parameters (this would fail but let's see the response)
console.log('1. Testing with minimal parameters:');
(async () => {
  try {
    const response = await axios.get(testCallbackUrl, {
      params: {
        code: 'test_code',
        state: encodeURIComponent(JSON.stringify({
          integrationId: 'google-drive',
          userId: 'test_user_id'
        }))
      }
    });
    
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Error status:', error.response?.status);
    console.log('   Error data:', JSON.stringify(error.response?.data, null, 2));
  }
})();

// Test with redirect_uri parameter (this is what might be causing issues)
console.log('\n2. Testing with redirect_uri parameter:');
(async () => {
  try {
    const response = await axios.get(testCallbackUrl, {
      params: {
        code: 'test_code',
        state: encodeURIComponent(JSON.stringify({
          integrationId: 'google-drive',
          userId: 'test_user_id'
        })),
        redirect_uri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback'
      }
    });
    
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Error status:', error.response?.status);
    console.log('   Error data:', JSON.stringify(error.response?.data, null, 2));
  }
})();

console.log('\n=== NOTES ===');
console.log('In a real OAuth flow:');
console.log('1. User visits Google authorization URL');
console.log('2. User grants permission');
console.log('3. Google redirects to our callback URL with code and state parameters');
console.log('4. Our backend exchanges the code for tokens using the same redirect_uri');
console.log('5. Tokens are stored and user is redirected to frontend');