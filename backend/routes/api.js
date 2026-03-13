const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const News = require('../models/News');
const Score = require('../models/Score');
const TopicNews = require('../models/TopicNews');
const Video = require('../models/Video');
const User = require('../models/User');
const Player = require('../models/Player');
const Favorite = require('../models/Favorite');

const getApiKey = (req) => req.headers['x-rapidapi-key'] || process.env.RAPIDAPI_KEY;

// ==========================================
//                 NEWS API
// ==========================================

router.get('/news', async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        if (search) {
            query = {
                $or: [
                    { headline: { $regex: search, $options: 'i' } },
                    { hline: { $regex: search, $options: 'i' } },
                    { intro: { $regex: search, $options: 'i' } }
                ]
            };
        }
        const news = await News.find(query).sort({ pubTime: -1, createdAt: -1 });
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/news/sync', async (req, res) => {
    try {
        console.log(`[Sync] Fetching general news...`);
        const url = `https://${process.env.RAPIDAPI_HOST}/news/v1/index`;
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Sync] External API failed: ${response.status}. Returning local cache.`);
            const cached = await News.find({}).sort({ pubTime: -1 }).limit(20);
            return res.json({ data: { storyList: cached.map(s => ({ story: s })) }, source: 'local-fallback' });
        }

        const data = await response.json();
        if (data && data.storyList) {
            const stories = data.storyList.filter(item => item.story).map(item => ({
                ...item.story,
                headline: item.story.hline || item.story.headline,
                imageId: item.story.imageId || (item.story.coverImage ? item.story.coverImage.id : null),
                id: item.story.id
            }));

            for (const story of stories) {
                await News.findOneAndUpdate({ id: story.id }, story, { upsert: true });
            }
            console.log(`[Sync] Cached ${stories.length} news items`);
        }
        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("[Sync] Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

router.get('/news/detail/sync', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ message: "News ID is required" });

        console.log(`[Sync] Fetching full news detail for ID: ${id}`);
        const url = `https://${process.env.RAPIDAPI_HOST}/news/v1/detail/${id}`;
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Sync] External API failed for news detail: ${response.status}. Returning local cache if exists.`);
            // Fallback to local
            const cached = await News.findOne({
                $or: [
                    { _id: mongoose.isValidObjectId(id) ? id : null },
                    { 'id': id } // rapidapi format has string/number ID
                ]
            });
            if (!cached) return res.status(404).json({ message: "News not found locally or remotely" });
            return res.json({ data: cached, source: 'local-fallback' });
        }

        const data = await response.json();

        // Cache the full detailed article in MongoDB
        if (data) {
            const story = {
                ...data,
                headline: data.hline || data.headline,
                imageId: data.imageId || (data.coverImage ? data.coverImage.id : null),
                id: data.id || id.toString()
            };
            // Updating existing news intro document with full content, or creating a new one if it didn't exist
            await News.findOneAndUpdate({ id: story.id }, story, { upsert: true });
            console.log(`[Sync] Successfully cached full news item ${story.id}`);
        }

        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("[Sync] Error fetching detailed news:", err.message);
        res.status(500).json({ message: err.message });
    }
});

router.get('/news/team/sync', async (req, res) => {
    try {
        const { teamId } = req.query;
        if (!teamId) return res.status(400).json({ message: "Team ID is required" });

        console.log(`[Sync] Fetching news for team ID: ${teamId}`);
        const url = `https://${process.env.RAPIDAPI_HOST}/news/v1/team/${teamId}`;
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Sync] External API failed for team news: ${response.status}. Returning local team-specific cache.`);
            // Fallback to local DB news for this specific team
            const cached = await News.find({
                $or: [
                    { headline: { $regex: teamId, $options: 'i' } },
                    { hline: { $regex: teamId, $options: 'i' } },
                    { intro: { $regex: teamId, $options: 'i' } }
                ]
            }).sort({ pubTime: -1 }).limit(10);
            return res.json({ data: { storyList: cached.map(s => ({ story: s })) }, source: 'local-fallback' });
        }

        const data = await response.json();
        if (data && data.storyList) {
            const stories = data.storyList.filter(item => item.story).map(item => ({
                ...item.story,
                headline: item.story.hline || item.story.headline,
                imageId: item.story.imageId || (item.story.coverImage ? item.story.coverImage.id : null),
                id: item.story.id
            }));

            for (const story of stories) {
                await News.findOneAndUpdate({ id: story.id }, story, { upsert: true });
            }
        }
        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("[Sync] Error fetching team news:", err.message);
        res.status(500).json({ message: err.message });
    }
});

router.get('/news/:id', async (req, res) => {
    try {
        const news = await News.findOne({
            $or: [
                { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null },
                { 'id': req.params.id }
            ]
        });
        if (!news) return res.status(404).json({ message: 'News not found' });
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
//                 TOPIC NEWS API
// ==========================================

router.get('/topic-news/sync', async (req, res) => {
    try {
        const { topicId } = req.query;
        if (!topicId) return res.status(400).json({ message: "topicId is required" });

        console.log(`[Sync] Fetching news for topic ID: ${topicId}`);
        // Changed from /v1/topics/ to /v1/cat/ since topics are historical series
        const url = `https://${process.env.RAPIDAPI_HOST}/news/v1/cat/${topicId}`;
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Sync] External API failed for topic news: ${response.status}. Returning local cache.`);
            // Fallback to local
            const cached = await TopicNews.find({ topicId }).sort({ createdAt: -1 }).limit(20);
            return res.json({ data: { storyList: cached.map(s => ({ story: s })) }, source: 'local-fallback' });
        }

        const data = await response.json();

        // Cache new stories to DB
        if (data && data.storyList) {
            const stories = data.storyList.filter(item => item.story).map(item => ({
                ...item.story,
                topicId: topicId,
                headline: item.story.hline || item.story.headline,
                imageId: item.story.imageId || (item.story.coverImage ? item.story.coverImage.id : null),
                id: item.story.id
            }));

            for (const story of stories) {
                await TopicNews.findOneAndUpdate({ id: story.id, topicId: topicId }, story, { upsert: true });
            }
            console.log(`[Sync] Cached ${stories.length} topic news items for topic ${topicId}`);
        }

        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("[Sync] Error fetching topic news:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
//                 USERS API
// ==========================================

router.post('/users/sync', async (req, res) => {
    try {
        const { uid, email, displayName, photoURL } = req.body;

        if (!uid || !email) {
            return res.status(400).json({ message: 'UID and email are required' });
        }

        // Upsert user to MongoDB based on Firebase UID
        const user = await User.findOneAndUpdate(
            { uid: uid },
            {
                uid,
                email,
                displayName: displayName || '',
                photoURL: photoURL || '',
                lastLoginAt: Date.now()
            },
            { new: true, upsert: true }
        );

        res.json({ message: 'User synced successfully', user });
    } catch (err) {
        console.error("[User Sync Error]", err);
        res.status(500).json({ message: err.message });
    }
});

// GET all users (Admin)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error("[Get Users Error]", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// GET a single user by UID
router.get('/users/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const user = await User.findOne({ uid });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        console.error("[Get User Error]", error);
        res.status(500).json({ message: "Failed to fetch user" });
    }
});

// PUT (Update) a user (Admin)
router.put('/users/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const { displayName, email } = req.body;

        const user = await User.findOneAndUpdate(
            { uid },
            { $set: { displayName, email } },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User updated successfully", user });
    } catch (error) {
        console.error("[Update User Error]", error);
        res.status(500).json({ message: "Failed to update user" });
    }
});

// DELETE a user (Admin)
router.delete('/users/:uid', async (req, res) => {
    try {
        const { uid } = req.params;

        // Delete user
        const result = await User.findOneAndDelete({ uid });
        if (!result) return res.status(404).json({ message: "User not found" });

        // Delete all favorites associated with the user
        await Favorite.deleteMany({ uid });

        res.json({ message: "User and their favorites deleted successfully" });
    } catch (error) {
        console.error("[Delete User Error]", error);
        res.status(500).json({ message: "Failed to delete user" });
    }
});

// ==========================================
//                 SCHEDULE API
// ==========================================

router.get('/schedule/sync', async (req, res) => {
    try {
        const { type } = req.query; // 'international', 'league', 'domestic', 'women'
        const scheduleType = type || 'international';
        console.log(`[Sync] Fetching schedule for type: ${scheduleType}`);

        const url = `https://${process.env.RAPIDAPI_HOST}/schedule/v1/${scheduleType}`;
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Sync] External API failed for schedule: ${response.status}. Using fallback data.`);
            return res.json({ data: getFallbackSchedule(), source: 'fallback-local' });
        }

        const data = await response.json();

        // Return structured data for UI
        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("[Sync] Error fetching schedule, using fallback:", err.message);
        res.json({ data: getFallbackSchedule(), source: 'fallback-error' });
    }
});

// Helper function to generate fallback schedule data if RapidAPI fails
function getFallbackSchedule() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    return {
        matchScheduleMap: [
            {
                scheduleAdWrapper: {
                    date: formatDate(today),
                    matchScheduleList: [
                        {
                            seriesName: "ICC World Test Championship",
                            matchInfo: [{
                                matchId: 101,
                                team1: { teamName: "India" },
                                team2: { teamName: "Australia" },
                                matchDesc: "1st Test",
                                venueInfo: { ground: "MCG", city: "Melbourne" },
                                startDate: today.getTime().toString()
                            }]
                        }
                    ]
                }
            },
            {
                scheduleAdWrapper: {
                    date: formatDate(tomorrow),
                    matchScheduleList: [
                        {
                            seriesName: "T20 International Series",
                            matchInfo: [{
                                matchId: 102,
                                team1: { teamName: "England" },
                                team2: { teamName: "South Africa" },
                                matchDesc: "3rd T20I",
                                venueInfo: { ground: "Lord's", city: "London" },
                                startDate: tomorrow.getTime().toString()
                            }]
                        }
                    ]
                }
            }
        ]
    };
}

// ==========================================
//                 SCORES API
// ==========================================

router.get('/scores', async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status: { $regex: status, $options: 'i' } } : {};
        const limit = status ? 0 : 50;
        const scores = await Score.find(query).sort({ startDate: -1, createdAt: -1 }).limit(limit);
        res.json(scores);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


const TEAM_SHORT_NAMES = {
    'rcb': 'Royal Challengers',
    'csk': 'Chennai Super',
    'mi': 'Mumbai Indians',
    'kkr': 'Knight Riders',
    'srh': 'Sunrisers',
    'dc': 'Delhi Capital',
    'pbks': 'Punjab Kings',
    'rr': 'Rajasthan Royals',
    'lsg': 'Lucknow Super Giants',
    'gt': 'Gujarat Titans',
    'ind': 'India',
    'aus': 'Australia',
    'eng': 'England',
    'pak': 'Pakistan',
    'nz': 'New Zealand',
    'sa': 'South Africa',
    'wi': 'West Indies',
    'sl': 'Sri Lanka',
    'ban': 'Bangladesh',
    'afg': 'Afghanistan'
};

router.get('/scores/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        const qLower = query.toLowerCase().trim().replace(/worldcup/g, 'world cup');

        // Split the query into tokens, ignoring common joining words
        const ignoredWords = ['vs', 'v', 'and', '-'];
        const allTokens = qLower.split(/\s+/).filter(word => word.length > 0 && !ignoredWords.includes(word));

        if (allTokens.length === 0) return res.json([]);

        const andConditions = [];
        const normalTokens = [];

        // Pre-parse the tokens to find specific filters like "women" and years (e.g., "2019")
        allTokens.forEach(token => {
            if (token === 'women' || token === 'womens' || token === "women's" || token === 'w') {
                // If "women" is specified, enforce it in the series name or match description
                andConditions.push({
                    $or: [
                        { seriesName: { $regex: 'women', $options: 'i' } },
                        { matchDesc: { $regex: 'women', $options: 'i' } }
                    ]
                });
            } else if (token === 'men' || token === 'mens' || token === "men's" || token === 'm') {
                // If "men" is specified, explicitly EXCLUDE women's matches
                andConditions.push({
                    seriesName: { $not: /women/i },
                    matchDesc: { $not: /women/i }
                });
            } else if (/^\d{4}$/.test(token)) {
                // If a 4-digit year is specified (e.g. 2019), enforce it in the startDate or seriesName
                andConditions.push({
                    $or: [
                        { startDate: { $regex: token } },
                        { seriesName: { $regex: token } },
                        { matchDesc: { $regex: token } }
                    ]
                });
            } else {
                normalTokens.push(token);
            }
        });

        // Ensure every normal token matches *somewhere* in the match document
        normalTokens.forEach(token => {
            const mappedName = TEAM_SHORT_NAMES[token];

            // Use word boundary for very short tokens to avoid "mi" matching "Kotambi"
            const regexQuery = token.length <= 3 ? new RegExp(`\\b${token}\\b`, 'i') : new RegExp(token, 'i');

            const orClauses = [
                { 'team1.name': regexQuery },
                { 'team1.shortName': regexQuery },
                { 'team2.name': regexQuery },
                { 'team2.shortName': regexQuery },
                { seriesName: regexQuery },
                { matchDesc: regexQuery },
                { matchFormat: regexQuery },
                { venue: regexQuery },
                { status: regexQuery }
            ];

            if (mappedName) {
                const mappedRegex = new RegExp(mappedName, 'i');
                orClauses.push({ 'team1.name': mappedRegex });
                orClauses.push({ 'team2.name': mappedRegex });
                orClauses.push({ 'team1.shortName': mappedRegex });
                orClauses.push({ 'team2.shortName': mappedRegex });
            }

            andConditions.push({ $or: orClauses });
        });

        // If no valid conditions resulted (e.g. only stopwords), return empty
        if (andConditions.length === 0) return res.json([]);

        // Limit results to 30 to improve performance avoiding full collection scan on huge database
        const results = await Score.find({
            $and: andConditions
        }).sort({ startDate: -1 }).limit(30);

        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Single Score
router.get('/scores/:matchId', async (req, res) => {
    try {
        console.log(`[API] Fetching details for matchId: ${req.params.matchId}`);
        const score = await Score.findOne({ matchId: req.params.matchId });

        let result = score ? score.toObject() : { matchId: req.params.matchId, source: 'file-only' };

        // On-Demand File Read Strategy
        if (!result.json) {
            const path = require('path');
            const fs = require('fs');
            const jsonPath = path.join(__dirname, '../uploads/all_json(2)', `${req.params.matchId}.json`);

            if (fs.existsSync(jsonPath)) {
                console.log(`[API] Found JSON on disk for ${req.params.matchId}, serving on-demand.`);
                try {
                    const fileData = fs.readFileSync(jsonPath, 'utf-8');
                    const parsed = JSON.parse(fileData);
                    result.json = parsed;

                    if (!result.seriesName && parsed.info) {
                        result.seriesName = parsed.info.event?.name;
                        result.matchDesc = parsed.info.match_type_number ? `${parsed.info.match_type} #${parsed.info.match_type_number}` : 'Match Details';
                        result.venue = parsed.info.venue;
                        result.startDate = parsed.info.dates?.[0];
                        result.status = parsed.info.outcome?.winner ? `${parsed.info.outcome.winner} won` : 'Result unavailable';
                        result.team1 = { name: parsed.info.teams?.[0] };
                        result.team2 = { name: parsed.info.teams?.[1] };
                    }
                } catch (readErr) {
                    console.error(`[API] Error reading file: ${readErr.message}`);
                }
            } else {
                console.log(`[API] No local JSON file for ${req.params.matchId}`);
            }
        }

        if (result.json || score) {
            res.json(result);
        } else {
            res.status(404).json({ message: 'Match not found' });
        }

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
//                 ADMIN SCORES API
// ==========================================

