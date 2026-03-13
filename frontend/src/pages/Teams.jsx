import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInternationalTeams, getImageUrl, searchPlayers } from '../api/cricapi';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import './Css/teams.css';

const TEAM_SHORT_NAMES = [
    { short: 'RCB', text: 'Royal Challengers' },
    { short: 'CSK', text: 'Chennai Super' },
    { short: 'MI', text: 'Mumbai Indians' },
    { short: 'KKR', text: 'Knight Riders' },
    { short: 'SRH', text: 'Sunrisers' },
    { short: 'DC', text: 'Delhi Capital' },
    { short: 'PBKS', text: 'Punjab Kings' },
    { short: 'PBKS', text: 'Kings XI Punjab' },
    { short: 'RR', text: 'Rajasthan Royals' },
    { short: 'LSG', text: 'Lucknow Super Giants' },
    { short: 'GT', text: 'Gujarat Titans' },
    { short: 'DC', text: 'Deccan Chargers' },
    { short: 'PWI', text: 'Pune Warriors' },
    { short: 'GL', text: 'Gujarat Lions' },
    { short: 'RPS', text: 'Rising Pune' },
    { short: 'UPW', text: 'UP Warriorz' },
    { short: 'GG', text: 'Gujarat Giants' },
    { short: 'SUP', text: 'Supernovas' },
    { short: 'VEL', text: 'Velocity' },
    { short: 'TRB', text: 'Trailblazers' },

    { short: 'IND', text: 'India' },
    { short: 'AUS', text: 'Australia' },
    { short: 'ENG', text: 'England' },
    { short: 'PAK', text: 'Pakistan' },
    { short: 'NZ', text: 'New Zealand' },
    { short: 'SA', text: 'South Africa' },
    { short: 'WI', text: 'West Indies' },
    { short: 'SL', text: 'Sri Lanka' },
    { short: 'BAN', text: 'Bangladesh' },
    { short: 'AFG', text: 'Afghanistan' },
    { short: 'IRE', text: 'Ireland' },
    { short: 'ZIM', text: 'Zimbabwe' },
    { short: 'NED', text: 'Netherlands' },
    { short: 'SCO', text: 'Scotland' },
    { short: 'UAE', text: 'United Arab Emirates' },
    { short: 'NEP', text: 'Nepal' },
    { short: 'OMA', text: 'Oman' },
    { short: 'NAM', text: 'Namibia' },
    { short: 'USA', text: 'United States' },
    { short: 'UGA', text: 'Uganda' },
    { short: 'PNG', text: 'Papua New Guinea' },
    { short: 'CAN', text: 'Canada' },
    { short: 'MAS', text: 'Malaysia' },
    { short: 'DEN', text: 'Denmark' },
    { short: 'QAT', text: 'Qatar' },
    { short: 'THA', text: 'Thailand' }
];

