const axios = require('axios');

const testRegister = async () => {
  try {
    console.log('Testing registration endpoint...');
    
    const response = await axios.post('http://localhost:5002/api/auth/register', {
      name: 'Test User API New',
      email: 'testapinew@example.com',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Agent-Registration-Script'
      }
    });
    
    console.log('Registration successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Registration failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
      console.log('Headers:', error.response.headers);
    } else {
      console.log('Error:', error.message);
    }
  }
};

testRegister();