// GET all matches for admin
router.get('/scores/admin/all', async (req, res) => {
    try {
        const scores = await Score.find().sort({ createdAt: -1 });
        res.json(scores);
    } catch (err) {
        console.error("Admin Get Scores Error:", err.message);
        res.status(500).json({ message: "Failed to fetch matches" });
    }
});

// POST add a new match
router.post('/scores/admin/add', async (req, res) => {
    try {
        const newScore = new Score(req.body);
        await newScore.save();
        res.status(201).json({ message: "Match created successfully", match: newScore });
    } catch (err) {
        console.error("Admin Add Score Error:", err.message);
        res.status(500).json({ message: "Failed to create match" });
    }
});

// POST upload match JSON
router.post('/scores/admin/upload-json', async (req, res) => {
    try {
        const { jsonData } = req.body;
        if (!jsonData) return res.status(400).json({ message: "No JSON data provided" });

        const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

        if (!parsed.info) {
            return res.status(400).json({ message: "Invalid Match JSON format. Missing 'info' object." });
        }

        // Generate a matchId if not present somewhere, or use a manual timestamp
        const matchId = parsed.info.registry?.people ? Object.keys(parsed.info.registry.people)[0] + '-' + Date.now() : 'uploaded-' + Date.now();

        const scoreObj = {
            matchId: matchId,
            seriesName: parsed.info.event?.name || 'Uploaded Series',
            matchDesc: parsed.info.match_type_number ? `${parsed.info.match_type} #${parsed.info.match_type_number}` : (parsed.info.match_type || 'Match Details'),
            matchFormat: parsed.info.match_type || 'Unknown',
            startDate: parsed.info.dates?.[0] || new Date().toISOString().split('T')[0],
            venue: parsed.info.venue || 'Unknown Venue',
            status: parsed.info.outcome?.winner ? `${parsed.info.outcome.winner} won` : (parsed.info.outcome?.result || 'Result unavailable'),
            source: 'historical',
            team1: {
                name: parsed.info.teams?.[0] || 'Team 1',
                shortName: parsed.info.teams?.[0]?.substring(0, 3).toUpperCase() || 'TM1',
                score: ''
            },
            team2: {
                name: parsed.info.teams?.[1] || 'Team 2',
                shortName: parsed.info.teams?.[1]?.substring(0, 3).toUpperCase() || 'TM2',
                score: ''
            },
            json: parsed
        };

        const newScore = await Score.findOneAndUpdate(
            { matchId: scoreObj.matchId },
            { $set: scoreObj },
            { new: true, upsert: true }
        );

        res.status(201).json({ message: "Match JSON uploaded successfully", match: newScore });
    } catch (err) {
        console.error("Admin Upload JSON Error:", err.message);
        res.status(500).json({ message: "Failed to process JSON upload" });
    }
});