const getShortName = (teamName) => {
    if (!teamName) return '';
    const lowerName = teamName.toLowerCase();

    for (const item of TEAM_SHORT_NAMES) {
        if (lowerName.includes(item.text.toLowerCase())) {
            let result = item.short;
            if (lowerName.includes('women') && !item.text.toLowerCase().includes('women')) {
                result += ' W';
            }
            // Explicitly handling 'A' teams if they somehow exist
            if (lowerName.includes(' a ') || lowerName.endsWith(' a')) {
                result += ' A';
            }
            return result;
        }
    }

    const words = teamName.split(' ');
    if (words.length === 1) return teamName.slice(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
};

export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('Teams'); // 'Teams' or 'Players'

    // Player search specific state
    const [players, setPlayers] = useState([]);
    const [isSearchingPlayers, setIsSearchingPlayers] = useState(false);
    const [playerError, setPlayerError] = useState(null);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                setLoading(true);

                // 1. Fetch International Teams
                const { data: intData } = await getInternationalTeams();
                let allTeams = [];
                if (intData && intData.list) {
                    const MAJOR_NATIONS = [
                        // Men's International
                        "India", "Australia", "England", "South Africa", "New Zealand",
                        "Pakistan", "Sri Lanka", "West Indies", "Bangladesh", "Afghanistan",
                        "Ireland", "Zimbabwe", "Netherlands", "Scotland", "United Arab Emirates",
                        "Nepal", "Oman", "Namibia", "United States", "Uganda", "Papua New Guinea", "Canada",

                        // Women's International
                        "India Women", "Australia Women", "England Women", "South Africa Women",
                        "New Zealand Women", "Pakistan Women", "Sri Lanka Women", "West Indies Women",
                        "Bangladesh Women", "Ireland Women", "Scotland Women", "Thailand Women",
                        "United Arab Emirates Women", "Malaysia Women", "Denmark Women", "Oman Women", "Qatar Women",
                        "India A Women", "Bangladesh A Women", "Sri Lanka A Women"
                    ];
                    const majorLower = MAJOR_NATIONS.map(t => t.toLowerCase());
                    allTeams = intData.list.filter(item => item.teamId && majorLower.includes(item.teamName.toLowerCase()))
                        .map(item => ({ ...item, teamSName: getShortName(item.teamName) }));

                    // Guarantee all MAJOR_NATIONS exist in the array so they surface in UI even if DB is empty
                    const existingNames = allTeams.map(t => t.teamName.toLowerCase());
                    MAJOR_NATIONS.forEach(nation => {
                        if (!existingNames.includes(nation.toLowerCase())) {
                            allTeams.push({
                                teamId: nation,
                                teamName: nation,
                                teamSName: getShortName(nation),
                                imageId: ''
                            });
                        }
                    });

                    // Map Women's team image IDs to their Men's counterparts if missing
                    allTeams.forEach(team => {
                        if (team.teamName.toLowerCase().includes('women') && (!team.imageId || team.imageId === '')) {
                            // Find corresponding men's team
                            const menTeamName = team.teamName.replace(/ Women/i, '').trim();
                            const menTeam = allTeams.find(t => t.teamName.toLowerCase() === menTeamName.toLowerCase());
                            if (menTeam && menTeam.imageId) {
                                team.imageId = menTeam.imageId;
                            }
                        }
                    });
                }



                setTeams(allTeams);
            } catch (err) {
                console.error("Error fetching teams:", err);
                setError("Failed to load teams. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, []);

    // Gender state removed

    const handlePlayerSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim() || searchType !== 'Players') return;

        setIsSearchingPlayers(true);
        setPlayerError(null);
        setPlayers([]);

        try {
            const response = await searchPlayers(searchTerm);
            if (response.data && response.data.player) {
                setPlayers(response.data.player);
            } else {
                setPlayers([]);
            }
        } catch (err) {
            console.error("Failed to search players:", err);
            setPlayerError("Failed to fetch players. (API Limit may be reached)");
        } finally {
            setIsSearchingPlayers(false);
        }
    };

    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter' && searchType === 'Players') {
            handlePlayerSearch(e);
        }
    };

    const filteredTeams = teams.filter(team => {
        const matchesSearch = team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (team.teamSName && team.teamSName.toLowerCase().includes(searchTerm.toLowerCase()));

        const knownWPLTeams = ["UP Warriorz", "Gujarat Giants", "Supernovas", "Velocity", "Trailblazers"].map(t => t.toLowerCase());
        const isWomenTeam = team.teamName.toLowerCase().includes('women') || knownWPLTeams.includes(team.teamName.toLowerCase());

        return matchesSearch && !isWomenTeam;
    });

    if (loading) return <Loader message="Loading Teams..." />;

    if (error) return (
        <div className="error-container">
            <div className="error-message">{error}</div>
        </div>
    );

    return (
        <div className="teams-page-wrapper">
            <div className="teams-container">
                <BackButton />
                <header className="teams-header">
                    <h1>Cricket Teams</h1>
                    <p>{searchType === 'Teams' ? 'Discover International Teams' : 'Search for Players Globally'}</p>
                    <div className="teams-filters" style={{ marginTop: '20px', maxWidth: '500px', marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        <div className="gender-toggle" style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => { setSearchType('Teams'); setSearchTerm(''); }}
                                style={{
                                    padding: '8px 24px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: searchType === 'Teams' ? '#0f172a' : '#f1f5f9',
                                    color: searchType === 'Teams' ? '#fff' : '#475569',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    boxShadow: searchType === 'Teams' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Teams
                            </button>
                            <button
                                onClick={() => { setSearchType('Players'); setSearchTerm(''); setPlayers([]); setPlayerError(null); }}
                                style={{
                                    padding: '8px 24px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: searchType === 'Players' ? '#10b981' : '#f1f5f9',
                                    color: searchType === 'Players' ? '#fff' : '#475569',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    boxShadow: searchType === 'Players' ? '0 4px 6px -1px rgba(16, 185, 129, 0.4)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                🔍 Find Player
                            </button>
                        </div>

                        <div className="search-bar-container" style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder={searchType === 'Teams' ? "Search teams..." : "E.g., Sachin Tendulkar..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyPress}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    borderRadius: '25px',
                                    border: '1px solid #ddd',
                                    fontSize: '16px',
                                    outline: 'none',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}
                            />
                            {searchType === 'Players' && (
                                <button
                                    onClick={handlePlayerSearch}
                                    disabled={isSearchingPlayers}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '25px',
                                        border: 'none',
                                        background: '#0f172a',
                                        color: '#fff',
                                        cursor: isSearchingPlayers ? 'not-allowed' : 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {isSearchingPlayers ? '...' : 'Search'}
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {playerError && (
                    <div className="error-container" style={{ textAlign: 'center', color: '#e11d48', marginTop: '20px' }}>
                        <div className="error-message">{playerError}</div>
                    </div>
                )}

                {searchType === 'Players' ? (
                    isSearchingPlayers ? (
                        <Loader message="Searching for players..." />
                    ) : (
                        <div className="teams-grid">
                            {players.length > 0 ? (
                                players.map(p => (
                                    <Link to={`/players/${p.id}`} key={p.id} className="team-card player-card">
                                        {p.imageId ? (
                                            <img src={getImageUrl(p.imageId)} alt={p.name} className="team-flag" />
                                        ) : (
                                            <div className="team-flag placeholder" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                N/A
                                            </div>
                                        )}
                                        <h3>{p.name}</h3>
                                        <div className="team-short-name">{p.teamName || 'Unknown Team'}</div>
                                    </Link>
                                ))
                            ) : (
                                searchTerm && !isSearchingPlayers && !playerError && (
                                    <p style={{ textAlign: 'center', marginTop: '2rem', gridColumn: '1 / -1' }}>
                                        No players found for "{searchTerm}".
                                    </p>
                                )
                            )}
                        </div>
                    )
                ) : (
                    <div className="teams-grid">
                        {filteredTeams.map((team) => (
                            <Link
                                to={`/teams/${team.teamId}`}
                                state={{ team }}
                                key={team.teamId}
                                className="team-card"
                            >
                                <img
                                    src={getImageUrl(team.imageId)}
                                    alt={team.teamName}
                                    className="team-flag"
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=Flag'; }}
                                />
                                <h3>{team.teamName}</h3>
                                <div className="team-short-name">{team.teamSName}</div>
                            </Link>
                        ))}
                    </div>
                )}

                {searchType === 'Teams' && filteredTeams.length === 0 && <p style={{ textAlign: 'center', marginTop: '2rem' }}>No teams found matching "{searchTerm}".</p>}
            </div>
        </div>
    );
};