// Script to provide a checklist for Google Cloud Console configuration
console.log('=== GOOGLE CLOUD CONSOLE CONFIGURATION CHECKLIST ===\n');

console.log('Please verify each of these items in your Google Cloud Console:\n');

console.log('✅ 1. PROJECT SETUP');
console.log('   □ Google Cloud Project exists');
console.log('   □ Google Drive API is enabled for the project');
console.log('   □ You\'re logged into the correct Google account');

console.log('\n✅ 2. OAUTH CLIENT ID CONFIGURATION');
console.log('   □ Navigate to APIs & Services > Credentials');
console.log('   □ Find your OAuth 2.0 Client ID');
console.log('   □ Click the pencil icon to edit');

console.log('\n✅ 3. AUTHORIZED REDIRECT URIS');
console.log('   □ In the "Authorized redirect URIs" section, verify:');
console.log('     □ https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');
console.log('   □ Check for:');
console.log('     □ No extra spaces before or after the URI');
console.log('     □ No trailing slashes (unless intentionally added)');
console.log('     □ Exact character matching (copy-paste to be sure)');
console.log('     □ No hidden characters');

console.log('\n✅ 4. TESTING MODE VERIFICATION');
console.log('   □ OAuth consent screen is set to "Testing" or "In Production"');
console.log('   □ If "Testing", your email is added as a test user');
console.log('   □ Test users can be found under "Test users" tab');

console.log('\n✅ 5. CLIENT ID AND SECRET');
console.log('   □ Client ID matches what\'s in your .env file');
console.log('   □ Client Secret matches what\'s in your .env file');
console.log('   □ Credentials have not been revoked');

console.log('\n✅ 6. ADDITIONAL CHECKS');
console.log('   □ No IP restrictions on the OAuth client');
console.log('   □ No domain restrictions on the OAuth client');
console.log('   □ No authorized JavaScript origins that might conflict');

console.log('\n=== STEP-BY-STEP VERIFICATION PROCESS ===\n');

console.log('1. COPY THE EXACT REDIRECT URI:');
console.log('   https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');
console.log('   (Select and copy this exact text)');

console.log('\n2. IN GOOGLE CLOUD CONSOLE:');
console.log('   a. Go to https://console.cloud.google.com/');
console.log('   b. Select your project');
console.log('   c. Go to "APIs & Services" > "Credentials"');
console.log('   d. Click on your OAuth 2.0 Client ID');
console.log('   e. Delete any existing redirect URIs');
console.log('   f. Paste the exact URI copied above');
console.log('   g. Click "Save"');

console.log('\n3. ADD YOUR EMAIL AS TEST USER (if in Testing mode):');
console.log('   a. Go to "APIs & Services" > "OAuth consent screen"');
console.log('   b. Scroll to "Test users" section');
console.log('   c. Click "+ ADD USERS"');
console.log('   d. Enter your email address');
console.log('   e. Click "Save"');

console.log('\n4. VERIFY API IS ENABLED:');
console.log('   a. Go to "APIs & Services" > "Library"');
console.log('   b. Search for "Google Drive API"');
console.log('   c. Click on it and ensure it shows "API enabled"');

console.log('\n=== TROUBLESHOOTING SCENARIO ===\n');

console.log('If the error persists after verifying all the above:');

console.log('\n1. CREATE A NEW OAUTH CLIENT ID:');
console.log('   a. In Credentials page, click "+ CREATE CREDENTIALS"');
console.log('   b. Select "OAuth client ID"');
console.log('   c. Application type: "Web application"');
console.log('   d. Name: "Spark App" (or whatever you prefer)');
console.log('   e. Authorized redirect URIs: Add only');
console.log('      https://spark-backend-production-ab14.up.railway.app/api/integrations/callback');
console.log('   f. Click "Create"');
console.log('   g. Copy the new Client ID and Secret to your .env file');

console.log('\n2. TRY A SIMPLIFIED OAUTH FLOW:');
console.log('   a. Temporarily modify your .env file to use the new credentials');
console.log('   b. Restart your backend server');
console.log('   c. Try connecting to Google Drive again');

console.log('\n3. CHECK BROWSER DEVELOPER TOOLS:');
console.log('   a. Open Developer Tools (F12)');
console.log('   b. Go to Network tab');
console.log('   c. Try to connect to Google Drive');
console.log('   d. Look for the request to accounts.google.com');
console.log('   e. Check the redirect_uri parameter in the request');

console.log('\n✅ YOUR APPLICATION CONFIGURATION IS CORRECT');
console.log('The redirect URI mismatch is almost certainly a Google Cloud Console configuration issue.');
console.log('Following this checklist should resolve the problem.');