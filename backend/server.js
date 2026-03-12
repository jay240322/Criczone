const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

const playerRoutes = require('./routes/playerRoutes');
app.use('/api/players', playerRoutes);

const imageRoutes = require('./routes/imageRoutes');
app.use('/api/images', imageRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully to criczone database'))
    .catch(err => console.error('MongoDB connection error:', err));

// Start server if not running in a Vercel serverless environment
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the Express API for Serverless Functions
module.exports = app;
