// Script to check redirect URI encoding issues
console.log('=== CHECKING REDIRECT URI ENCODING ===\n');

// The redirect URI from our database/GCP
const redirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';

console.log('Original redirect URI:');
console.log(redirectUri);

// Check different encoding variations that Google might expect
console.log('\n=== ENCODING VARIATIONS ===');

const encodedUri = encodeURIComponent(redirectUri);
console.log('encodeURIComponent():');
console.log(encodedUri);

// Check if there are any special characters that might cause issues
console.log('\n=== SPECIAL CHARACTER ANALYSIS ===');
for (let i = 0; i < redirectUri.length; i++) {
  const char = redirectUri[i];
  const code = char.charCodeAt(0);
  if (code < 32 || code > 126 || char === '%' || char === '&' || char === '=' || char === '+' || char === '#') {
    console.log(`Special character at position ${i}: '${char}' (code: ${code})`);
  }
}

// Check for common encoding issues
console.log('\n=== COMMON ENCODING ISSUES ===');
const issues = [];

// Check for trailing whitespace
if (redirectUri !== redirectUri.trim()) {
  issues.push('Contains leading/trailing whitespace');
}

// Check for multiple slashes
if (redirectUri.includes('//') && !redirectUri.startsWith('https://') && !redirectUri.startsWith('http://')) {
  issues.push('Contains unexpected double slashes');
}

// Check for mixed case (though URLs should be case-sensitive for the path part)
const lowerUri = redirectUri.toLowerCase();
if (redirectUri !== lowerUri) {
  // This isn't necessarily an issue, but worth noting
  console.log('Note: URI contains uppercase characters (not necessarily an issue for domain, but paths are case-sensitive)');
}

if (issues.length === 0) {
  console.log('No obvious encoding issues detected');
} else {
  console.log('Potential issues found:');
  issues.forEach(issue => console.log(`  - ${issue}`));
}

// Compare with what we know works in other OAuth providers
console.log('\n=== COMPARISON WITH OTHER INTEGRATIONS ===');
console.log('Other integrations in the system use the same redirect URI:');
console.log('- Facebook');
console.log('- Instagram');
console.log('- TikTok');
console.log('- YouTube');
console.log('All use: https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');

// Check if the issue might be related to the state parameter
console.log('\n=== STATE PARAMETER ANALYSIS ===');
const sampleState = JSON.stringify({
  integrationId: '6920032786df291bc118aa1f',
  userId: '6920032786df291bc118aa1f'
});

console.log('Sample state parameter:');
console.log(sampleState);

const encodedState = encodeURIComponent(sampleState);
console.log('\nEncoded state parameter:');
console.log(encodedState);

// Check if state parameter encoding might cause issues
if (encodedState.includes('%')) {
  console.log('\nNote: State parameter contains encoded characters, which is normal');
}

console.log('\n=== GOOGLE OAUTH SPECIFIC CONSIDERATIONS ===');
console.log('1. Google OAuth is strict about exact string matching');
console.log('2. Even a single character difference will cause a mismatch');
console.log('3. Encoding must be consistent between registration and usage');
console.log('4. The redirect_uri parameter must match exactly what\'s registered in GCP');

console.log('\n=== DEBUGGING RECOMMENDATIONS ===');
console.log('1. Verify the EXACT string in Google Cloud Console:');
console.log('   - No extra spaces before or after');
console.log('   - No invisible Unicode characters');
console.log('   - Exactly: https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');

console.log('\n2. Try registering the redirect URI with a trailing slash:');
console.log('   - https://spark-backend-production-ab14.up.railway.app/api/integrations/callback/');

console.log('\n3. Check if there are multiple redirect URIs registered:');
console.log('   - Google allows multiple URIs, make sure the correct one is being used');

console.log('\n4. Try creating a completely new OAuth client ID with just this redirect URI');

console.log('\n✅ From our analysis, the redirect URI encoding looks correct.');
console.log('The issue is likely in the Google Cloud Console configuration or a subtle mismatch.');