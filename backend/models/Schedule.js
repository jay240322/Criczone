const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
    type: { type: String, required: true, unique: true }, // 'international', 'league', etc.
    data: { type: Object, required: true }, // The full JSON response or matchScheduleMap
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Schedule', ScheduleSchema);
