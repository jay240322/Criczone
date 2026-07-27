import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Css/home.css';
import { getHybridMatches, getHybridNews } from '../api/cricapi';
import { getNewsImage } from '../utils/images';
import Loader from '../components/Loader';
// import { getHybridNews } from '../api/cricapi';
export default function Home() {
    const [matches, setMatches] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Hybrid Fetch for Matches
                const matchResp = await getHybridMatches();
                let matchList = [];

                if (matchResp.source === 'external' && matchResp.data && matchResp.data.typeMatches) {
                    // Parse External Structure
                    matchResp.data.typeMatches.forEach(series => {
                        if (series.seriesMatches) {
                            series.seriesMatches.forEach(seriesMatch => {
                                if (seriesMatch.seriesAdWrapper) {
                                    matchList.push(...(seriesMatch.seriesAdWrapper.matches || []));
                                } else if (seriesMatch.matches) {
                                    matchList.push(...seriesMatch.matches);
                                }
                            });
                        }
                    });
                } else if (matchResp.source === 'local-cache' && Array.isArray(matchResp.data)) {
                    // Parse Local Fallback (Flat List)
                    matchList = matchResp.data;
                }                // Deduplicate matches
                const uniqueMatchesMap = new Map();
                matchList.forEach(m => {
                    const mInfo = m.json ? m : (m.matchInfo || m);
                    // 1. Try standard IDs
                    let id = mInfo.matchId || mInfo.id || m._id;

                    const t1Name = (mInfo.team1 && (mInfo.team1.shortName || mInfo.team1.teamSName || mInfo.team1.name || mInfo.team1.teamName)) || 'T1';
                    const t2Name = (mInfo.team2 && (mInfo.team2.shortName || mInfo.team2.teamSName || mInfo.team2.name || mInfo.team2.teamName)) || 'T2';
                    const teamsKey = [t1Name.toLowerCase(), t2Name.toLowerCase()].sort().join('-');

                    // The API sometimes returns same match with different IDs but same teams.
                    // We'll use the teamsKey as the primary deduplication identifier to be safe for live matches.
                    // (Assuming a team generally only plays one live match at a time)
                    const dedupeKey = id ? id.toString() : teamsKey;
                    
                    // Stronger deduplication: if we've already seen these two teams play in our list, we skip.
                    // This handles API quirks where the exact same match is returned multiple times in different wrappers.
                    let alreadyExists = false;
                    for (const existingMatch of uniqueMatchesMap.values()) {
                        const exInfo = existingMatch.json ? existingMatch : (existingMatch.matchInfo || existingMatch);
                        const exT1Name = (exInfo.team1 && (exInfo.team1.shortName || exInfo.team1.teamSName || exInfo.team1.name || exInfo.team1.teamName)) || 'T1';
                        const exT2Name = (exInfo.team2 && (exInfo.team2.shortName || exInfo.team2.teamSName || exInfo.team2.name || exInfo.team2.teamName)) || 'T2';
                        const exTeamsKey = [exT1Name.toLowerCase(), exT2Name.toLowerCase()].sort().join('-');
                        if (exTeamsKey === teamsKey && teamsKey !== 't1-t2') {
                            alreadyExists = true;
                            break;
                        }
                    }

                    if (!alreadyExists) {
                        uniqueMatchesMap.set(dedupeKey, m);
                    }
                });
                matchList = Array.from(uniqueMatchesMap.values());

                // Helper logic to sort by India matches first
                matchList.sort((a, b) => {
                    const getTeams = (m) => {
                        const mInfo = m.json ? m : (m.matchInfo || m);
                        const t1Name = (mInfo.team1 && (mInfo.team1.shortName || mInfo.team1.teamSName || mInfo.team1.name || mInfo.team1.teamName)) || '';
                        const t2Name = (mInfo.team2 && (mInfo.team2.shortName || mInfo.team2.teamSName || mInfo.team2.name || mInfo.team2.teamName)) || '';
                        return { t1Name: t1Name.toLowerCase(), t2Name: t2Name.toLowerCase() };
                    };

                    const aTeams = getTeams(a);
                    const bTeams = getTeams(b);

                    const isAInd = aTeams.t1Name === 'india' || aTeams.t2Name === 'india' || aTeams.t1Name === 'ind' || aTeams.t2Name === 'ind';
                    const isBInd = bTeams.t1Name === 'india' || bTeams.t2Name === 'india' || bTeams.t1Name === 'ind' || bTeams.t2Name === 'ind';

                    if (isAInd && !isBInd) return -1;
                    if (!isAInd && isBInd) return 1;
                    return 0; // Maintain original order otherwise
                });

                setMatches(matchList.slice(0, 6));
                if (matchResp.source === 'local-cache') {
                    // Optional: Show toast/notification that we are offline? 
                    // For now, silently fallback is fine or maybe console log
                    console.log("Using cached match data");
                }

                // Fetch News
                const newsResp = await getHybridNews();
                const stories = (newsResp.data.storyList || [])
                    .map(item => item.story)
                    .filter(story => story) // Filter out null/undefined
                    .slice(0, 4);
                setNews(stories);

            } catch (err) {
                console.error("Failed to fetch data", err);
                // setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData(); // Initial fetch

        const intervalId = setInterval(() => {
            console.log("Polling live scores...");
            fetchData();
        }, 30000); // Increased poll time to 30s to avoid hammering local/external too much mixed

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);

    if (loading && !matches.length && !news.length) return <Loader message="Loading Criczone..." />;

    const displayMatches = matches;

    return (
        <>
            <div className="heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Livescore</h2>
            </div>

            <div className="livescore-wrapper">
                {displayMatches.length > 0 ? (
                    displayMatches.map((match) => {
                        // Handle different data structures (Live API vs Historical/Search DB)
                        const isHistorical = !!match.json; // Flag for historical matches
                        const mInfo = isHistorical ? match : (match.matchInfo || match); // Historical uses flat doc, API uses nested matchInfo

                        // Extract basic details safely
                        const id = mInfo.matchId || mInfo.id;
                        const desc = mInfo.matchDesc || match.description || 'Match Details';
                        const series = mInfo.seriesName || (match.series ? match.series.name : 'Series');
                        const format = mInfo.matchFormat || match.format || 'CRICKET';
                        const status = mInfo.status || match.status || 'Status';

                        // Teams
                        const t1Name = (mInfo.team1 && (mInfo.team1.shortName || mInfo.team1.teamSName || mInfo.team1.name || mInfo.team1.teamName)) || 'T1';
                        const t2Name = (mInfo.team2 && (mInfo.team2.shortName || mInfo.team2.teamSName || mInfo.team2.name || mInfo.team2.teamName)) || 'T2';

                        const t1Score = match.matchScore?.team1Score?.inngs1
                            ? `${match.matchScore.team1Score.inngs1.runs}/${match.matchScore.team1Score.inngs1.wickets || 0}`
                            : match.team1?.runs ? `${match.team1.runs}/${match.team1.wickets || 0}` : (match.team1?.score || '');
                        const t2Score = match.matchScore?.team2Score?.inngs1
                            ? `${match.matchScore.team2Score.inngs1.runs}/${match.matchScore.team2Score.inngs1.wickets || 0}`
                            : match.team2?.runs ? `${match.team2.runs}/${match.team2.wickets || 0}` : (match.team2?.score || '');


                        return (
                            <div key={id} className="scorecard vertical-card" style={{ border: isHistorical ? '1px solid #444' : '' }}>
                                <div className="card-header">
                                    <span className="match-desc">
                                        {desc} • {series.split(' ').slice(0, 3).join(' ')}...
                                    </span>
                                    <span className="format-badge">{format}</span>
                                </div>

                                <div className="card-body">
                                    {/* Team 1 Row */}
                                    <div className="team-row">
                                        <div className="team-info">
                                            <img
                                                src={mInfo.team1?.imageId ? `https://static.cricbuzz.com/a/img/v1/i1/c${mInfo.team1.imageId}/i.jpg` : 'https://placehold.co/48x32?text=T1'}
                                                alt={t1Name}
                                                className="team-flag-small"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => e.target.src = 'https://placehold.co/48x32?text=Flag'}
                                            />
                                            <span className="team-shortname">{t1Name}</span>
                                        </div>
                                        <div className="team-score-display">
                                            {t1Score}
                                        </div>
                                    </div>

                                    {/* Team 2 Row */}
                                    <div className="team-row">
                                        <div className="team-info">
                                            <img
                                                src={mInfo.team2?.imageId ? `https://static.cricbuzz.com/a/img/v1/i1/c${mInfo.team2.imageId}/i.jpg` : 'https://placehold.co/48x32?text=T2'}
                                                alt={t2Name}
                                                className="team-flag-small"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => e.target.src = 'https://placehold.co/48x32?text=Flag'}
                                            />
                                            <span className="team-shortname">{t2Name}</span>
                                        </div>
                                        <div className="team-score-display">
                                            {t2Score}
                                        </div>
                                    </div>

                                    <div className="match-status-highlight">
                                        {status}
                                    </div>
                                </div>

                                <div className="card-footer-bar">
                                    <span className="footer-link">POINTS TABLE</span>
                                    <span className="footer-link" onClick={() => navigate(`/scorecard/${id}`)} style={{ cursor: 'pointer' }}>DETAILS</span>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="scorecard">No live matches currently.</div>
                )}
            </div>

            <div className="heading">
                <h2>Hot topics</h2>
            </div>
            <div className="news-wrapper">
                {news.length > 0 ? (
                    news.map((story) => (
                        <div key={story.id} className="news-card vertical-news" onClick={() => navigate(`/news/${story.id}`)} style={{ cursor: 'pointer' }}>
                            <img
                                src={getNewsImage(story.imageId)}
                                alt={story.hline}
                                className="news-image"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                            <div className="news-content">
                                <h3 className="news-headline">{story.hline}</h3>
                                <p className="news-intro">{story.intro}</p>
                                <span className="news-time">{new Date(parseInt(story.pubTime)).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-card">No news currently.</div>
                )}
            </div>
        </>
    );
}