// PUT update an existing match
router.put('/scores/admin/:matchId', async (req, res) => {
    try {
        const { matchId } = req.params;
        const updatedScore = await Score.findOneAndUpdate(
            { matchId },
            { $set: req.body },
            { new: true }
        );
        if (!updatedScore) return res.status(404).json({ message: "Match not found" });
        res.json({ message: "Match updated successfully", match: updatedScore });
    } catch (err) {
        console.error("Admin Update Score Error:", err.message);
        res.status(500).json({ message: "Failed to update match" });
    }
});

// DELETE a match
router.delete('/scores/admin/:matchId', async (req, res) => {
    try {
        const { matchId } = req.params;
        const result = await Score.findOneAndDelete({ matchId });
        if (!result) return res.status(404).json({ message: "Match not found" });
        res.json({ message: "Match deleted successfully" });
    } catch (err) {
        console.error("Admin Delete Score Error:", err.message);
        res.status(500).json({ message: "Failed to delete match" });
    }
});

// ==========================================
//                 VIDEOS API
// ==========================================

router.get('/videos/feed', async (req, res) => {
    try {
        const { channelId, playlistId } = req.query;
        const targetChannel = channelId || 'UCSRQXk5yErn4e14vN76upOw';
        let rssUrl;

        if (playlistId) {
            rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
        } else {
            rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${targetChannel}`;
        }

        console.log(`[Video Feed] Fetching: ${rssUrl}`);
        const response = await fetch(rssUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        if (!response.ok) {
            console.warn(`[Video Feed] RSS Failed (${response.status}). Attempting scrape fallback...`);
            const scrapedVideos = await scrapeChannelVideos(targetChannel);
            if (scrapedVideos.length > 0) return res.json(scrapedVideos);

            throw new Error(`Failed to fetch YouTube RSS: ${response.status} ${response.statusText}`);
        }

        const xmlText = await response.text();
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;
        const videos = [];

        while ((match = entryRegex.exec(xmlText)) !== null) {
            const entry = match[1];
            const idMatch = /<yt:videoId>(.*?)<\/yt:videoId>/.exec(entry);
            const titleMatch = /<title>(.*?)<\/title>/.exec(entry);
            const pubMatch = /<published>(.*?)<\/published>/.exec(entry);
            const authorMatch = /<name>(.*?)<\/name>/.exec(entry);

            if (idMatch && titleMatch) {
                const title = titleMatch[1];
                if (!title.toLowerCase().includes('#shorts')) {
                    videos.push({
                        id: idMatch[1],
                        title: title,
                        thumbnail: `https://i.ytimg.com/vi/${idMatch[1]}/maxresdefault.jpg`,
                        channelTitle: authorMatch ? authorMatch[1] : 'Unknown',
                        publishTime: pubMatch ? new Date(pubMatch[1]) : new Date(),
                        description: 'live-feed'
                    });
                }
            }
        }
        res.json(videos);
    } catch (err) {
        console.error("[Video Feed] Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

router.get('/videos/search/remote', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const html = await response.text();

        const jsonMatch = /var ytInitialData = ({.*?});/.exec(html);
        const videos = [];

        if (jsonMatch && jsonMatch[1]) {
            const data = JSON.parse(jsonMatch[1]);
            const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents;

            if (contents) {
                contents.forEach(item => {
                    const video = item.videoRenderer;
                    if (video) {
                        const title = video.title?.runs[0]?.text || 'No Title';
                        if (title.toLowerCase().includes('#shorts')) return;

                        videos.push({
                            id: video.videoId,
                            title: title,
                            thumbnail: video.thumbnail?.thumbnails[video.thumbnail.thumbnails.length - 1]?.url,
                            channelTitle: video.ownerText?.runs[0]?.text || 'Unknown',
                            publishTime: video.publishedTimeText?.simpleText || '',
                            description: 'search-result'
                        });
                    }
                });
            }
        }
        res.json(videos.slice(0, 40));
    } catch (err) {
        console.error("[Remote Search] Error:", err.message);
        res.json([]);
    }
});

