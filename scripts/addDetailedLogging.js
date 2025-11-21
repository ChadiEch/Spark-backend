// Script to add detailed logging to help debug OAuth issues
console.log('=== ADDING DETAILED LOGGING FOR OAUTH DEBUGGING ===\n');

console.log('This script will help you add detailed logging to track the OAuth flow.');
console.log('You can add these logging statements to the following files:\n');

console.log('1. In controllers/integrationController.js - connectIntegration function:');
console.log('   Add detailed logging before generating the authorization URL:');
console.log('');
console.log('   logger.info("=== DETAILED OAUTH DEBUGGING ===");');
console.log('   logger.info("Integration details:", {');
console.log('     integrationId: integration._id,');
console.log('     integrationKey: integration.key,');
console.log('     integrationName: integration.name,');
console.log('     dbRedirectUri: integration.redirectUri,');
console.log('     providedRedirectUri: redirectUri,');
console.log('     defaultRedirectUri: defaultRedirectUri,');
console.log('     finalRedirectUri: finalRedirectUri');
console.log('   });');
console.log('');
console.log('   logger.info("Authorization URL components:", {');
console.log('     clientId: googleDriveCredentials.clientId.substring(0, 10) + "...",');
console.log('     redirectUri: finalRedirectUri,');
console.log('     encodedRedirectUri: encodeURIComponent(finalRedirectUri),');
console.log('     scopes: integration.scopes,');
console.log('     state: JSON.stringify({ integrationId: integration._id, userId: req.user.id })');
console.log('   });');

console.log('\n2. In controllers/integrationController.js - handleOAuthCallback function:');
console.log('   Add detailed logging at the beginning:');
console.log('');
console.log('   logger.info("=== OAUTH CALLBACK DEBUGGING ===");');
console.log('   logger.info("Full query parameters:", {');
console.log('     query: req.query');
console.log('   });');
console.log('');
console.log('   logger.info("Parsed state data:", {');
console.log('     stateData: stateData');
console.log('   });');

console.log('\n3. In utils/integrations/oauthUtils.js - exchangeCodeForTokens function:');
console.log('   Add detailed logging before making the request:');
console.log('');
console.log('   logger.info("=== TOKEN EXCHANGE DEBUGGING ===");');
console.log('   logger.info("Token exchange request details:", {');
console.log('     integrationKey: integrationKey,');
console.log('     redirectUri: redirectUri,');
console.log('     clientId: clientId.substring(0, 10) + "...",');
console.log('     clientSecret: clientSecret ? "SET" : "NOT SET",');
console.log('     code: code ? "PRESENT" : "MISSING"');
console.log('   });');

console.log('\n4. To enable more detailed logging, set these environment variables:');
console.log('   NODE_ENV=development');
console.log('   LOG_LEVEL=debug');
console.log('   LOG_TO_FILE=true');

console.log('\n5. After adding the logging, restart your application and try the OAuth flow again.');
console.log('   Check the logs for detailed information about what\'s happening.');

console.log('\n6. Look specifically for these log entries:');
console.log('   - "=== DETAILED OAUTH DEBUGGING ==="');
console.log('   - "=== OAUTH CALLBACK DEBUGGING ==="');
console.log('   - "=== TOKEN EXCHANGE DEBUGGING ==="');
console.log('   - "Google Drive OAuth redirect_uri DETAILS"');
console.log('   - "Google integration OAuth callback redirect_uri DETAILS"');

console.log('\n7. When you find these logs, look for any discrepancies in the redirect URIs.');
console.log('   Make sure the redirect URI used in the authorization URL exactly matches');
console.log('   the one used in the token exchange request.');