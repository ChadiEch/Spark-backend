const axios = require('axios');

const testLoginAPI = async () => {
  try {
    console.log('Testing login API endpoint...');
    
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@company.com',
      password: 'AdminPass123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login API test successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.log('Login API test failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
      console.log('Headers:', error.response.headers);
    } else {
      console.log('Error:', error.message);
    }
  }
};

testLoginAPI();