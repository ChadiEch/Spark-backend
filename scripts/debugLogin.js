const axios = require('axios');

const debugLogin = async () => {
  try {
    console.log('Testing login API endpoint with detailed debugging...');
    
    // First, let's check if the server is running
    try {
      const statusResponse = await axios.get('http://localhost:5001/api/status');
      console.log('Server status check:', statusResponse.status);
    } catch (error) {
      console.log('Server status check failed:', error.message);
    }
    
    // Now let's try the login
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@company.com',
      password: 'AdminPass123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Add timeout for debugging
      timeout: 10000
    });
    
    console.log('Login API test successful!');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Check if we have the expected fields
    if (response.data && response.data.data) {
      console.log('Data structure is correct');
      if (response.data.data.token) {
        console.log('Token received');
      } else {
        console.log('No token in response');
      }
      
      if (response.data.data.user) {
        console.log('User data received');
        console.log('User ID:', response.data.data.user.id || response.data.data.user._id);
      } else {
        console.log('No user data in response');
      }
    } else {
      console.log('Unexpected data structure');
    }
  } catch (error) {
    console.log('Login API test failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received:', error.message);
    } else {
      console.log('Error:', error.message);
    }
  }
};

debugLogin();