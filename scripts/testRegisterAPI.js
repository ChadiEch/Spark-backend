const axios = require('axios');

async function testRegisterAPI() {
  console.log('=== TESTING REGISTER API ===');
  
  try {
    const response = await axios.post('http://localhost:5001/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPass123!',
      role: 'ADMIN'
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Register API Response:');
    console.log('Status:', response.status);
    console.log('Data structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('Register API Error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testRegisterAPI();