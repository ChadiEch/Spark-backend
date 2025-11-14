const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// List integrations
const listIntegrations = async () => {
  try {
    await connectDB();
    
    // Get all integrations
    const integrations = await Integration.find({});
    
    console.log(`Found ${integrations.length} integrations:`);
    integrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.key}) - ${integration.description}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

listIntegrations();