async function scrapeChannelVideos(channelId) {
    try {
        const url = `https://www.youtube.com/channel/${channelId}/videos`;
        console.log(`[Scrape] Fetching ${url}`);
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const text = await response.text();
        const jsonMatch = /var ytInitialData = ({.*?});/.exec(text);
        if (!jsonMatch) return [];

        const data = JSON.parse(jsonMatch[1]);
        const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs;
        const videosTab = tabs?.find(t => t.tabRenderer?.content?.richGridRenderer);
        const contents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents;

        if (!contents) return [];

        return contents.map(item => {
            const video = item.richItemRenderer?.content?.videoRenderer;
            if (!video) return null;
            return {
                id: video.videoId,
                title: video.title?.runs[0]?.text || 'No Title',
                thumbnail: video.thumbnail?.thumbnails[video.thumbnail.thumbnails.length - 1]?.url,
                channelTitle: video.ownerText?.runs[0]?.text || 'Unknown',
                publishTime: video.publishedTimeText?.simpleText || '',
                description: 'scraped-fallback'
            };
        }).filter(Boolean);
    } catch (e) {
        console.error("[Scrape] Failed", e.message);
        return [];
    }
}

// ==========================================
//                 PLAYERS API
// ==========================================

router.get('/players/sync', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ message: "Player ID is required" });

        console.log(`[Sync] Fetching player stats for ID: ${id}`);
        const url = `https://${process.env.RAPIDAPI_HOST}/stats/v1/player/${id}`;
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Sync] External API failed for player id ${id}: ${response.status}. Returning local cache if exists.`);
            // Fallback to local
            const cached = await Player.findOne({ id: id.toString() });
            if (!cached) return res.status(404).json({ message: "Player not found locally or remotely" });
            return res.json({ data: cached, source: 'local-fallback' });
        }

        const data = await response.json();

        // Cache the player data in MongoDB
        if (data && data.id) {
            const playerData = {
                id: data.id.toString(),
                name: data.name,
                imageId: data.faceImageId || data.imageId,
                role: data.role,
                battingStyle: data.bat,
                bowlingStyle: data.bowl,
                intlTeam: data.intlTeam,
                bio: data.bio,
                stats: data,
                lastUpdated: new Date()
            };
            await Player.findOneAndUpdate({ id: playerData.id }, playerData, { upsert: true });
            console.log(`[Sync] Successfully cached player id ${playerData.id}`);
        }

        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("[Sync] Error fetching player data:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
//                 RANKINGS API
// ==========================================

router.get('/rankings/sync', async (req, res) => {
    try {
        const { category, formatType } = req.query;
        if (!category || !formatType) return res.status(400).json({ message: "category and formatType are required" });

        console.log(`[Sync] Fetching ${formatType} rankings for ${category}`);
        const url = `https://${process.env.RAPIDAPI_HOST}/stats/v1/rankings/${category}?formatType=${formatType}`;
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Sync] External API failed for rankings: ${response.status}.`);
            return res.status(response.status).json({ message: "External API unavailable" });
        }

        const data = await response.json();
        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("[Sync] Error fetching rankings:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
//                 FAVORITES API
// ==========================================

// Toggle a favorite item (add if not exists, remove if exists)
router.post('/favorites/toggle', async (req, res) => {
    try {
        const { uid, type, itemId, title, imageUrl, extraData } = req.body;
        if (!uid || !type || !itemId) {
            return res.status(400).json({ message: "uid, type, and itemId are required" });
        }

        const existingFav = await Favorite.findOne({ uid, type, itemId });
        if (existingFav) {
            // Un-favorite
            await Favorite.deleteOne({ _id: existingFav._id });
            return res.json({ message: "Removed from favorites", status: "removed" });
        } else {
            // Favorite
            const newFav = new Favorite({ uid, type, itemId, title, imageUrl, extraData });
            await newFav.save();
            return res.status(201).json({ message: "Added to favorites", status: "added", data: newFav });
        }
    } catch (err) {
        console.error("Favorite Toggle Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// Get all favorites for a user grouped by type
router.get('/favorites', async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ message: "uid is required" });

        const favorites = await Favorite.find({ uid }).sort({ addedAt: -1 });

        // Group by type
        const grouped = {
            players: favorites.filter(f => f.type === 'player'),
            videos: favorites.filter(f => f.type === 'video'),
            scorecards: favorites.filter(f => f.type === 'scorecard')
        };

        res.json(grouped);
    } catch (err) {
        console.error("Get Favorites Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// Admin: Delete a specific favorite by its ID
router.delete('/favorites/admin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Favorite.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ message: "Favorite not found" });
        res.json({ message: "Favorite deleted successfully" });
    } catch (err) {
        console.error("Admin Delete Favorite Error:", err.message);
        res.status(500).json({ message: "Failed to delete favorite" });
    }
});

// ==========================================
//                 TEAMS API
// ==========================================

router.get('/teams/sync', async (req, res) => {
    try {
        console.log(`[Sync] Fetching international teams from RapidAPI...`);
        const url = `https://${process.env.RAPIDAPI_HOST}/teams/v1/international`;
        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Sync] External API failed for teams: ${response.status}.`);
            return res.status(response.status).json({ message: "External API Unavailable." });
        }

        const data = await response.json();
        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("[Sync] Error fetching teams:", err.message);
        res.status(500).json({ message: err.message });
    }
});


router.get('/teams/:teamId/players', async (req, res) => {
    try {
        const { teamId } = req.params;
        console.log(`[API] Fetching players for team: ${teamId}`);

        // Search across various possible fields (id, name, intlTeam)
        let query = {
            $or: [
                { id: teamId },
                { teamId: teamId },
                { intlTeam: teamId },
                { 'stats.intlTeamId': teamId },
                { 'stats.intlTeam': teamId }
            ]
        };
        const players = await Player.find(query);
        res.json(players);
    } catch (err) {
        console.error("Error fetching local team players:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ==========================================
//                 PLAYERS GLOBAL API
// ==========================================

router.get('/players/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: "Search query is required" });
        }

        console.log(`[API] Searching players globally for: ${query}`);
        const url = `https://${process.env.RAPIDAPI_HOST}/stats/v1/player/search?plrN=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': getApiKey(req),
                'x-rapidapi-host': process.env.RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            console.error(`[Search] External API failed: ${response.status}`);
            return res.status(response.status).json({ message: "External API Unavailable." });
        }

        const data = await response.json();
        res.json({ data, source: 'backend-proxy' });
    } catch (err) {
        console.error("Error searching players globally:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
