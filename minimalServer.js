const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

// Simple CORS configuration
app.use(cors());

// Simple middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Health check successful'
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  console.log(`Health check endpoint: http://localhost:${PORT}/api/health`);
});