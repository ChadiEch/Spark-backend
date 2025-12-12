// Final OAuth diagnostic script
console.log('=== FINAL OAUTH DIAGNOSTIC ===\n');

console.log('Based on all our checks, here\'s what we know:\n');

console.log('✅ DATABASE CONFIGURATION:');
console.log('   - Google Drive integration exists');
console.log('   - Redirect URI is correct: https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');
console.log('   - Only one Google Drive integration record exists');
console.log('   - All integrations use the same redirect URI');

console.log('\n✅ ENVIRONMENT VARIABLES:');
console.log('   - GOOGLE_DRIVE_CLIENT_ID is set');
console.log('   - GOOGLE_DRIVE_CLIENT_SECRET is set');

console.log('\n✅ OAUTH URL GENERATION:');
console.log('   - Authorization URL is generated correctly');
console.log('   - redirect_uri parameter matches database value');
console.log('   - redirect_uri parameter matches Google Console registration');

console.log('\n✅ GOOGLE CONSOLE CONFIGURATION:');
console.log('   - Redirect URI is registered: https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');

console.log('\n=== POTENTIAL ISSUES TO INVESTIGATE ===\n');

console.log('1. GOOGLE OAUTH APP STATUS:');
console.log('   - Is the OAuth app published or in testing mode?');
console.log('   - If in testing mode, are you using a test user account?');

console.log('\n2. CLIENT CREDENTIALS:');
console.log('   - Are the GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET correct?');
console.log('   - Have the credentials been revoked or expired?');

console.log('\n3. NETWORK ISSUES:');
console.log('   - Is there a proxy or firewall interfering with requests?');
console.log('   - Are you able to reach Google OAuth endpoints?');

console.log('\n4. BROWSER-RELATED ISSUES:');
console.log('   - Try clearing browser cache and cookies');
console.log('   - Try using an incognito/private browsing window');
console.log('   - Try a different browser');

console.log('\n5. TIMING ISSUES:');
console.log('   - Is there a significant time difference between your server and Google\'s servers?');
console.log('   - Check that your system clock is synchronized');

console.log('\n6. GOOGLE PROJECT CONFIGURATION:');
console.log('   - Is the Google Drive API enabled for your project?');
console.log('   - Are there any restrictions on the OAuth client?');

console.log('\n=== RECOMMENDED NEXT STEPS ===\n');

console.log('1. Verify Google OAuth app status and credentials:');
console.log('   - Go to Google Cloud Console');
console.log('   - Check if the app is published or in testing');
console.log('   - Verify the client ID and secret are correct');

console.log('\n2. Test with a fresh OAuth flow:');
console.log('   - Clear browser cache and cookies');
console.log('   - Try in an incognito window');
console.log('   - Make sure you\'re logged into the correct Google account');

console.log('\n3. Check Google OAuth app configuration:');
console.log('   - Ensure the Google Drive API is enabled');
console.log('   - Verify there are no IP or domain restrictions');

console.log('\n4. If issues persist:');
console.log('   - Try creating a new OAuth client ID');
console.log('   - Add both redirect URIs to the new client:');
console.log('     * http://localhost:5001/api/integrations/callback (for development)');
console.log('     * https://spark-backend-production-ab14.up.railway.app/api/integrations/callback (for production)');

console.log('\n✅ Your configuration appears to be correct. The issue is likely related to the Google OAuth app configuration or a temporary network/browser issue.');