// Generate the exact test URL for manual verification
const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=your_google_drive_client_id&redirect_uri=https%3A%2F%2Fspark-backend-production-ab14.up.railway.app%2Fapi%2Fintegrations%2Fcallback&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&response_type=code&access_type=offline&prompt=consent&state=%7B%22integrationId%22%3A%226920032786df291bc118aa1f%22%2C%22userId%22%3A%22debug_user_id%22%7D`;

console.log('COPY AND PASTE THIS URL DIRECTLY IN YOUR BROWSER:');
console.log('================================================');
console.log(testUrl);
console.log('');
console.log('Instructions:');
console.log('1. Copy the URL above');
console.log('2. Paste it in a new browser tab/incognito window');
console.log('3. See if you get the same redirect_uri_mismatch error');
console.log('');
console.log('If you get the SAME error:');
console.log('- The issue is definitely with your Google OAuth configuration');
console.log('');
console.log('If you get a DIFFERENT error or it works:');
console.log('- The issue is in how your frontend/backend communicate');
console.log('- Or there\'s some middleware/proxy interfering');