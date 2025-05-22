const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// MongoDB Connection
const startServer = async () => {
  const mongoURI = process.env.MONGO_URI;

  try {
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (mongoURI.includes('localhost')) {
      console.warn('💡 Is MongoDB running locally? Start it with: sudo systemctl start mongod');
    }
    process.exit(1);
  }
};

startServer();
