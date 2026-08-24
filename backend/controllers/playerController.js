const Player = require('../models/Player');
const imageController = require('./imageController');


// Configuration (Should ideally be in .env)
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'cricbuzz-cricket2.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

const headers = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': RAPIDAPI_HOST,
};

// Helper: Fetch from External API
async function fetchFromExternal(id, req) {
    try {
        const apiKey = req.headers['x-rapidapi-key'] || process.env.RAPIDAPI_KEY;
        const headers = {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'cricbuzz-cricket2.p.rapidapi.com',
        };

        const url = `${BASE_URL}/stats/v1/player/${id}`;
        console.log(`[Backend] Fetching external: ${url}`);
        const response = await fetch(url, { headers });
        if (!response.ok) {
            console.error(`[Backend] External API Error: ${response.status} ${response.statusText}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("[Backend] Fetch error:", error);
        return null;
    }
}

exports.savePlayer = async (req, res) => {
    try {
        const { id, ...playerData } = req.body;
        const player = await Player.findOneAndUpdate(
            { id: id },
            { id, ...playerData, lastUpdated: Date.now() },
            { upsert: true, new: true }
        );
        res.status(200).json(player);
    } catch (error) {
        res.status(500).json({ message: 'Error saving player', error });
    }
};

exports.getPlayer = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Try Local DB
        let player = await Player.findOne({ id });

        // 2. If not found or stale/incomplete, fetch from External
        if (!player || !player.DoBFormat) {
            console.log(`[Backend] Player ${id} not found locally. Fetching from external...`);
            const externalData = await fetchFromExternal(id, req);

            if (externalData) {
                // Save to DB
                player = await Player.findOneAndUpdate(
                    { id },
                    {
                        id,
                        ...externalData, // Save full dump for flexibility
                        name: externalData.name || (externalData.appIndex?.seoTitle?.split(' Profile')[0]) || "Unknown",
                        lastUpdated: Date.now()
                    },
                    { upsert: true, new: true }
                );
            } else {
                console.log(`[Backend] External API failed for player ${id}. Serving mock fallback.`);
                const { getMockPlayer } = require('../services/mockPlayer');
                const mock = getMockPlayer(id);
                player = await Player.findOneAndUpdate(
                    { id },
                    { id, ...mock, lastUpdated: Date.now() },
                    { upsert: true, new: true }
                );
            }
        }

        if (!player) return res.status(404).json({ message: 'Player not found' });
        res.status(200).json(player);

    } catch (error) {
        console.error("Get Player Error:", error);
        res.status(500).json({ message: 'Error fetching player', error: error.message });
    }
};

exports.getAllPlayers = async (req, res) => {
    try {
        const players = await Player.find().sort({ lastUpdated: -1 });
        res.status(200).json(players);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching players', error });
    }
};

exports.saveBatchPlayers = async (req, res) => {
    try {
        const players = req.body; // Expecting array of players
        if (!Array.isArray(players)) return res.status(400).json({ message: 'Input must be an array of players' });

        const operations = players.map(player => ({
            updateOne: {
                filter: { id: player.id },
                update: { $set: { ...player, lastUpdated: Date.now() } },
                upsert: true
            }
        }));

        const result = await Player.bulkWrite(operations);

        // Trigger background image download (fire and forget or wait depending on need)
        // We'll proceed but log completion
        console.log(`[Backend] Starting image downloads for ${players.length} players...`);
        Promise.allSettled(players.map(p => {
            if (p.imageId) return imageController.downloadImage(p.imageId, req);
            return Promise.resolve();
        })).then(() => console.log('[Backend] Batch image download complete.'));

        res.status(200).json({ message: 'Batch sync complete', result });
    } catch (error) {
        res.status(500).json({ message: 'Error in batch sync', error });
    }
};
