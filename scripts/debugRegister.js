const axios = require('axios');

const debugRegister = async () => {
  try {
    console.log('Debugging registration process...');
    
    // Test registration with detailed logging
    console.log('\n1. Sending registration request...');
    const requestData = {
      name: 'Debug User',
      email: 'debug@example.com',
      password: 'DebugPass123!',
      role: 'ADMIN'
    };
    
    console.log('Request data:', requestData);
    
    const response = await axios.post('http://localhost:5001/api/auth/register', requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n2. Registration response:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', response.headers);
    console.log('Data:', response.data);
    
    if (response.data && response.data.success) {
      console.log('\nRegistration successful!');
      console.log('User:', response.data.user);
      console.log('Token present:', !!response.data.token);
    } else {
      console.log('\nRegistration failed!');
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.log('\nRegistration error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Headers:', error.response.headers);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error message:', error.message);
      console.log('Error code:', error.code);
    }
  }
};

debugRegister();