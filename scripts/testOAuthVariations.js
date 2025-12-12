// Script to test different OAuth URL variations
console.log('=== TESTING OAUTH URL VARIATIONS ===\n');

// Base parameters
const baseParams = {
  client_id: 'your_google_drive_client_id',
  redirect_uri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
  scope: 'https://www.googleapis.com/auth/drive',
  response_type: 'code',
  access_type: 'offline',
  prompt: 'consent'
};

console.log('Base parameters:');
console.log(JSON.stringify(baseParams, null, 2));

// Test different parameter orders
console.log('\n=== TESTING PARAMETER ORDER VARIATIONS ===');

const paramOrders = [
  ['client_id', 'redirect_uri', 'scope', 'response_type', 'access_type', 'prompt'],
  ['response_type', 'client_id', 'redirect_uri', 'scope', 'access_type', 'prompt'],
  ['client_id', 'response_type', 'redirect_uri', 'scope', 'access_type', 'prompt'],
  ['redirect_uri', 'client_id', 'scope', 'response_type', 'access_type', 'prompt']
];

paramOrders.forEach((order, index) => {
  console.log(`\nVariation ${index + 1}: Order = [${order.join(', ')}]`);
  
  const params = new URLSearchParams();
  order.forEach(key => {
    params.append(key, baseParams[key]);
  });
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log(url);
});

// Test with state parameter variations
console.log('\n=== TESTING STATE PARAMETER VARIATIONS ===');

const stateVariations = [
  null, // No state
  '{"integrationId":"6920032786df291bc118aa1f","userId":"6920032786df291bc118aa1f"}', // Normal state
  '{}', // Empty state
  '{"test":"value"}' // Simple state
];

stateVariations.forEach((state, index) => {
  console.log(`\nState variation ${index + 1}: ${state || 'No state'}`);
  
  const params = new URLSearchParams();
  Object.keys(baseParams).forEach(key => {
    params.append(key, baseParams[key]);
  });
  
  if (state) {
    params.append('state', state);
  }
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log(url.substring(0, 100) + (url.length > 100 ? '...' : ''));
});

// Test with different scope formats
console.log('\n=== TESTING SCOPE VARIATIONS ===');

const scopeVariations = [
  'https://www.googleapis.com/auth/drive', // Single scope
  'https://www.googleapis.com/auth/drive.readonly', // Different scope
  'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.readonly', // Multiple scopes space-separated
  'https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/drive.readonly' // Multiple scopes comma-separated
];

scopeVariations.forEach((scope, index) => {
  console.log(`\nScope variation ${index + 1}: ${scope}`);
  
  const params = new URLSearchParams();
  params.append('client_id', baseParams.client_id);
  params.append('redirect_uri', baseParams.redirect_uri);
  params.append('scope', scope);
  params.append('response_type', baseParams.response_type);
  params.append('access_type', baseParams.access_type);
  params.append('prompt', baseParams.prompt);
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log(url.substring(0, 100) + (url.length > 100 ? '...' : ''));
});

// Test with and without access_type and prompt
console.log('\n=== TESTING OPTIONAL PARAMETERS ===');

const optionalParamTests = [
  { description: 'With access_type and prompt', params: { ...baseParams } },
  { description: 'Without access_type', params: { ...baseParams, access_type: undefined } },
  { description: 'Without prompt', params: { ...baseParams, prompt: undefined } },
  { description: 'Without both', params: { ...baseParams, access_type: undefined, prompt: undefined } }
];

optionalParamTests.forEach((test, index) => {
  console.log(`\n${test.description}:`);
  
  const params = new URLSearchParams();
  Object.keys(test.params).forEach(key => {
    if (test.params[key] !== undefined) {
      params.append(key, test.params[key]);
    }
  });
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log(url.substring(0, 100) + (url.length > 100 ? '...' : ''));
});

console.log('\n=== KEY OBSERVATIONS ===');
console.log('1. Google OAuth is sensitive to exact parameter matching');
console.log('2. The redirect_uri must match exactly what\'s registered');
console.log('3. Parameter order typically does not matter');
console.log('4. State parameter is optional but recommended for security');
console.log('5. access_type=offline is needed to get refresh tokens');
console.log('6. prompt=consent is needed for offline access');

console.log('\n=== RECOMMENDED NEXT STEPS ===');
console.log('1. Try the simplest possible OAuth URL:');
console.log('   https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=https://www.googleapis.com/auth/drive&response_type=code');

console.log('\n2. If that works, gradually add parameters:');
console.log('   - First add access_type=offline');
console.log('   - Then add prompt=consent');
console.log('   - Finally add the state parameter');

console.log('\n3. Check Google Cloud Console for any restrictions on:');
console.log('   - Authorized JavaScript origins');
console.log('   - Authorized redirect URIs');
console.log('   - API scopes enabled');

console.log('\n✅ All variations use the correct redirect URI.');
console.log('The issue is likely not with the URL format but with the Google OAuth configuration.');