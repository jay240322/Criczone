const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const startScheduler = require("./jobs/scheduler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

const playerRoutes = require("./routes/playerRoutes");
app.use("/api/players", playerRoutes);

const imageRoutes = require("./routes/imageRoutes");
app.use("/api/images", imageRoutes);

// MongoDB Connection
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("✅ MongoDB connected successfully to CricZone database");

        // Start ESPN live score scheduler only in normal Node server
        if (!process.env.VERCEL) {
            startScheduler();
        }

    } catch (err) {
        console.error("❌ MongoDB connection error:");
        console.error(err);
        process.exit(1);
    }
}

connectDB();

// Start Express Server
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;