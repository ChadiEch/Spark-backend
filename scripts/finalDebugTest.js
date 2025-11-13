// Final debug test to simulate the exact frontend-backend interaction
const axios = require('axios');

async function finalDebugTest() {
  console.log('=== FINAL DEBUG TEST ===');
  console.log('Testing the exact flow that the frontend uses');
  
  try {
    // Clear any existing auth data
    console.log('\n1. Clearing existing auth data...');
    // In a real scenario, this would be localStorage.clear() in the browser
    
    // Test the exact API endpoint that the frontend calls
    console.log('\n2. Calling the exact login endpoint...');
    console.log('URL: http://localhost:5001/api/auth/login');
    console.log('Method: POST');
    console.log('Data:', { email: 'admin@company.com', password: 'AdminPass123!' });
    
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@company.com',
      password: 'AdminPass123!'
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      // This is important - the frontend might be sending these headers
      withCredentials: true
    });
    
    console.log('\n3. API Response received:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', response.headers);
    
    // This is the critical part - let's examine the response structure
    console.log('\n4. Response Data Structure:');
    console.log('Type of response.data:', typeof response.data);
    console.log('Keys in response.data:', response.data ? Object.keys(response.data) : 'N/A');
    
    if (response.data) {
      console.log('\nResponse.data content:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Check if it has the expected structure
      if (response.data.success !== undefined) {
        console.log('\n✓ Response has success field');
      } else {
        console.log('\n✗ Response missing success field');
      }
      
      if (response.data.token !== undefined) {
        console.log('✓ Response has token field (at root level)');
      } else {
        console.log('✗ Response missing token field (at root level)');
      }
      
      if (response.data.data !== undefined) {
        console.log('✓ Response has data field (nested structure)');
        console.log('Keys in response.data.data:', Object.keys(response.data.data));
        
        if (response.data.data.token !== undefined) {
          console.log('  ✓ response.data.data has token field');
        } else {
          console.log('  ✗ response.data.data missing token field');
        }
        
        if (response.data.data.user !== undefined) {
          console.log('  ✓ response.data.data has user field');
        } else {
          console.log('  ✗ response.data.data missing user field');
        }
      } else {
        console.log('✗ Response missing data field (no nested structure)');
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('If you see this, the backend API is working correctly.');
    console.log('The issue is likely in how the frontend handles this response.');
    
  } catch (error) {
    console.log('\n=== TEST FAILED ===');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Data:', error.response.data);
    } else if (error.request) {
      console.log('No response received:', error.message);
    } else {
      console.log('Error:', error.message);
    }
  }
}

finalDebugTest();