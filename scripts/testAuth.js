const axios = require('axios');

const testAuth = async () => {
  try {
    console.log('Testing registration and login...');
    
    // Test registration
    console.log('\n1. Testing registration...');
    const registerResponse = await axios.post('http://localhost:5001/api/auth/register', {
      name: 'Test User Auth',
      email: 'testauth@example.com',
      password: 'TestPass123!',
      role: 'ADMIN'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Registration successful!');
    console.log('User:', registerResponse.data.user);
    console.log('Token:', registerResponse.data.token ? 'Received' : 'Not received');
    
    // Extract token for login test
    const token = registerResponse.data.token;
    
    // Test login
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'testauth@example.com',
      password: 'TestPass123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login successful!');
    console.log('User:', loginResponse.data.user);
    console.log('Token:', loginResponse.data.token ? 'Received' : 'Not received');
    
    console.log('\nAll tests passed!');
  } catch (error) {
    console.log('Test failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
};

testAuth();