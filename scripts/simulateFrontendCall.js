const axios = require('axios');

// Simulate the frontend making a call to the exchange endpoint
const simulateFrontendCall = async () => {
  try {
    console.log('=== SIMULATING FRONTEND CALL ===\n');
    
    // This is what the frontend sends to the backend
    const requestData = {
      integrationId: '69184f9a41fbede3df957bad', // Google Drive integration ID
      code: 'TEST_CODE_12345', // This would be the OAuth code from Google
      redirectUri: 'http://localhost:5173/integrations/callback',
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
    
    // Let's also try without userId to see if that's the issue
    console.log('\n=== TRYING WITHOUT USER ID ===');
    try {
      const requestDataWithoutUserId = {
        integrationId: '69184f9a41fbede3df957bad',
        code: 'TEST_CODE_12345',
        redirectUri: 'http://localhost:5173/integrations/callback'
        // No userId
      };
      
      console.log('Sending request without userId:', requestDataWithoutUserId);
      
      const response = await axios.post('http://localhost:5001/api/integrations/exchange', requestDataWithoutUserId, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('\nSUCCESS: API call completed without userId');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
    } catch (error2) {
      console.error('\nERROR: API call without userId also failed');
      console.error('Error message:', error2.message);
      
      if (error2.response) {
        console.error('Response status:', error2.response.status);
        console.error('Response data:', error2.response.data);
      }
    }
  }
  
  console.log('\n=== SIMULATION COMPLETE ===');
};

simulateFrontendCall();