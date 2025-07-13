const mongoose = require('mongoose');
const {Schema} = mongoose;

const clicksSchema = new Schema({
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    },
    url: {
        type: String,
        required: true
    },
    keyword: {
        type: String,
        required: true
    },
    target: {
        type: String,
        default: 'All' 
    },
    search_engine: {
        type: String,
        required: true
    },
    // Enhanced analytics fields
    position: {
        type: Number, // Ad position in results
        default: null
    },
    time_on_page: {
        type: Number, // Milliseconds spent on target page
        default: null
    },
    interactions: {
        type: Number, // Number of interactions performed
        default: 0
    },
    session_id: {
        type: String, // To group related clicks
        required: true
    },
    user_agent: {
        type: String,
        default: null
    },
    success: {
        type: Boolean,
        default: true
    },
    error_message: {
        type: String,
        default: null
    }
});

// Add indexes for better query performance
clicksSchema.index({ timestamp: -1 });
clicksSchema.index({ keyword: 1 });
clicksSchema.index({ search_engine: 1 });
clicksSchema.index({ target: 1 });

module.exports = mongoose.model('Click', clicksSchema);