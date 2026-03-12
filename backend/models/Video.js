const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    videoId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        required: true
    },
    channelTitle: {
        type: String,
        default: 'Unknown Channel'
    },
    publishTime: {
        type: Date,
        default: Date.now
    },
    category: {
        type: String,
        enum: ['highlight', 'classic', 'analysis', 'other'],
        default: 'other'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Text index for searching
videoSchema.index({ title: 'text', channelTitle: 'text' });

module.exports = mongoose.model('Video', videoSchema);
