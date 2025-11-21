// Script to debug OAuth requests by simulating what happens in the browser
console.log('=== OAUTH REQUEST DEBUGGER ===\n');

// Simulate what the frontend sends to the backend
console.log('1. FRONTEND REQUEST TO BACKEND:');
console.log('==============================');

// This is what the frontend should be sending
const frontendRequest = {
  integrationId: '6920032786df291bc118aa1f', // Google Drive integration ID
  // Note: Frontend might not send redirectUri, letting backend use the one from DB
};

console.log('POST /api/integrations/connect');
console.log('Body:', JSON.stringify(frontendRequest, null, 2));

console.log('\n2. BACKEND PROCESSING:');
console.log('====================');

// This is what the backend controller does
const backendProcessing = {
  integrationId: frontendRequest.integrationId,
  // Backend looks up integration in DB
  databaseIntegration: {
    _id: '6920032786df291bc118aa1f',
    name: 'Google Drive',
    key: 'google-drive',
    redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
    clientId: 'your_google_drive_client_id',
    clientSecret: 'your_google_drive_client_secret',
    scopes: ['https://www.googleapis.com/auth/drive']
  },
  // Backend uses redirectUri from DB or a default
  redirectUriToUse: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
  state: JSON.stringify({
    integrationId: '6920032786df291bc118aa1f',
    userId: 'debug_user_id' // Would come from session in real flow
  })
};

console.log('Found integration in database');
console.log('Using redirect URI:', backendProcessing.redirectUriToUse);
console.log('State parameter:', backendProcessing.state);

console.log('\n3. GENERATED AUTHORIZATION URL:');
console.log('==============================');

// Generate the exact URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${backendProcessing.databaseIntegration.clientId}&` +
  `redirect_uri=${encodeURIComponent(backendProcessing.redirectUriToUse)}&` +
  `scope=${encodeURIComponent(backendProcessing.databaseIntegration.scopes.join(' '))}&` +
  `response_type=code&` +
  `access_type=offline&` +
  `prompt=consent&` +
  `state=${encodeURIComponent(backendProcessing.state)}`;

console.log('Full URL:');
console.log(authUrl);

console.log('\n4. WHAT THE BROWSER RECEIVES:');
console.log('============================');

console.log('HTTP 200 OK');
console.log('Content-Type: application/json');
console.log('Body:');
console.log(JSON.stringify({
  success: true,
  data: {
    authorizationUrl: authUrl
  }
}, null, 2));

console.log('\n5. WHAT THE BROWSER DOES:');
console.log('========================');

console.log('window.location.href = authorizationUrl');
console.log('(Redirects to Google OAuth)');

console.log('\n6. GOOGLE OAUTH FLOW:');
console.log('====================');

console.log('User visits:', authUrl.split('?')[0]);
console.log('With parameters:');
const params = new URLSearchParams(authUrl.split('?')[1]);
for (const [key, value] of params) {
  if (key === 'redirect_uri') {
    console.log(`  ${key}: ${decodeURIComponent(value)}`);
  } else if (key === 'state') {
    console.log(`  ${key}: ${decodeURIComponent(value)}`);
  } else {
    console.log(`  ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
  }
}

console.log('\n7. POTENTIAL ISSUES TO CHECK:');
console.log('============================');

console.log('1. Is your Google OAuth app in "Testing" mode?');
console.log('   - If so, only test users can authenticate');
console.log('   - Publish the app to allow all users');

console.log('\n2. Are you using the correct Google Cloud project?');
console.log('   - Make sure you\'re looking at the right project in Google Console');

console.log('\n3. Is there a proxy or CDN interfering?');
console.log('   - Railway might be adding some headers or modifying requests');

console.log('\n4. Browser extensions interference:');
console.log('   - Try in incognito mode with all extensions disabled');

console.log('\n5. Time synchronization issues:');
console.log('   - Make sure your system clock is accurate');

console.log('\n6. Multiple OAuth apps:');
console.log('   - Make sure you\'re not accidentally using a different OAuth client ID');

console.log('\n8. DEBUGGING STEPS:');
console.log('==================');

console.log('1. Copy the authorization URL above and paste it directly in your browser');
console.log('2. See if you get the same error');
console.log('3. If not, the issue is in how the frontend is calling the backend');
console.log('4. If yes, the issue is definitely with the Google OAuth configuration');

console.log('\nAuthorization URL for direct testing:');
console.log(authUrl);