// const BASE = 'https://cricbuzz-cricket2.p.rapidapi.com';
const BASE = process.env.REACT_APP_RAPIDAPI_BASE_URL;

const RAPIDAPI_KEY = process.env.REACT_APP_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.REACT_APP_RAPIDAPI_HOST;
const headers = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': RAPIDAPI_HOST,
};


export const searchScores = async (query) => {
    try {
        // Assuming API_BASE_URL refers to the same base URL as 'BASE'
        const response = await fetch(`${LOCAL_BASE}/scores/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    } catch (error) {
        console.error("Error searching scores:", error);
        return [];
    }
};

export const getLocalScore = async (matchId) => {
    try {
        const response = await fetch(`${LOCAL_BASE}/scores/${matchId}`);
        if (!response.ok) throw new Error('Local score not found');
        return await response.json();
    } catch (error) {
        console.error("Error fetching local score:", error);
        return null;
    }
};

export async function getScheduleByType(type = 'international', params = {}) {
    try {
        console.log(`Fetching schedule for ${type} via Backend Proxy...`);
        const data = await localReq(`schedule/sync?type=${type}`);
        return {
            data: data ? data.data : {},
            source: 'backend-proxy'
        };
    } catch (err) {
        console.error("Schedule Fetch Failed", err);
        return { data: {}, source: 'error' };
    }
}

async function safeGet(path, opts = {}) {
    try {
        const url = new URL(path.startsWith('/') ? path.slice(1) : path, BASE + '/');

        if (opts.params) {
            Object.keys(opts.params).forEach(key =>
                url.searchParams.append(key, opts.params[key])
            );
        }

        const resp = await fetch(url.toString(), {
            method: 'GET',
            headers: headers,
        });

        console.log('[cricApi] GET', path, 'status', resp.status);

        if (!resp.ok) {
            const errorBody = await resp.text();
            throw new Error(`API Error: ${resp.status} ${resp.statusText} - ${errorBody}`);
        }

        const data = await resp.json();
        // Return structure matching previous axios implementation
        return { data, rawResponse: resp };
    } catch (err) {
        console.error('[cricApi] GET error', path, err.message);
        // Append URL to error for visibility
        err.message = `${err.message} (URL: ${BASE}/${path})`;
        throw err;
    }
}

// News
export async function getNews() {
    const { data, rawResponse } = await safeGet('news/v1/index');
    return { data, rawResponse };
}

export async function getNewsByTopic(topicId = 349) {
    try {
        console.log("Syncing news via Backend Proxy for topic:", topicId);
        // Call the new backend sync endpoint
        // This endpoint will: Fetch External -> Save to DB -> Return DB Content
        const data = await localReq(`topic-news/sync?topicId=${topicId}`);

        // Return structured data for UI
        return {
            data: data ? data.data : { storyList: [] },
            source: 'backend-sync'
        };
    } catch (err) {
        console.error("Backend Sync Failed, falling back to cached...", err);
        // Fallback to whatever is in local DB if sync fails (e.g. offline)
        return getLocalTopicNews(topicId);
    }
}

// Updated helper to get local news by topic
export async function getLocalTopicNews(topicId) {
    try {
        // If topicId is provided, backend filters by it. If not, gets all.
        const query = topicId ? `?topicId=${topicId}` : '';
        const data = await localReq(`topic-news${query}`);
        // Transform to match structure expected by UI
        return { data: { storyList: data ? data.map(item => ({ story: item })) : [] }, source: 'local-db' };
    } catch (err) {
        console.error("Failed to fetch local topic news", err);
        return { data: { storyList: [] }, source: 'local-db-error' };
    }
}


// Match center / scorecards
/**
 * @deprecated Use getHybridMatches instead. This function relies on the old RapidAPI client which is deprecated.
 */
export async function getLiveMatches() {
    console.warn("getLiveMatches is deprecated. Use getHybridMatches.");
    const { data, rawResponse } = await safeGet('matches/v1/live');
    return { data, rawResponse };
}

export async function getMatchCenter(matchId) {
    if (!matchId) throw new Error('matchId required');
    const { data, rawResponse } = await safeGet(`mcenter/v1/${matchId}`);
    return { data, rawResponse };
}
export async function getScard(matchId) {
    if (!matchId) throw new Error('matchId required');
    const { data, rawResponse } = await safeGet(`mcenter/v1/${matchId}/scard`);
    return { data, rawResponse };
}


// Team and misc
export async function getTeamForMatch(matchId, teamId) {
    if (!matchId || !teamId) throw new Error('matchId and teamId required');
    const { data, rawResponse } = await safeGet(`mcenter/v1/${matchId}/team/${teamId}`);
    return { data, rawResponse };
}
export async function getInternationalTeams() {
    try {
        console.log("Fetching international teams (Hybrid)...");
        // Proxy request directly without using synthesized local team names
        const proxyData = await localReq('teams/sync');
        if (proxyData && proxyData.data && proxyData.data.list) {
            return { data: proxyData.data, source: 'backend-proxy' };
        }

        // Fallback to External API
        const { data, rawResponse } = await safeGet('teams/v1/international');
        return { data, rawResponse, source: 'external' };
    } catch (err) {
        console.error("Error in getInternationalTeams:", err);
        return { data: { list: [] }, source: 'error' };
    }
}

export async function getLeagueSeries() {
    const { data, rawResponse } = await safeGet('series/v1/league');
    return { data, rawResponse };
}

export async function getSeriesSquads(seriesId) {
    if (!seriesId) throw new Error('seriesId required');
    const { data, rawResponse } = await safeGet(`series/v1/${seriesId}/squads`);
    return { data, rawResponse };
}
export async function getTeamStats(teamId, statsType = 'mostRuns') {
    if (!teamId) return { data: { stats: [] }, source: 'fallback' };
    try {
        const { data, rawResponse } = await safeGet(`stats/v1/team/${teamId}`, { params: { statsType } });
        return { data, rawResponse };
    } catch (err) {
        console.warn(`RapidAPI getTeamStats failed for team ${teamId}, using local mock data.`, err);
        return {
            data: {
                stats: [
                    { name: "Player One", value: "450" },
                    { name: "Player Two", value: "320" }
                ]
            }
        };
    }
}

// Team Details Endpoints
export async function getTeamSchedule(teamId) {
    try {
        const { data, rawResponse } = await safeGet(`teams/v1/${teamId}/schedule`);
        return { data, rawResponse };
    } catch (err) {
        console.warn(`RapidAPI getTeamSchedule failed for team ${teamId}, using local mock data.`, err);
        return {
            data: {
                teamMatchesData: [
                    {
                        matchDetailsMap: {
                            key: "Upcoming Matches",
                            match: [
                                {
                                    matchId: "mock-1",
                                    seriesName: "International Tour",
                                    team1: { teamName: teamId },
                                    team2: { teamName: "Opponent A" },
                                    venueInfo: { ground: "Stadium One", city: "London" },
                                    state: "Upcoming",
                                    status: "Starts tomorrow"
                                },
                                {
                                    matchId: "mock-2",
                                    seriesName: "International Cup",
                                    team1: { teamName: teamId },
                                    team2: { teamName: "Opponent B" },
                                    venueInfo: { ground: "Stadium Two", city: "Melbourne" },
                                    state: "Upcoming",
                                    status: "Starts in 3 days"
                                }
                            ]
                        }
                    }
                ]
            }
        };
    }
}

export async function getTeamResults(teamId) {
    try {
        const { data, rawResponse } = await safeGet(`teams/v1/${teamId}/results`);
        return { data, rawResponse };
    } catch (err) {
        console.warn(`RapidAPI getTeamResults failed for team ${teamId}, using local mock data.`, err);
        return {
            data: {
                teamMatchesData: [
                    {
                        matchDetailsMap: {
                            key: "Recent Matches",
                            match: [
                                {
                                    matchId: "mock-r1",
                                    seriesName: "International Tour",
                                    team1: { teamName: teamId },
                                    team2: { teamName: "Opponent A" },
                                    venueInfo: { ground: "Stadium One", city: "London" },
                                    state: "Complete",
                                    status: `${teamId} won by 4 wickets`
                                },
                                {
                                    matchId: "mock-r2",
                                    seriesName: "International Cup",
                                    team1: { teamName: teamId },
                                    team2: { teamName: "Opponent B" },
                                    venueInfo: { ground: "Stadium Two", city: "Melbourne" },
                                    state: "Complete",
                                    status: "Opponent B won by 20 runs"
                                }
                            ]
                        }
                    }
                ]
            }
        };
    }
}

export async function getTeamNews(teamId) {
    if (!teamId) return { data: { storyList: [] }, source: 'fallback' };
    try {
        const response = await localReq(`news/team/sync?teamId=${teamId}`);
        return {
            data: response ? response.data : { storyList: [] },
            source: response ? response.source : 'backend-proxy'
        };
    } catch (err) {
        console.warn("Team News Proxy Failed, using empty list:", err);
        return { data: { storyList: [] }, source: 'fallback-error' };
    }
}

export async function getTeamPlayers(teamId) {
    try {
        console.log(`Fetching players for team ${teamId} (Hybrid)...`);

        // 1. Try local DB first
        const localPlayers = await localReq(`teams/${teamId}/players`);
        if (localPlayers && localPlayers.length > 0) {
            return {
                data: { player: localPlayers },
                source: 'local-db'
            };
        }

        // 2. Fallback to External API
        const { data, rawResponse } = await safeGet(`teams/v1/${teamId}/players`);
        return { data, rawResponse, source: 'external' };
    } catch (err) {
        console.warn(`RapidAPI getTeamPlayers failed for team ${teamId}, using local mock data.`, err);
        return {
            data: {
                player: [
                    { id: "mock-p1", name: "Player One", role: "Batsman" },
                    { id: "mock-p2", name: "Player Two", role: "Allrounder" },
                    { id: "mock-p3", name: "Player Three", role: "Bowler" }
                ]
            }
        };
    }
}

export async function getRankings(category = 'batsmen', formatType = 'test') {
    try {
        console.log(`Fetching rankings for ${category} (${formatType}) via Backend Proxy...`);
        const data = await localReq(`rankings/sync?category=${category}&formatType=${formatType}`);
        return { data: data ? data.data : null, source: 'backend-proxy' };
    } catch (err) {
        console.error("Rankings Fetch Failed", err);
        return { data: null, source: 'error' };
    }
}

export async function searchPlayers(query) {
    if (!query) throw new Error('query required');
    try {
        console.log(`Searching globally for player: ${query}...`);
        const response = await localReq(`players/search?query=${encodeURIComponent(query)}`);
        return { data: response ? response.data : null, source: 'backend-proxy' };
    } catch (err) {
        console.error("Player Search Proxy Failed", err);
        throw err;
    }
}

export function getImageUrl(imageId) {
    if (!imageId) return 'https://via.placeholder.com/150?text=No+Image';
    // Use local backend to serve cached images
    // The backend ImageController now handles fetching from remote if not found locally
    return `${LOCAL_BASE}/images/${imageId}`;
}

export async function getPlayerStats(playerId) {
    try {
        console.log(`Fetching player ${playerId} via Backend Proxy...`);
        // Call our own backend, which now handles the external fetch + caching
        const response = await localReq(`players/sync?id=${playerId}`);

        if (!response || !response.data) {
            throw new Error(response?.message || "Player not found locally and External API limit may be exceeded. Please try again later.");
        }
        return { data: response.data }; // Backend returns the player object wrapped in data
    } catch (e) {
        console.error("Player fetch failed", e);
        throw e;
    }
}



// Local Backend Config
const LOCAL_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000/api';

// Helper for Local API calls
async function localReq(endpoint, method = 'GET', body = null) {
    try {
        const opts = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': RAPIDAPI_KEY
            }
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${LOCAL_BASE}/${endpoint}`, opts);
        if (!res.ok) throw new Error(`Local API Error: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('Local Backend Error:', endpoint, err.message);
        return null; // Fail gracefully
    }
}

// --- HYBRID FUNCTIONS ---

// Hybrid News:
// 1. If search is present, Query Local DB.
// 2. If no search, Try External API -> Cache to Local DB -> Return External.
// 3. If External fails, Fallback to Local DB.
export async function getHybridNews(search = '') {
    // Search Mode -> Local DB only
    if (search) {
        console.log("Searching news locally for:", search);
        const localData = await localReq(`news?search=${encodeURIComponent(search)}`);
        return { data: { storyList: localData ? localData.map(item => ({ story: item })) : [] }, source: 'local-search' };
    }

    // Live Mode
    try {
        console.log("Fetching main news via Backend Proxy...");
        const response = await localReq(`news/sync`); // Call Backend Sync

        if (!response || !response.data || !response.data.storyList || response.data.storyList.length === 0) {
            throw new Error("No news returned from backend sync");
        }

        return { ...response, source: 'backend-sync' };

    } catch (err) {
        console.error("News Sync Failed, falling back to Local DB...", err);
        const localData = await localReq('news'); // Get recent cached news
        return { data: { storyList: localData ? localData.map(item => ({ story: item })) : [] }, source: 'local-cache' };
    }
}

// Hybrid News Detail:
// Now strictly uses backend proxy which handles external + caching
export async function getHybridNewsDetail(id) {
    try {
        console.log("Fetching detailed news via Backend Proxy:", id);
        // Call backend sync endpoint
        const data = await localReq(`news/detail/sync?id=${id}`);

        if (!data || !data.data) {
            throw new Error("No data returned from backend sync");
        }

        return { data: data.data, source: 'backend-sync' };

    } catch (err) {
        console.error("News Detail Sync Failed, falling back to Local DB...", err);
        // Fallback: Try to find this specific news in our local DB
        const localData = await localReq(`news/${id}`);
        if (!localData) throw new Error("News not found in cache");

        return { data: localData, source: 'local-cache' };
    }
}

// Hybrid Matches:
// Fetches live scores directly from local MongoDB backend
export async function getHybridMatches() {
    try {
        const localData = await localReq('scores');
        return { data: localData || [], source: 'local-cache' };
    } catch (err) {
        console.error("Failed to fetch matches from MongoDB:", err);
        return { data: [], source: 'local-cache' };
    }
}

// Get All Local Matches (Past/Recent History)
export async function getAllLocalMatches() {
    try {
        console.log("Fetching all local matches...");
        const localData = await localReq('scores');
        return localData || [];
    } catch (err) {
        console.error("Failed to fetch local matches", err);
        return [];
    }
}

// Sync Firebase User to MongoDB
export async function syncUserToDB(user) {
    if (!user) return null;
    try {
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || ''
        };
        const response = await localReq('users/sync', 'POST', userData);
        console.log("User synced to MongoDB successfully", response);
        return response;
    } catch (err) {
        console.error("Failed to sync user to MongoDB", err);
        return null;
    }
}

// ---------------------- FAVORITES ----------------------
export async function toggleFavorite(uid, type, itemId, title = '', imageUrl = '', extraData = {}) {
    try {
        const payload = { uid, type, itemId, title, imageUrl, extraData };
        return await localReq('favorites/toggle', 'POST', payload);
    } catch (err) {
        console.error("Toggle Favorite Error:", err);
        throw err;
    }
}

export async function getFavorites(uid) {
    try {
        const response = await fetch(`${LOCAL_BASE}/favorites?uid=${encodeURIComponent(uid)}`);
        if (!response.ok) throw new Error("Failed to fetch favorites");
        return await response.json();
    } catch (err) {
        console.error("Get Favorites Error:", err);
        return { players: [], videos: [], scorecards: [] };
    }
}

// ---------------------- ADMIN / USER MANAGEMENT ----------------------
export async function getAllUsers() {
    return await localReq('users');
}

export async function getUserById(uid) {
    try {
        const response = await fetch(`${LOCAL_BASE}/users/${encodeURIComponent(uid)}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        console.error("Failed to fetch user by id", err);
        return null;
    }
}

export async function updateUser(uid, data) {
    return await localReq(`users/${uid}`, 'PUT', data);
}

export async function deleteUser(uid) {
    return await localReq(`users/${uid}`, 'DELETE');
}

export async function deleteFavoriteAdmin(favId) {
    return await localReq(`favorites/admin/${favId}`, 'DELETE');
}

// ---------------------- ADMIN / MATCH MANAGEMENT ----------------------
export async function getAllAdminMatches() {
    return await localReq('scores/admin/all');
}

export async function addAdminMatch(data) {
    return await localReq('scores/admin/add', 'POST', data);
}

export async function updateAdminMatch(matchId, data) {
    return await localReq(`scores/admin/${matchId}`, 'PUT', data);
}

export async function deleteAdminMatch(matchId) {
    return await localReq(`scores/admin/${matchId}`, 'DELETE');
}

export async function uploadAdminMatchJson(jsonData) {
    return await localReq('scores/admin/upload-json', 'POST', { jsonData });
}

export async function searchAdminMatches(query) {
    return await localReq(`scores/search?query=${encodeURIComponent(query)}`);
}

const cricapi = {
    getMatchCenter,
    getScard,
    getTeamForMatch,
    getInternationalTeams,
    getTeamStats,
    getNews,
    // New exports
    getHybridNews,
    getHybridMatches,
    getHybridNewsDetail,
    searchScores,
    getAllLocalMatches,
    getVideos: async (query) => {
        try {
            const q = query ? `?q=${encodeURIComponent(query)}` : '';
            return await localReq(`videos${q}`);
        } catch (e) {
            console.error("Video fetch failed", e);
            return [];
        }
    },
    importVideosRSS: async (channelId, category) => {
        return await localReq('videos/import/rss', 'POST', { channelId, category });
    },
    importVideosBulk: async (urls, category) => {
        return await localReq('videos/import/bulk', 'POST', { urls, category });
    },
    getLiveFeed: async (channelId) => {
        try {
            return await localReq(`videos/feed?channelId=${channelId}`);
        } catch (e) {
            console.error("Live feed fetch failed", e);
            return [];
        }
    },
    getPlaylistFeed: async (playlistId) => {
        try {
            return await localReq(`videos/feed?playlistId=${playlistId}`);
        } catch (e) {
            console.error("Playlist feed fetch failed", e);
            return [];
        }
    },
    searchRemoteVideos: async (query) => {
        try {
            return await localReq(`videos/search/remote?q=${encodeURIComponent(query)}`);
        } catch (e) {
            console.error("Remote search failed", e);
            return [];
        }
    },
    syncUserToDB,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    deleteFavoriteAdmin,

    getAllAdminMatches,
    addAdminMatch,
    updateAdminMatch,
    deleteAdminMatch,
    uploadAdminMatchJson,
    searchAdminMatches,

    getNewsByTopic,
    getLocalTopicNews,
    getScheduleByType,
    getTeamSchedule,
    getTeamResults,

    getTeamNews,
    getTeamPlayers,
    getPlayerStats,
    getRankings,
    getImageUrl,
    getLeagueSeries,
    getSeriesSquads,
    toggleFavorite,
    getFavorites
};

export default cricapi;
