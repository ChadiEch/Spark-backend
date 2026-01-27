const axios = require('axios');

const testConnect = async () => {
  try {
    // First login to get token
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:5002/api/auth/login', {
      email: 'chadiech18@gmail.com',
      password: 'Chadi123@'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');
    
    // Get integrations
    console.log('\nFetching integrations...');
    const integrationsRes = await axios.get('http://localhost:5002/api/integrations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const integrations = integrationsRes.data.data;
    console.log(`✅ Found ${integrations.length} integrations`);
    
    // Try to connect to Google Drive integration
    const integration = integrations.find(i => i.key === 'google-drive') || integrations[0];
    console.log(`\nConnecting to: ${integration.name} (${integration.key})`);
    
    const connectRes = await axios.post('http://localhost:5002/api/integrations/connect', {
      integrationId: integration._id
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Connect successful!');
    console.log('Response:', JSON.stringify(connectRes.data, null, 2));
    
    if (connectRes.data.data && connectRes.data.data.authUrl) {
      console.log('\n🔗 Authorization URL:');
      console.log(connectRes.data.data.authUrl);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
};

testConnect();
