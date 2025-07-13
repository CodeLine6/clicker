// routes/analytics.js
const express = require('express');
const { getAnalytics, getRecentActivity,getSessions  } = require('../controllers/analytics/analyticsController');

const router = express.Router();

router.get('/', getAnalytics);
router.get('/recent-activity', getRecentActivity);
router.get('/sessions', getSessions);

module.exports = router;