import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHybridMatches, getAllLocalMatches } from '../api/cricapi';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import './Css/LiveScore.css';
import './Css/home.css'; // Inherit styling from Home

export default function LiveScore() {
    const [searchTerm, setSearchTerm] = useState('');
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [headerText, setHeaderText] = useState('Live & Recent Matches');
    const navigate = useNavigate();

    // 1. Initial Load: Sync Live Scores + Fetch History
    useEffect(() => {
        if (searchTerm.length > 0) return;

        const fetchLive = async () => {
            setLoading(true);
            try {
                // Parallel Fetch: Hybrid (Live) + Local (History)
                const [matchResp, localResp] = await Promise.all([
                    getHybridMatches(),
                    getAllLocalMatches()
                ]);

                let liveMatches = [];
                let localMatches = Array.isArray(localResp) ? localResp : [];

                // Parse Live Matches
                if (matchResp.source === 'external' && matchResp.data && matchResp.data.typeMatches) {
                    matchResp.data.typeMatches.forEach(series => {
                        if (series.seriesMatches) {
                            series.seriesMatches.forEach(seriesMatch => {
                                if (seriesMatch.seriesAdWrapper) {
                                    liveMatches.push(...(seriesMatch.seriesAdWrapper.matches || []));
                                } else if (seriesMatch.matches) {
                                    liveMatches.push(...seriesMatch.matches);
                                }
                            });
                        }
                    });
                } else if (matchResp.source === 'local-cache' && Array.isArray(matchResp.data)) {
                    liveMatches = matchResp.data;
                }

                // Merge Logic:
                // 1. Create a Map of Live Matches by ID
                const matchMap = new Map();

                // Add Live Matches (Priority)
                liveMatches.forEach(m => {
                    const id = m.matchInfo?.matchId || m.id || m.matchId; // robust id check
                    if (id) matchMap.set(String(id), m);
                });

                // Add Local Matches (Only if not already present)
                localMatches.forEach(m => {
                    const id = m.matchId || m.id;
                    if (id && !matchMap.has(String(id))) {
                        matchMap.set(String(id), m);
                    }
                });

                // Convert Map back to Array and Sort
                // Sort by: Live Status first, then Date Descending
                const mergedList = Array.from(matchMap.values()).sort((a, b) => {
                    // Helper to get status
                    const statusA = (a.matchInfo?.status || a.status || '').toLowerCase();
                    const statusB = (b.matchInfo?.status || b.status || '').toLowerCase();

                    const isLiveA = statusA.includes('live') || statusA.includes('progress');
                    const isLiveB = statusB.includes('live') || statusB.includes('progress');

                    if (isLiveA && !isLiveB) return -1;
                    if (!isLiveA && isLiveB) return 1;

                    // If both live or both not live, sort by Date
                    const dateA = new Date(a.matchInfo?.startDate || a.startDate || 0);
                    const dateB = new Date(b.matchInfo?.startDate || b.startDate || 0);

                    return dateB - dateA; // Newest first
                });

                if (mergedList.length > 0) {
                    setMatches(mergedList);
                } else {
                    setMatches([]);
                    setHeaderText("No Matches Found");
                }

            } catch (err) {
                console.error("Error syncing:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLive();
    }, [searchTerm]);

    // 2. Search Logic
    useEffect(() => {
        if (searchTerm.length === 0) {
            // Restore default behaviour (fetched by other useEffect when searchTerm is empty)
            return;
        }

        // IMMEDIATE UI UPDATE:
        // 1. Hide default matches
        setMatches([]);
        // 2. Show "Word Match" header
        setHeaderText("Word Match");

        if (searchTerm.length <= 1) return;

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:5000/api/scores/search?query=${encodeURIComponent(searchTerm)}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setMatches(data);
                    setHeaderText(`Results for "${searchTerm}"`);
                }
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleCardClick = (matchId) => {
        navigate(`/scorecard/${matchId}`);
    };

    return (
        <div className="live-score-page">
            <BackButton />
            <div className="live-score-header">
                <h1>{headerText}</h1>
                <p className="live-score-subtitle">
                    Catch real-time scores from around the globe. Can't find it? Search our archive of 21,000+ matches.
                </p>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search team (e.g. 'India'), series or venue..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="live-search-input"
                    />
                </div>
            </div>

            {/* Container: Vertical List by default */}
            <div
                className={searchTerm ? "matches-grid" : "matches-vertical-list"}
            >
                {/* DEBUG: Remove in production */}
                {/* <div style={{position: 'absolute', top: 0, left: 0, background: 'red', color: 'white'}}>Matches: {matches.length}</div> */}

                {loading && <Loader message="Loading matches..." />}

                {!loading && matches.length === 0 && (
                    <div className="no-results" style={{ width: '100%', textAlign: 'center' }}>
                        <div className="empty-state">
                            <p>No matches found.</p>
                            <small>Try a different search term.</small>
                        </div>
                    </div>
                )}

                {!loading && matches.map(match => {
                    // Normalize data for the Home-style card
                    const mInfo = match.matchInfo || match;
                    const id = mInfo.matchId || mInfo.id || match._id;
                    const desc = mInfo.matchDesc || match.description || 'Match Details';
                    const series = mInfo.seriesName || (match.series ? match.series.name : 'Series');
                    const format = mInfo.matchFormat || match.format || 'CRICKET';
                    const status = mInfo.status || match.status || 'Status';

                    // Teams - Robust Logic for API Variations (teamSName vs shortName vs teamName vs name)
                    const t1Data = mInfo.team1 || {};
                    const t2Data = mInfo.team2 || {};

                    const t1Name = t1Data.teamSName || t1Data.shortName || t1Data.teamName || t1Data.name || 'Team 1';
                    const t2Name = t2Data.teamSName || t2Data.shortName || t2Data.teamName || t2Data.name || 'Team 2';
                    const t1Score = match.team1?.runs ? `${match.team1.runs}/${match.team1.wickets}` : '';
                    const t2Score = match.team2?.runs ? `${match.team2.runs}/${match.team2.wickets}` : '';

                    // Fallback local and external flags for standard teams
                    const TEAM_LOGOS = {
                        // IPL Teams
                        'csk': '/images/flags/csk.png',
                        'rcb': '/images/flags/rcb.png',
                        'mi': '/images/flags/mi.png',
                        'kkr': '/images/flags/kkr.png',
                        'srh': '/images/flags/srh.png',
                        'dc': '/images/flags/dc.png',
                        'pbks': '/images/flags/pbks.png',
                        'rr': '/images/flags/rr.png',
                        'lsg': '/images/flags/lsg.png',
                        'gt': '/images/flags/gt.png',
                        // Countries
                        'ind': 'https://flagcdn.com/w80/in.png',
                        'aus': 'https://flagcdn.com/w80/au.png',
                        'eng': 'https://flagcdn.com/w80/gb-eng.png',
                        'pak': 'https://flagcdn.com/w80/pk.png',
                        'nz': 'https://flagcdn.com/w80/nz.png',
                        'sa': 'https://flagcdn.com/w80/za.png',
                        'sl': 'https://flagcdn.com/w80/lk.png',
                        'ban': 'https://flagcdn.com/w80/bd.png',
                        'afg': 'https://flagcdn.com/w80/af.png',
                        'ire': 'https://flagcdn.com/w80/ie.png',
                        'zim': 'https://flagcdn.com/w80/zw.png',
                        'neth': 'https://flagcdn.com/w80/nl.png',
                        'sco': 'https://flagcdn.com/w80/gb-sct.png',
                        'nep': 'https://flagcdn.com/w80/np.png',
                        'uae': 'https://flagcdn.com/w80/ae.png',
                        'usa': 'https://flagcdn.com/w80/us.png',
                        'can': 'https://flagcdn.com/w80/ca.png',
                        'png': 'https://flagcdn.com/w80/pg.png'
                    };

                    const getFlag = (teamObj, teamName) => {
                        // 1. Format the team identifier
                        let short = (teamObj?.shortName || teamObj?.teamSName || '').toLowerCase().trim();

                        // 2. Safely map full names to abbreviations just in case (e.g. "India" to "ind")
                        if (!short && teamName) {
                            const nameLower = teamName.toLowerCase().trim();
                            const nameMap = {
                                'india': 'ind', 'australia': 'aus', 'england': 'eng',
                                'pakistan': 'pak', 'new zealand': 'nz', 'south africa': 'sa',
                                'sri lanka': 'sl', 'bangladesh': 'ban', 'afghanistan': 'afg',
                                'ireland': 'ire', 'zimbabwe': 'zim', 'netherlands': 'neth',
                                'scotland': 'sco', 'nepal': 'nep', 'uae': 'uae', 'united arab emirates': 'uae',
                                'usa': 'usa', 'united states': 'usa', 'canada': 'can',
                                'papua new guinea': 'png', 'west indies': 'wi',

                                'chennai super kings': 'csk', 'royal challengers bangalore': 'rcb', 'royal challengers bengaluru': 'rcb',
                                'mumbai indians': 'mi', 'kolkata knight riders': 'kkr', 'sunrisers hyderabad': 'srh',
                                'delhi capitals': 'dc', 'punjab kings': 'pbks', 'rajasthan royals': 'rr',
                                'lucknow super giants': 'lsg', 'gujarat titans': 'gt'
                            };
                            short = nameMap[nameLower] || nameLower.substring(0, 3);
                        }

                        // 3. PRIORITY 1: If we have a local HD flag we must use it first to avoid 404 bugs!
                        if (short && TEAM_LOGOS[short]) return TEAM_LOGOS[short];

                        // 4. PRIORITY 2: If we don't have a local flag, use Cricbuzz Image ID from Live Sync
                        if (teamObj?.imageId) return `https://static.cricbuzz.com/a/img/v1/i1/c${teamObj.imageId}/i.jpg`;

                        // 5. Fallback to any provided generic image, or null (which creates the initials box)
                        return teamObj?.image || null;
                    };

                    const t1Img = getFlag(mInfo.team1, t1Name);
                    const t2Img = getFlag(mInfo.team2, t2Name);

                    const getInitials = (name) => {
                        if (!name || typeof name !== 'string') return "UNK";
                        return name.substring(0, 3).toUpperCase();
                    }

                    return (
                        <div key={id} className="scorecard vertical-card" onClick={() => handleCardClick(id)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                            <div className="card-header">
                                <span className="match-desc">
                                    {desc} • {series.length > 20 ? series.substring(0, 20) + '...' : series}
                                </span>
                                <span className="format-badge">{format}</span>
                            </div>

                            <div className="card-body">
                                {/* Team 1 */}
                                <div className="team-row">
                                    <div className="team-info">
                                        {t1Img ? (
                                            <img
                                                src={t1Img}
                                                alt={t1Name}
                                                className="team-flag-small"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/48x32/1e293b/ffffff?text=${getInitials(t1Name)}`; }}
                                            />
                                        ) : (
                                            <div style={{ width: 28, height: 18, background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', borderRadius: '3px' }}>
                                                {getInitials(t1Name)}
                                            </div>
                                        )}
                                        <span className="team-shortname">{t1Name}</span>
                                    </div>
                                    <div className="team-score-display">{t1Score}</div>
                                </div>

                                {/* Team 2 */}
                                <div className="team-row">
                                    <div className="team-info">
                                        {t2Img ? (
                                            <img
                                                src={t2Img}
                                                alt={t2Name}
                                                className="team-flag-small"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/48x32/1e293b/ffffff?text=${getInitials(t2Name)}`; }}
                                            />
                                        ) : (
                                            <div style={{ width: 28, height: 18, background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', borderRadius: '3px' }}>
                                                {getInitials(t2Name)}
                                            </div>
                                        )}
                                        <span className="team-shortname">{t2Name}</span>
                                    </div>
                                    <div className="team-score-display">{t2Score}</div>
                                </div>

                                <div className="match-status-highlight">
                                    {status}
                                </div>
                            </div>

                            <div className="card-footer-bar">
                                <span className="footer-link">POINTS TABLE</span>
                                <span className="footer-link" onClick={(e) => { e.stopPropagation(); handleCardClick(id); }} style={{ cursor: 'pointer' }}>DETAILS</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
