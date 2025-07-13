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
    }
});

module.exports = mongoose.model('Click', clicksSchema);