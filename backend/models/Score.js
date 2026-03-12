const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    matchId: { type: String, required: true, unique: true },
    seriesName: { type: String },
    matchDesc: { type: String },
    matchFormat: { type: String },
    startDate: { type: String }, // For historical sorting
    endDate: { type: String },
    state: { type: String }, // Complete, In Progress, etc.
    status: { type: String },
    venue: { type: String },
    source: { type: String, default: 'api' }, // 'api' or 'historical'

    // Basic Team Info (Common for List View)
    team1: {
        name: String,
        shortName: String,
        imageId: String,
        score: String
    },
    team2: {
        name: String,
        shortName: String,
        imageId: String,
        score: String
    },

    // Full Detail for Historical Matches
    json: { type: Object } // Store the entire original JSON for full fidelity
}, { timestamps: true });

module.exports = mongoose.model('Score', ScoreSchema);
