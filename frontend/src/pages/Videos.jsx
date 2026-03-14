import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Css/Videos.css';
import cricapi from '../api/cricapi';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import FavoriteButton from '../components/FavoriteButton';

export default function Videos() {
    const [activeFilter, setActiveFilter] = useState('live');
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [loading, setLoading] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (location.state && location.state.video) {
            setSelectedVideo(location.state.video);
            // Clear the state so it doesn't reopen if we navigate back and forth
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Admin Inputs (Moved up)
    const channelId = 'UCSRQXk5yErn4e14vN76upOw'; // Default Cricbuzz Official
    const [searchQuery, setSearchQuery] = useState('');


    const ALLOWED_CHANNELS = [
        'icc', 'cricbuzz', 'star sports', 'sony sports network',
        'jiocinema', 'bcci', 'cricket.com.au', 'england & wales cricket board',
        'pakistan cricket', 'sri lanka cricket', 'new zealand cricket',
        'windies cricket', 'bangladesh cricket: the tigers',
        'supersport', 'sky sports cricket', 'willow', 'fox cricket', 'tata ipl', 'ipl'
    ];

    const filterOfficialVideos = (videosRaw) => {
        if (!videosRaw || !Array.isArray(videosRaw)) return [];
        const filtered = videosRaw.filter(video => {
            if (!video.channelTitle || video.channelTitle === 'Unknown') return true; // Keep if no channelTitle or if scraped fallback
            const channelLower = video.channelTitle.toLowerCase();
            return ALLOWED_CHANNELS.some(allowed => channelLower.includes(allowed));
        });
        return filtered.slice(0, 9);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);

        setActiveFilter('search'); // Custom filter state for search results
        try {
            // Append 'cricket' to general searches for better context
            const query = searchQuery.toLowerCase().includes('cricket') ? searchQuery : `${searchQuery} cricket highlights`;
            const results = await cricapi.searchRemoteVideos(query);

            // For explicit searches, we trust the YouTube search algorithm more than our strict channel filter.
            // This prevents valid fan-made highlights or smaller official channels from being hidden.
            setVideos(results || []);
        } catch (error) {
            console.error("Search failed", error);
            setVideos([]);
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        const fetchVideos = async () => {
            setLoading(true);
            try {
                let data = [];
                if (activeFilter === 'live') {
                    // Fetch Live Feed (Channel Uploads)
                    data = await cricapi.getLiveFeed(channelId);
                } else if (activeFilter === 'new') {
                    // Fetch Highlights (Playlist + Local)
                    // Note: Using Channel Feed as Highlights for now until specific PL is found
                    data = await cricapi.getLiveFeed(channelId);
                    // In real scenario: await cricapi.getPlaylistFeed(PLAYLIST_IDS.highlights);
                } else if (activeFilter === 'ipl') {
                    // Fetch IPL Highlights via Remote Search
                    // Using a specific, high-relevance query
                    data = await cricapi.searchRemoteVideos('Tata IPL official match highlights');
                }

                if (data && Array.isArray(data)) {
                    // Only filter official channels for the Live Feed to maintain a clean default look.
                    // For IPL highlights (search-based), let all relevant YouTube results pass through.
                    setVideos(activeFilter === 'ipl' ? data : filterOfficialVideos(data));
                } else {
                    setVideos([]);
                }
            } catch (error) {
                console.error("Error loading videos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [activeFilter, channelId, filterOfficialVideos]); // Added filterOfficialVideos to fix ESLint warning


    // YouTube Embed URL generator
    const getEmbedUrl = (id) => `https://www.youtube.com/embed/${id}?autoplay=1`;

    // Admin State -- Moved up to avoid ReferenceError
    // Admin functions and states removed as per request.
    // The following are kept in case needed later, but UI removed.
    // const [showAdmin, setShowAdmin] = useState(false);
    // const [adminTab, setAdminTab] = useState('rss');
    // const [importLoading, setImportLoading] = useState(false);
    // const [importStatus, setImportStatus] = useState('');

    // const handleImportRSS = async () => {
    //     setImportLoading(true);
    //     setImportStatus('Importing...');
    //     try {
    //         const res = await cricapi.importVideosRSS(channelId, importCategory);
    //         setImportStatus(res && res.message ? res.message : 'Import Successful');
    //         // Refresh list
    //         setTimeout(() => window.location.reload(), 1500);
    //     } catch (e) {
    //         setImportStatus('Error importing: ' + e.message);
    //     } finally {
    //         setImportLoading(false);
    //     }
    // };

    // const handleImportBulk = async () => {
    //     setImportLoading(true);
    //     setImportStatus('Processing URLs...');
    //     try {
    //         const res = await cricapi.importVideosBulk(bulkUrls, importCategory);
    //         setImportStatus(res && res.message ? res.message : 'Import Successful');
    //         // Refresh list
    //         setTimeout(() => window.location.reload(), 1500);
    //     } catch (e) {
    //         setImportStatus('Error importing: ' + e.message);
    //     } finally {
    //         setImportLoading(false);
    //     }
    // };

    return (
        <div className="videos-page">
            <BackButton />
            <div className="videos-header">
                <h1>Match Highlights</h1>
                <p className="videos-subtitle">
                    Watch the latest match highlights, classic encounters, and expert analysis directly from YouTube.
                </p>
                {/* Admin Tools Removed as per request */}
            </div>

            {/* Search & Filter Section */}
            <div className="video-controls">
                <div className="search-bar-container">
                    <input
                        type="text"
                        placeholder="Search for highlights, players, or matches..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="video-search-input"
                    />
                    <button className="video-search-btn" onClick={handleSearch}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                </div>

                <div className="filter-bar">
                    <button
                        className={`filter-btn ${activeFilter === 'new' ? 'active' : ''}`}
                        onClick={() => { setActiveFilter('new'); setSearchQuery(''); }}
                    >
                        Highlights
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'ipl' ? 'active' : ''}`}
                        onClick={() => { setActiveFilter('ipl'); setSearchQuery(''); }}
                    >
                        IPL Highlights
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'live' ? 'active' : ''}`}
                        onClick={() => { setActiveFilter('live'); setSearchQuery(''); }}
                    >
                        Live Feed
                    </button>
                </div>
            </div>

            <div className="videos-grid-wrapper">
                {loading ? (
                    <Loader message="Loading Videos..." />
                ) : (
                    <div className="video-grid">
                        {videos.length > 0 ? videos.map(video => (
                            <div key={video.id} className="video-card" onClick={() => setSelectedVideo(video)}>
                                <div className="video-thumbnail-container">
                                    <img src={video.thumbnail} alt={video.title} className="video-thumbnail" onError={(e) => e.target.src = 'https://placehold.co/600x338?text=Video'} />
                                    <div className="play-icon-overlay">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                    <div className="video-favorite-container">
                                        <FavoriteButton
                                            type="video"
                                            itemId={video.id}
                                            title={video.title}
                                            imageUrl={video.thumbnail}
                                        />
                                    </div>
                                </div>
                                <div className="video-info">
                                    <div className="video-meta">
                                        <span className={`video-badge ${activeFilter === 'new' ? 'badge-new' : activeFilter === 'ipl' ? 'badge-ipl' : 'badge-old'}`}>
                                            {activeFilter === 'new' ? 'New' : (activeFilter === 'ipl' ? 'IPL' : 'Live')}
                                        </span>
                                        <span className="video-date">
                                            {video.publishTime ? (
                                                isNaN(new Date(video.publishTime).getTime())
                                                    ? video.publishTime // It's probably a string like "1 hour ago"
                                                    : new Date(video.publishTime).toDateString() // It's a valid date string
                                            ) : ''}
                                        </span>
                                    </div>
                                    <h3 className="video-title" title={video.title}>{video.title}</h3>
                                </div>
                            </div>
                        )) : (
                            <div className="no-data" style={{ gridColumn: '1/-1', textAlign: 'center' }}>
                                <p>No videos found. Please check your API configuration.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Player */}
            {
                selectedVideo && (
                    <div className="video-modal-overlay" onClick={() => setSelectedVideo(null)}>
                        <div className="video-modal-content" onClick={e => e.stopPropagation()}>
                            <button className="close-modal-btn" onClick={() => setSelectedVideo(null)}>&times;</button>
                            <iframe
                                width="100%"
                                height="100%"
                                src={getEmbedUrl(selectedVideo.id)}
                                title={selectedVideo.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                )
            }
        </div >
    );
};