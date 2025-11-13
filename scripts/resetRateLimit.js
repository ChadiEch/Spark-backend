// This script will reset the rate limit store
const rateLimitModule = require('../middleware/rateLimiter');

// Access the rateLimitStore from the module
// Note: This is a bit of a hack since the store is not exported directly
// We'll need to modify the rateLimiter.js to export the store for this to work properly

console.log('This script would reset the rate limit store if it were exported.');
console.log('For now, please wait 15 minutes for the rate limit to reset automatically,');
console.log('or restart the server to clear all rate limit data.');