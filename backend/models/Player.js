const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    imageId: { type: String },
    role: { type: String },
    battingStyle: { type: String },
    bowlingStyle: { type: String },
    intlTeam: { type: String },
    bio: { type: String },
    stats: { type: Object }, // Storing full stats object for flexibility
    lastUpdated: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('Player', playerSchema);
