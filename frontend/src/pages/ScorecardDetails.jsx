import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMatchCenter, getScard, getTeamForMatch, getLocalScore } from '../api/cricapi';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import FavoriteButton from '../components/FavoriteButton';
import './Css/ScorecardDetails.css';
import './Css/home.css';

const ScorecardDetails = () => {
    const { matchId } = useParams();
    const navigate = useNavigate();

    // State for Current Match Details
    const [matchInfo, setMatchInfo] = useState(null);
    const [scoreCard, setScoreCard] = useState(null);
    const [teams, setTeams] = useState({ team1: null, team2: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHistorical, setIsHistorical] = useState(false);

    // Helper to safely access lowercase keys
    const get = (obj, key) => obj && (obj[key] || obj[key.toLowerCase()]);

    // 2. Fetch Match Details
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                setError(null);

                // Try fetching from Live API first
                try {
                    let infoResp;
                    try {
                        infoResp = await getMatchCenter(matchId);
                    } catch (mcErr) {
                        throw mcErr; // Re-throw to fall back to Local Historical DB
                    }

                    let scardResp = null;
                    try {
                        scardResp = await getScard(matchId);
                    } catch (scErr) {
                        console.warn("Could not fetch scorecard, it might not be available yet.", scErr);
                    }

                    // Normalize match info
                    const info = infoResp.data.matchInfo || infoResp.data;
                    setMatchInfo(info);
                    setScoreCard(scardResp?.data?.scoreCard || scardResp?.data?.scorecard || []);

                    // Fetch Teams
                    const t1 = get(info, 'team1');
                    const t2 = get(info, 'team2');
                    const t1Id = t1 ? (t1.teamId || t1.teamid) : null;
                    const t2Id = t2 ? (t2.teamId || t2.teamid) : null;

                    let t1Resp = null, t2Resp = null;
                    try {
                        if (t1Id) t1Resp = await getTeamForMatch(matchId, t1Id);
                    } catch (e) { console.warn("Team 1 info failed", e); }

                    try {
                        if (t2Id) t2Resp = await getTeamForMatch(matchId, t2Id);
                    } catch (e) { console.warn("Team 2 info failed", e); }

                    setTeams({
                        team1: t1Resp ? (t1Resp.data.team || t1Resp.data) : null,
                        team2: t2Resp ? (t2Resp.data.team || t2Resp.data) : null
                    });

                } catch (apiErr) {
                    console.warn("External API failed, trying local historical DB...", apiErr);

                    // Fallback to Local Historical DB or Flat Cache
                    console.log(`[DEBUG] Fetching local data for matchId: ${matchId} `);
                    const localData = await getLocalScore(matchId);
                    console.log("[DEBUG] Local Data Received:", localData);

                    if (!localData) {
                        throw new Error("Match not found locally or remotely.");
                    }

                    if (localData.json) {
                        const json = localData.json;

                        // CASE 1: Historical Archive Format (from import)
                        if (json.info) {
                            setIsHistorical(true);
                            const info = json.info;

                            const adaptedInfo = {
                                seriesName: info.event?.name || localData.seriesName,
                                matchDesc: localData.matchDesc,
                                matchFormat: info.match_type,
                                status: localData.status,
                                venueInfo: { ground: info.venue, city: info.city },
                                team1: { teamName: info.teams[0], ...(localData.team1 || {}) },
                                team2: { teamName: info.teams[1], ...(localData.team2 || {}) },
                                tossResults: info.toss ? { decision: info.toss.decision, winningTeam: info.toss.winner } : null,
                                umpireInfo: info.officials ? { umpire1: { name: info.officials.umpires[0] }, umpire2: { name: info.officials.umpires[1] } } : null,
                                state: 'Completed',
                                source: 'historical',
                                fullData: json
                            };
                            setMatchInfo(adaptedInfo);

                            if (json.innings) {
                                const adaptedScorecard = json.innings.map(inning => {
                                    const team = inning.team;
                                    let runs = 0; let wickets = 0;
                                    const overs = inning.overs ? inning.overs.length : 0;
                                    if (inning.overs) {
                                        inning.overs.forEach(over => {
                                            over.deliveries.forEach(ball => {
                                                runs += (ball.runs.total || 0);
                                                if (ball.wickets) wickets += ball.wickets.length;
                                            });
                                        });
                                    }
                                    return {
                                        batTeamDetails: { batTeamName: team },
                                        scoreDetails: { runs, wickets, overs },
                                        inningId: 1, // Dummy
                                        ...inning // Include full inning data including overs for detailed stats
                                    };
                                });
                                setScoreCard(adaptedScorecard);
                            }
                            if (info.players) {
                                const p1 = info.players[info.teams[0]] || [];
                                const p2 = info.players[info.teams[1]] || [];
                                setTeams({
                                    team1: { player: p1.map(n => ({ id: n, name: n })) },
                                    team2: { player: p2.map(n => ({ id: n, name: n })) }
                                });
                            }
                        }
                        // CASE 2: Live API Format (Cached Result)
                        else if (json.matchInfo) {
                            console.log("Found cached Live API match data");
                            setIsHistorical(false); // treat as "live-like" for UI
                            const info = json.matchInfo;
                            setMatchInfo(info);
                            // Ensure scorecard exists
                            const sc = [];
                            if (json.matchScore) {
                                if (json.matchScore.team1Score && json.matchScore.team1Score.inngs1) {
                                    sc.push({
                                        batTeamDetails: { batTeamName: info.team1?.teamName || info.team1?.name || "Team 1" },
                                        scoreDetails: {
                                            runs: json.matchScore.team1Score.inngs1.runs || 0,
                                            wickets: json.matchScore.team1Score.inngs1.wickets || 0,
                                            overs: json.matchScore.team1Score.inngs1.overs || 0
                                        }
                                    });
                                }
                                if (json.matchScore.team2Score && json.matchScore.team2Score.inngs1) {
                                    sc.push({
                                        batTeamDetails: { batTeamName: info.team2?.teamName || info.team2?.name || "Team 2" },
                                        scoreDetails: {
                                            runs: json.matchScore.team2Score.inngs1.runs || 0,
                                            wickets: json.matchScore.team2Score.inngs1.wickets || 0,
                                            overs: json.matchScore.team2Score.inngs1.overs || 0
                                        }
                                    });
                                }
                            }

                            // The Live API 'match' object usually doesn't have the full scorecard unless 'getScard' was also cached.
                            // But usually we only cache the list object.
                            // If we want detailed scorecard for these, we might need to rely on what's available.
                            // For now, let's at least show the Info.

                            // Check if 'scoreCard' exists in json (it won't for list matches, but good to check)
                            if (json.scoreCard) setScoreCard(json.scoreCard);
                            else setScoreCard(sc); // List object doesn't have ball-by-ball, use reconstructed summary
                        }
                    } else {
                        // B: Flat Cache (Live matches stored locally)
                        console.log("Using flat local cache for details");
                        const adaptedInfo = {
                            seriesName: localData.seriesName,
                            matchDesc: localData.matchDesc,
                            matchFormat: localData.matchFormat,
                            status: localData.status,
                            venueInfo: { ground: localData.venue },
                            team1: {
                                teamName: localData.team1?.name || "Team 1",
                                teamSName: localData.team1?.shortName,
                                imageId: localData.team1?.imageId
                            },
                            team2: {
                                teamName: localData.team2?.name || "Team 2",
                                teamSName: localData.team2?.shortName,
                                imageId: localData.team2?.imageId
                            },
                            state: localData.state,
                            source: 'local-flat'
                        };
                        setMatchInfo(adaptedInfo);
                        // Squads and detailed scorecard not available in flat cache
                        setScoreCard([]);
                        setTeams({ team1: null, team2: null });
                    }
                }
            } catch (err) {
                console.error("Error fetching match details:", err);
                setError(`Failed to load match details: ${err.message} `);
            } finally {
                setLoading(false);
            }
        };

        if (matchId) fetchDetails();
    }, [matchId]);

    if (loading) return <Loader message="Loading Match Details..." />;
    if (error) return <div className="error-container">Error: {error}</div>;
    if (!matchInfo) return <div className="error-container">No match info found.</div>;

    // Extract fields
    const seriesName = get(matchInfo, 'seriesName');
    const status = get(matchInfo, 'status');
    const matchDesc = get(matchInfo, 'matchDesc');
    const team1Obj = get(matchInfo, 'team1');
    const team2Obj = get(matchInfo, 'team2');
    const t1Name = team1Obj ? (team1Obj.teamName || team1Obj.teamname || team1Obj.name || team1Obj.shortName || "Team 1") : "Team 1";
    const t2Name = team2Obj ? (team2Obj.teamName || team2Obj.teamname || team2Obj.name || team2Obj.shortName || "Team 2") : "Team 2";

    // Image IDs
    const t1ImgId = team1Obj ? (team1Obj.imageId || team1Obj.imageid) : null;
    const t2ImgId = team2Obj ? (team2Obj.imageId || team2Obj.imageid) : null;

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
        'ind': '/images/flags/ind.png',
        'aus': '/images/flags/aus.png',
        'eng': '/images/flags/eng.png',
        'pak': '/images/flags/pak.png',
        'nz': '/images/flags/nz.png',
        'sa': '/images/flags/sa.png',
        'sl': '/images/flags/sl.png',
        'ban': '/images/flags/ban.png',
        'afg': '/images/flags/afg.png',
        'ire': '/images/flags/ire.png',
        'zim': '/images/flags/zim.png',
        'neth': '/images/flags/neth.png',
        'sco': '/images/flags/sco.png',
        'nep': '/images/flags/nep.png',
        'uae': '/images/flags/uae.png',
        'usa': '/images/flags/usa.png',
        'can': '/images/flags/can.png',
        'png': '/images/flags/png.png'
    };

    const getFlagUrl = (teamObj, teamName, imgId) => {
        let short = (teamObj?.shortName || teamObj?.teamSName || '').toLowerCase().trim();

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

        // PRIORITY 1: Local High Quality Flag!
        if (short && TEAM_LOGOS[short]) return TEAM_LOGOS[short];

        // PRIORITY 2: Cricbuzz External Image
        if (imgId) return `https://static.cricbuzz.com/a/img/v1/i1/c${imgId}/i.jpg`;

        // PRIORITY 3: Fallback generic
        return teamObj?.image || null;
    };

    const t1ImgUrl = getFlagUrl(team1Obj, t1Name, t1ImgId);
    const t2ImgUrl = getFlagUrl(team2Obj, t2Name, t2ImgId);

    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return "UNK";
        return name.substring(0, 3).toUpperCase();
    }

    const venue = get(matchInfo, 'venueInfo');
    const venueText = venue ? `${venue.ground || ''}, ${venue.city || ''}` : "Venue not available";

    // Additional Info
    const toss = get(matchInfo, 'tossResults');
    const tossText = toss ? `${toss.winningTeam} won the toss and chose to ${toss.decision}` : "Toss info unavailable";

    let umpires = "Umpires unavailable";
    if (matchInfo.umpire1) {
        umpires = [matchInfo.umpire1.name, matchInfo.umpire2?.name].filter(Boolean).join(', ') || "Umpires unavailable";
    } else if (matchInfo.umpireInfo) {
        umpires = [matchInfo.umpireInfo.umpire1?.name, matchInfo.umpireInfo.umpire2?.name].filter(Boolean).join(', ') || "Umpires unavailable";
    }

    // Create Player Map for Linking (Name -> ID)
    const playerMap = {};
    if (teams.team1 && teams.team1.player) teams.team1.player.forEach(p => playerMap[p.name] = p.id);
    if (teams.team2 && teams.team2.player) teams.team2.player.forEach(p => playerMap[p.name] = p.id);

    return (
        <div className="scorecard-details-container">
            <BackButton />
            <div className="match-header" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                    <FavoriteButton
                        type="scorecard"
                        itemId={matchId}
                        title={`${t1Name} vs ${t2Name} - ${seriesName}`}
                    />
                </div>
                <div className="series-title">{seriesName}</div>
                <div className="teams-wrapper">
                    <div className="team-block">
                        {t1ImgUrl ? (
                            <img
                                src={t1ImgUrl}
                                alt={t1Name}
                                className="match-detail-flag"
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/105x70/1e293b/ffffff?text=${getInitials(t1Name)}`; }}
                            />
                        ) : (
                            <div className="match-detail-flag" style={{ background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                                {getInitials(t1Name)}
                            </div>
                        )}
                        <h2 className="team-name-large">{t1Name}</h2>
                    </div>

                    <div className="vs-badge">VS</div>

                    <div className="team-block">
                        {t2ImgUrl ? (
                            <img
                                src={t2ImgUrl}
                                alt={t2Name}
                                className="match-detail-flag"
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/105x70/1e293b/ffffff?text=${getInitials(t2Name)}`; }}
                            />
                        ) : (
                            <div className="match-detail-flag" style={{ background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                                {getInitials(t2Name)}
                            </div>
                        )}
                        <h2 className="team-name-large">{t2Name}</h2>
                    </div>
                </div>

                <div className="status-badge" style={{ marginTop: '15px' }}>{status}</div>
                <div className="match-meta">
                    <strong>{matchDesc}</strong> • {venueText}
                </div>
            </div>

            <div className="info-grid">
                <div className="info-item">
                    <label>Toss</label>
                    <span>{tossText}</span>
                </div>
                <div className="info-item">
                    <label>Umpires</label>
                    <span>{umpires}</span>
                </div>
                <div className="info-item">
                    <label>Match Format</label>
                    <span>{matchInfo.matchFormat || 'N/A'}</span>
                </div>
                <div className="info-item">
                    <label>State</label>
                    <span>
                        {matchInfo.state || 'N/A'}
                        {(() => {
                            let rawDate = null;
                            if (matchInfo.matchStartTimestamp) rawDate = parseInt(matchInfo.matchStartTimestamp);
                            else if (matchInfo.startDate) rawDate = matchInfo.startDate;
                            else if (matchInfo.source === 'historical' && matchInfo.fullData?.info?.dates) rawDate = matchInfo.fullData.info.dates[0];

                            if (!rawDate) return null;
                            const d = new Date(rawDate);
                            if (isNaN(d.getTime())) return ` - ${rawDate}`;
                            return ` - ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
                        })()}
                    </span>
                </div>
            </div>

            {/* Scorecard Section */}
            <div className="scorecard-section">
                <h3 className="section-title">Scorecard</h3>

                {matchInfo && matchInfo.source === 'historical' && matchInfo.fullData ? (
                    <div className="innings-container">
                        {matchInfo.fullData.innings.map((inn, idx) => (
                            <DetailedInning key={idx} inning={inn} index={idx} />
                        ))}
                    </div>
                ) : (
                    scoreCard && scoreCard.length > 0 ? (
                        <div className="innings-container">
                            {scoreCard.map((inning, idx) => (
                                <LiveInningTable key={idx} inning={inning} playerMap={playerMap} />
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">Scorecard unavailable or match not started.</p>
                    )
                )}
            </div>
        </div>
    );
};

// Component for Live API Inning (Table View)
const LiveInningTable = ({ inning, playerMap }) => {
    // Handling Both Formats (Historical/Import with 'batTeamDetails' vs Live API with 'batteamname')
    const batTeam = inning.batTeamDetails?.batTeamName || inning.batteamname || "Inning";
    const runs = inning.scoreDetails?.runs || inning.score || 0;
    const wickets = inning.scoreDetails?.wickets || inning.wickets || 0;
    const overs = inning.scoreDetails?.overs || inning.overs || 0;

    // Detailed Data Check - Live API Format uses 'batsman' and 'bowler' arrays
    if (inning.batsman && inning.batsman.length > 0) {
        return (
            <div className="scorecard-table-container">
                <div className="inning-header">
                    <h4>{batTeam}</h4>
                    <span>{runs}/{wickets} ({overs} ov)</span>
                </div>
                <table className="scorecard-table">
                    <thead>
                        <tr>
                            <th>🏏 Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inning.batsman.map((b, i) => {
                            const pId = playerMap && playerMap[b.name];
                            return (
                                <tr key={i}>
                                    <td>
                                        {pId ? (
                                            <Link to={`/players/${pId}`} className="batter-name-link">
                                                <span className="batter-name">{b.name}</span>
                                            </Link>
                                        ) : (
                                            <span className="batter-name">{b.name}</span>
                                        )}
                                        {b.outdec && <span className="dismissal-info">({b.outdec})</span>}
                                        {b.outDesc && <span className="dismissal-info">({b.outDesc})</span>}
                                    </td>
                                    <td className="runs-cell">{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.strkrate || b.strikeRate}</td>
                                </tr>
                            );
                        })}
                        <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                            <td>Extras</td><td colSpan="5">{inning.extras?.total || 0}</td>
                        </tr>
                    </tbody>
                </table>

                <h5 className="bowling-header">Bowling</h5>
                <table className="scorecard-table">
                    <thead>
                        <tr>
                            <th>⚾ Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inning.bowler && inning.bowler.map((b, i) => {
                            const pId = playerMap && playerMap[b.name];
                            return (
                                <tr key={i}>
                                    <td>
                                        {pId ? (
                                            <Link to={`/players/${pId}`} className="bowler-name-link">
                                                {b.name}
                                            </Link>
                                        ) : b.name}
                                    </td>
                                    <td>{b.overs}</td><td>{b.maidens}</td><td>{b.runs}</td><td style={{ fontWeight: 'bold' }}>{b.wickets}</td><td>{b.economy}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    // Historical Format Check (with overs array)
    if (inning.overs && inning.overs.length > 0) {
        const { batters, bowlers, total, wickets: calcWickets } = processInningData(inning);
        return (
            <div className="scorecard-table-container">
                <div className="inning-header">
                    <h4>{batTeam}</h4>
                    <span>{runs}/{wickets} ({overs} ov)</span>
                </div>
                <table className="scorecard-table">
                    <thead>
                        <tr>
                            <th>🏏 Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batters.map((b, i) => {
                            const pId = playerMap && playerMap[b.name];
                            return (
                                <tr key={i}>
                                    <td>
                                        {pId ? (
                                            <Link to={`/players/${pId}`} className="batter-name-link">
                                                <span className="batter-name">{b.name}</span>
                                            </Link>
                                        ) : (
                                            <span className="batter-name">{b.name}</span>
                                        )}
                                        {b.dismissal && <span className="dismissal-info">({b.dismissal})</span>}
                                    </td>
                                    <td className="runs-cell">{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.sr}</td>
                                </tr>
                            );
                        })}
                        <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                            <td>Extras</td><td colSpan="5">{processExtras(inning)}</td>
                        </tr>
                    </tbody>
                </table>

                <h5 className="bowling-header">Bowling</h5>
                <table className="scorecard-table">
                    <thead>
                        <tr>
                            <th>⚾ Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bowlers.map((b, i) => {
                            const pId = playerMap && playerMap[b.name];
                            return (
                                <tr key={i}>
                                    <td>
                                        {pId ? (
                                            <Link to={`/players/${pId}`} className="bowler-name-link">
                                                {b.name}
                                            </Link>
                                        ) : b.name}
                                    </td>
                                    <td>{b.overs}</td><td>{b.maidens}</td><td>{b.runs}</td><td style={{ fontWeight: 'bold' }}>{b.wickets}</td><td>{b.econ}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    // Default Summary View (for Live with no details)
    return (
        <div className="scorecard-table-container">
            <div className="inning-header">
                <h4>{batTeam}</h4>
                <span>{runs}/{wickets} ({overs} ov)</span>
            </div>
            <table className="scorecard-table">
                <tbody>
                    <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '20px' }}>
                            Detailed scorecard not available for this inning.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};



const processInningData = (inning) => {
    const batterStats = {};
    const bowlerStats = {};
    let totalRuns = 0;
    let totalWickets = 0;

    if (!inning.overs) return { batters: [], bowlers: [], total: 0, wickets: 0 };

    inning.overs.forEach(over => {
        let runsConcededInOver = 0;
        let bowlerOfOver = null;

        over.deliveries.forEach(ball => {
            const batterName = ball.batter;
            const bowlerName = ball.bowler; // Correctly get bowler from delivery
            bowlerOfOver = bowlerName; // Assume last bowler is the bowler of the over (usually same)

            // Init Bowler Stats
            if (!bowlerStats[bowlerName]) {
                bowlerStats[bowlerName] = { name: bowlerName, balls: 0, runs: 0, wickets: 0, maidens: 0 };
            }

            // Init Batter Stats
            if (!batterStats[batterName]) {
                batterStats[batterName] = { name: batterName, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: '' };
            }

            // Calculations
            const batRuns = ball.runs.batter;
            batterStats[batterName].runs += batRuns;

            // Batter Balls Faced (exclude wides)
            if (!ball.extras || !ball.extras.wides) {
                batterStats[batterName].balls += 1;
            }

            // Boundaries
            if (batRuns === 4) batterStats[batterName].fours++;
            if (batRuns === 6) batterStats[batterName].sixes++;

            // Wickets
            if (ball.wickets) {
                ball.wickets.forEach(w => {
                    const outBatter = w.player_out;
                    const kind = w.kind;
                    if (batterStats[outBatter]) batterStats[outBatter].dismissal = kind;

                    // Wicket for bowler? (Not run out, retired hurt, etc.)
                    // Handling standard dismissals
                    if (['bowled', 'caught', 'lbw', 'stumped', 'caught and bowled', 'hit wicket'].includes(kind)) {
                        bowlerStats[bowlerName].wickets++;
                    }
                    totalWickets++;
                });
            }

            // Bowler Runs Conceded
            // Bowler is charged for batter runs + wides + noballs
            let bowlerRuns = batRuns;
            if (ball.extras) {
                if (ball.extras.wides) bowlerRuns += ball.extras.wides;
                if (ball.extras.noballs) bowlerRuns += ball.extras.noballs;
            }
            bowlerStats[bowlerName].runs += bowlerRuns;
            runsConcededInOver += bowlerRuns;

            // Bowler Legal Deliveries (Balls bowled)
            // Wides and No Balls usually don't count as legal balls for over count in stats, 
            // but in some formats No Balls count as balls faced. Wides definitely don't.
            // Standard: Wides and No Balls do NOT count towards 'Overs' count for bowler.
            if (!ball.extras || (!ball.extras.wides && !ball.extras.noballs)) {
                bowlerStats[bowlerName].balls++;
            }
        });

        // Maiden Over Logic
        // If runs conceded by bowler in this over is 0, credit maiden.
        // Caveat: If multiple bowlers in one over, this is simplistic, but fine for standard.
        if (runsConcededInOver === 0 && bowlerOfOver) {
            if (bowlerStats[bowlerOfOver]) {
                // Only credit if they bowled legal deliveries? Simply checking runs = 0 is standard for now.
                bowlerStats[bowlerOfOver].maidens++;
            }
        }
    });

    const batters = Object.values(batterStats).map(b => ({
        ...b,
        sr: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(2) : '0.00'
    }));

    const bowlers = Object.values(bowlerStats).map(b => {
        const overs = Math.floor(b.balls / 6) + '.' + (b.balls % 6);
        const econ = b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(2) : '0.00';
        return { ...b, overs, econ };
    });

    // Total Score Calculation (Batter runs + All Extras)
    let masterTotal = 0;
    inning.overs.forEach(o => o.deliveries.forEach(b => masterTotal += b.runs.total));

    return { batters, bowlers, total: masterTotal, wickets: totalWickets };
};

const processExtras = (inning) => {
    let extras = 0;
    if (inning.overs) {
        inning.overs.forEach(over => {
            over.deliveries.forEach(ball => {
                extras += ball.runs.extras;
            });
        });
    }
    return extras;
};

const DetailedInning = ({ inning, index }) => {
    // Historical data structure: inning.team, inning.overs array
    // Normalize to structure similar to LiveInningTable if possible or handle directly
    const batTeam = inning.team || `Inning ${index + 1}`;

    // Quick summary calculation for historical
    let runs = 0;
    let wickets = 0;
    let oversCount = 0;

    if (inning.overs) {
        inning.overs.forEach(over => {
            oversCount++;
            over.deliveries.forEach(ball => {
                runs += (ball.runs.total || 0);
                if (ball.wickets) wickets += ball.wickets.length;
            });
        });
    }

    // Reuse processInningData logic since structure seems similar (overs array)
    const { batters, bowlers, total } = processInningData(inning);
    // processInningData returns bowlers, batters... 
    // It expects inning.overs array.

    // Calculate extras
    const extras = processExtras(inning);

    return (
        <div className="scorecard-table-container">
            <div className="inning-header">
                <h4>{batTeam}</h4>
                <span>{runs}/{wickets} ({oversCount} ov)</span>
            </div>
            <table className="scorecard-table">
                <thead>
                    <tr>
                        <th>🏏 Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
                    </tr>
                </thead>
                <tbody>
                    {batters.map((b, i) => (
                        <tr key={i}>
                            <td>
                                <span className="batter-name">{b.name}</span>
                                {b.dismissal && <span className="dismissal-info">({b.dismissal})</span>}
                            </td>
                            <td className="runs-cell">{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.sr}</td>
                        </tr>
                    ))}
                    <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                        <td>Extras</td><td colSpan="5">{extras}</td>
                    </tr>
                </tbody>
            </table>

            <h5 className="bowling-header">Bowling</h5>
            <table className="scorecard-table">
                <thead>
                    <tr>
                        <th>⚾ Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th>
                    </tr>
                </thead>
                <tbody>
                    {bowlers.map((b, i) => (
                        <tr key={i}>
                            <td>{b.name}</td>
                            <td>{b.overs}</td><td>{b.maidens}</td><td>{b.runs}</td><td style={{ fontWeight: 'bold' }}>{b.wickets}</td><td>{b.econ}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ScorecardDetails;
