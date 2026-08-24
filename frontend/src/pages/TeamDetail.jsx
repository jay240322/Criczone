import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';

import { getTeamSchedule, getTeamResults, getTeamNews, getTeamPlayers, getTeamStats, getImageUrl } from '../api/cricapi';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import './Css/teams.css'; // Reusing teams css for base styles, might need specific ones

export default function TeamDetail() {
    const { id } = useParams();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('schedule');
    const [tabData, setTabData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Quick access to basic team info passed from previous page
    const teamInfo = location.state?.team || { teamName: 'Team Details', imageId: null };

    useEffect(() => {
        setSearchTerm(''); // Reset search on tab change
        const fetchData = async () => {
            setLoading(true);
            setTabData(null);
            try {
                let response;

                switch (activeTab) {
                    case 'schedule':
                        response = await getTeamSchedule(id);
                        break;
                    case 'results':
                        response = await getTeamResults(id);
                        break;
                    case 'news':
                        response = await getTeamNews(id);
                        // Filter out valid news items immediately if needed
                        if (response.data && response.data.storyList) {
                            response.data.storyList = response.data.storyList.filter(item => item.story);
                        }
                        break;
                    case 'players':
                        response = await getTeamPlayers(id);
                        break;
                    case 'stats':
                        response = await getTeamStats(id);
                        break;
                    default:
                        break;
                }
                console.log(`Team ${activeTab} data:`, response?.data);
                setTabData(response?.data);
            } catch (error) {
                console.error(`Error fetching team ${activeTab}:`, error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id, activeTab]);



    const renderContent = () => {
        if (loading) return <Loader message="Loading Team Details..." />;
        if (!tabData) return <div className="no-data">No data available.</div>;

        switch (activeTab) {
            case 'schedule':
            case 'results':
                // Check for teamMatchesData structure
                let matchesToRender = [];
                if (tabData.teamMatchesData) {
                    matchesToRender = tabData.teamMatchesData;
                } else if (tabData.matchScheduleMap) {
                    matchesToRender = tabData.matchScheduleMap;
                }

                if (matchesToRender.length === 0) return <div>No matches found.</div>;

                return (
                    <div className="schedule-list">
                        {matchesToRender.map((group, idx) => {
                            // Handle nested objects: matchDetailsMap, scheduleAdWrapper, or direct list
                            let matchList = [];
                            let dateStr = "Date Unknown";

                            if (group.matchDetailsMap) {
                                dateStr = group.matchDetailsMap.key;
                                matchList = group.matchDetailsMap.match;
                            } else if (group.scheduleAdWrapper) {
                                dateStr = group.scheduleAdWrapper.date;
                                matchList = group.scheduleAdWrapper.matchScheduleList;
                            }

                            if (!matchList || matchList.length === 0) return null;

                            return (
                                <div key={idx} className="schedule-group">
                                    <div className="group-date">{dateStr}</div>
                                    {matchList.map((item, mIdx) => {
                                        // Item might be wrapper with matchInfo or direct
                                        const match = item.matchInfo || item;
                                        if (!match) return null;

                                        return (
                                            <div key={match.matchId || mIdx} className="match-card">
                                                <div className="match-info-left">
                                                    <div className="series-name">{match.seriesName}</div>
                                                    <div className="match-title">
                                                        {match.team1?.teamName} vs {match.team2?.teamName}
                                                    </div>
                                                    <div className="match-venue">{match.venueInfo?.ground}, {match.venueInfo?.city}</div>
                                                    <div className="match-status" style={{ color: match.state === 'Complete' ? '#388e3c' : '#f57c00' }}>
                                                        {match.status || match.matchDesc}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                );

            case 'news':
                const stories = tabData.storyList;
                if (!stories || stories.length === 0) return <div>No news found.</div>;
                return (
                    <div className="news-grid">
                        {stories.map((item, idx) => {
                            const story = item.story;
                            if (!story) return null;
                            return (
                                <Link to={`/news/${story.id}`} key={story.id || idx} className="news-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {story.coverImage?.id && (
                                        <img
                                            src={getImageUrl(story.coverImage.id)}
                                            alt={story.hline}
                                            className="news-img"
                                        />
                                    )}
                                    <div className="news-content">
                                        <h3>{story.hline}</h3>
                                        <p>{story.intro}</p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                );

            case 'players':
                const allPlayers = tabData.player || [];
                // Filter players based on search and validity
                const filteredPlayers = allPlayers.filter(p => {
                    if (!p.name || !p.id) return false;
                    return p.name.toLowerCase().includes(searchTerm.toLowerCase());
                });

                return (
                    <div>
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                marginBottom: '2rem',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '1rem'
                            }}
                        />
                        {filteredPlayers.length === 0 ? <p>No players found.</p> : (
                            <div className="teams-grid">
                                {filteredPlayers.map(p => (
                                    <Link to={`/players/${p.id}?name=${encodeURIComponent(p.name)}`} key={p.id} className="team-card player-card">
                                        {p.imageId ? (
                                            <img src={getImageUrl(p.imageId)} alt={p.name} className="team-flag" />
                                        ) : <div className="team-flag placeholder" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N/A</div>}
                                        <h3>{p.name}</h3>
                                        <div className="team-short-name">{p.role || 'Player'}</div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                );

            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="teams-page-wrapper">
            <div className="teams-container">
                <BackButton />
                <div className="team-detail-header">
                    <img src={getImageUrl(teamInfo.imageId)} alt={teamInfo.teamName} className="team-detail-flag" />
                    <h1>{teamInfo.teamName}</h1>
                </div>

                <div className="schedule-tabs">
                    {['schedule', 'results', 'news', 'players', 'stats'].map(tab => (
                        <button
                            key={tab}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="team-content-area">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};