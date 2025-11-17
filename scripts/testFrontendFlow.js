const axios = require('axios');

// Test the frontend flow
const testFrontendFlow = async () => {
  try {
    console.log('=== TESTING FRONTEND FLOW ===\n');
    
    // Simulate what the frontend sends to the backend
    const requestData = {
      integrationId: '69184f9a41fbede3df957bad', // Google Drive integration ID
      code: 'TEST_CODE_12345', // This would be the OAuth code from Google
      redirectUri: 'https://spark-frontend-production.up.railway.app/integrations/callback',
      userId: '6916ede023a4625ca577da28' // User ID from the state
    };
    
    console.log('Sending request to backend with data:', requestData);
    
    // Make the API call
    const response = await axios.post('http://localhost:5001/api/integrations/exchange', requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\nSUCCESS: API call completed');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('\nERROR: API call failed');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  console.log('\n=== TEST COMPLETE ===');
};

testFrontendFlow();