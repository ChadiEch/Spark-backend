const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

// CORS configuration - allow multiple origins in development
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:8084'] // Allow requests from common development ports
    : ['https://spark-frontend-production.up.railway.app', 'https://spark-frontend-production-ab14.up.railway.app'], // In production, explicitly allow frontend origins
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply middleware in the same order as the original server
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increase payload limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple health endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Health check successful'
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Health check endpoint: http://localhost:${PORT}/api/health`);
});