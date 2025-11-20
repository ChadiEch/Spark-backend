const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('GOOGLE_DRIVE_CLIENT_ID:', process.env.GOOGLE_DRIVE_CLIENT_ID);
console.log('GOOGLE_DRIVE_CLIENT_SECRET:', process.env.GOOGLE_DRIVE_CLIENT_SECRET ? 'SET' : 'MISSING');
console.log('YOUTUBE_CLIENT_ID:', process.env.YOUTUBE_CLIENT_ID);
console.log('YOUTUBE_CLIENT_SECRET:', process.env.YOUTUBE_CLIENT_SECRET ? 'SET' : 'MISSING');

console.log('\n=== CHECKING FOR PLACEHOLDER VALUES ===');
const googleDriveClientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const googleDriveClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const youtubeClientId = process.env.YOUTUBE_CLIENT_ID;
const youtubeClientSecret = process.env.YOUTUBE_CLIENT_SECRET;

if (googleDriveClientId && googleDriveClientId.includes('your_actual')) {
  console.log('WARNING: GOOGLE_DRIVE_CLIENT_ID contains placeholder text');
}

if (googleDriveClientSecret && googleDriveClientSecret.includes('your_actual')) {
  console.log('WARNING: GOOGLE_DRIVE_CLIENT_SECRET contains placeholder text');
}

if (youtubeClientId && youtubeClientId.includes('your_actual')) {
  console.log('WARNING: YOUTUBE_CLIENT_ID contains placeholder text');
}

if (youtubeClientSecret && youtubeClientSecret.includes('your_actual')) {
  console.log('WARNING: YOUTUBE_CLIENT_SECRET contains placeholder text');
}

console.log('\n=== SUMMARY ===');
console.log('If any of the above warnings are shown, you need to update your environment variables');
console.log('in the Railway dashboard with actual Google OAuth credentials, not placeholder text.');