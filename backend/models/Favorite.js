const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['player', 'video', 'scorecard']
    },
    itemId: {
        type: String,
        required: true
    },
    title: {
        type: String
    },
    imageUrl: {
        type: String
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

// Create a compound unique index so a user cannot favorite the same exact item twice
favoriteSchema.index({ uid: 1, type: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
