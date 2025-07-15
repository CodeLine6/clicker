// controllers/analytics/analyticsController.js - Updated with session support
const Click = require("../../models/clicks");

const getAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, keyword, searchEngine, target, sessionId } = req.query;
        
        // Build filter object
        const filter = {};
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }
        if (keyword) filter.keyword = keyword;
        if (searchEngine) filter.search_engine = searchEngine;
        if (target) filter.target = target;
        if (sessionId) filter.session_id = sessionId; // Add session filter

        // Get basic stats
        const totalClicks = await Click.countDocuments(filter);
        const successfulClicks = await Click.countDocuments({...filter, success: true});
        const successRate = totalClicks > 0 ? (successfulClicks / totalClicks * 100) : 0;

        // Get session-specific analytics
        const sessionStats = await Click.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$session_id",
                    clickCount: { $sum: 1 },
                    avgTimeOnPage: { $avg: "$time_on_page" },
                    avgInteractions: { $avg: "$interactions" },
                    successRate: { $avg: { $cond: ["$success", 1, 0] } },
                    firstClick: { $min: "$timestamp" },
                    lastClick: { $max: "$timestamp" },
                    keywords: { $addToSet: "$keyword" },
                    searchEngines: { $addToSet: "$search_engine" }
                }
            },
            { $sort: { firstClick: -1 } }
        ]);

        // Calculate session duration
        const sessionStatsWithDuration = sessionStats.map(session => ({
            ...session,
            sessionDuration: new Date(session.lastClick) - new Date(session.firstClick),
            keywordCount: session.keywords.length,
            searchEngineCount: session.searchEngines.length
        }));

        // Get clicks by time periods (existing code)
        const clicksByHour = await Click.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: { $hour: "$timestamp" },
                    count: { $sum: 1 },
                    avgTimeOnPage: { $avg: "$time_on_page" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const clicksByDay = await Click.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: {
                        year: { $year: "$timestamp" },
                        month: { $month: "$timestamp" },
                        day: { $dayOfMonth: "$timestamp" }
                    },
                    count: { $sum: 1 },
                    avgTimeOnPage: { $avg: "$time_on_page" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // Get top keywords
        const topKeywords = await Click.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$keyword",
                    count: { $sum: 1 },
                    avgTimeOnPage: { $avg: "$time_on_page" },
                    successRate: { $avg: { $cond: ["$success", 1, 0] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get search engine performance
        const searchEngineStats = await Click.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$search_engine",
                    count: { $sum: 1 },
                    avgTimeOnPage: { $avg: "$time_on_page" },
                    successRate: { $avg: { $cond: ["$success", 1, 0] } }
                }
            }
        ]);

        // Get target performance
        const targetStats = await Click.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$target",
                    count: { $sum: 1 },
                    avgTimeOnPage: { $avg: "$time_on_page" },
                    successRate: { $avg: { $cond: ["$success", 1, 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get position performance
        const positionStats = await Click.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$position",
                    count: { $sum: 1 },
                    avgTimeOnPage: { $avg: "$time_on_page" },
                    avgInteractions: { $avg: "$interactions" },
                    successRate: { $avg: { $cond: ["$success", 1, 0] } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.json({
            summary: {
                totalClicks,
                successfulClicks,
                successRate: Math.round(successRate * 100) / 100
            },
            timeAnalysis: {
                clicksByHour,
                clicksByDay
            },
            topKeywords,
            searchEngineStats,
            targetStats,
            positionStats,
            sessionStats: sessionStatsWithDuration
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
};

// New endpoint to get all sessions for dropdown
const getSessions = async (req, res) => {
    try {
        const sessions = await Click.aggregate([
            {
                $group: {
                    _id: "$session_id",
                    firstClick: { $min: "$timestamp" },
                    clickCount: { $sum: 1 },
                    keyword: { $first: "$keyword" }
                }
            },
            { $sort: { firstClick: -1 } },
            { $limit: 100 } // Limit to recent 100 sessions
        ]);

        const formattedSessions = sessions.map(session => ({
            session_id: session._id,
            display_name: `${session.keyword} (${session.clickCount} clicks) - ${new Date(session.firstClick).toLocaleDateString()}`,
            first_click: session.firstClick,
            click_count: session.clickCount
        }));

        res.json(formattedSessions);
    } catch (error) {
        console.error('Sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

const getRecentActivity = async (req, res) => {
    try {
        const { sessionId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25; // Default to 25 items per page
        const skip = (page - 1) * limit;
        
        const filter = {};
        if (sessionId) filter.session_id = sessionId;
        
        // Get total count for pagination info
        const totalCount = await Click.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / limit);
        
        // Get paginated results
        const recentClicks = await Click.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({
            data: recentClicks,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalCount: totalCount,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
};

module.exports = {
    getAnalytics,
    getRecentActivity,
    getSessions
};