const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // External ID from api
    headline: { type: String, required: true },
    hline: { type: String }, // Store original headline from API for search compatibility
    intro: { type: String },
    pubTime: { type: String }, // Storing as string timestamp for simplicity, or use Date
    source: { type: String },
    storyType: { type: String },
    imageId: { type: String }, // To store the ID we use for HD images
    content: { type: Array }, // For detailed content blocks
    coverImage: {
        id: String,
        caption: String,
        source: String
    }
}, { timestamps: true, strict: false });

module.exports = mongoose.model('News', NewsSchema);
