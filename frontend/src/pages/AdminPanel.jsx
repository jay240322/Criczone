import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { getAllUsers, updateUser, deleteUser, getFavorites, deleteFavoriteAdmin, getAllAdminMatches, addAdminMatch, updateAdminMatch, deleteAdminMatch, uploadAdminMatchJson, searchAdminMatches, getHybridMatches } from '../api/cricapi';
import './Css/AdminPanel.css';
import './Css/LiveScore.css'; // Inheriting card styles

const AdminPanel = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    // Admin User Management State
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
    const [userFavorites, setUserFavorites] = useState(null);

    // Admin Match Management State
    const [matches, setMatches] = useState([]);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [matchModalOpen, setMatchModalOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [jsonUploadOpen, setJsonUploadOpen] = useState(false);
    const [jsonUploadText, setJsonUploadText] = useState('');

    useEffect(() => {
        if (isAuthenticated && activeTab === 'users') {
            fetchUsers();
        } else if (isAuthenticated && activeTab === 'matches') {
            fetchMatches();
        }
    }, [isAuthenticated, activeTab]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const data = await getAllUsers();
            setUsers(data || []);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchMatches = async () => {
        setLoadingMatches(true);
        try {
            const data = await getAllAdminMatches();
            setMatches(data || []);
        } catch (err) {
            console.error("Failed to fetch matches", err);
        } finally {
            setLoadingMatches(false);
        }
    };

    const handleEditClick = (user) => {
        setEditingUser({ ...user });
        setEditModalOpen(true);
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        try {
            await updateUser(editingUser.uid, {
                displayName: editingUser.displayName,
                email: editingUser.email
            });
            setEditModalOpen(false);
            fetchUsers();
        } catch (err) {
            alert("Update failed");
        }
    };

    const handleDeleteUser = async (uid) => {
        if (!window.confirm("Are you sure you want to delete this user and all their favorites?")) return;
        try {
            await deleteUser(uid);
            fetchUsers();
        } catch (err) {
            alert("Delete failed");
        }
    };

    const handleDeleteMatch = async (matchId) => {
        if (!window.confirm("Are you sure you want to delete this match?")) return;
        try {
            await deleteAdminMatch(matchId);
            fetchMatches();
        } catch (err) {
            alert("Delete failed");
        }
    };

    const handleEditMatchClick = (match) => {
        setEditingMatch({ ...match });
        setMatchModalOpen(true);
    };

    const handleMatchSave = async (e) => {
        e.preventDefault();
        try {
            if (editingMatch._id) {
                // Update existing match
                await updateAdminMatch(editingMatch.matchId, editingMatch);
            } else {
                // Create new match
                if (!editingMatch.matchId) {
                    editingMatch.matchId = 'manual-' + Date.now();
                }
                await addAdminMatch(editingMatch);
            }
            setMatchModalOpen(false);
            setEditingMatch(null);
            fetchMatches();
        } catch (err) {
            alert("Save failed");
        }
    };

    const handleViewFavorites = async (uid) => {
        try {
            const favs = await getFavorites(uid);
            // Also store uid so we can refresh easily after deleting a favorite
            setUserFavorites({ uid, data: favs });
            setFavoritesModalOpen(true);
        } catch (err) {
            alert("Failed to fetch favorites");
        }
    };

    const handleDeleteFavorite = async (favId, uid) => {
        if (!window.confirm("Are you sure you want to delete this favorite?")) return;
        try {
            await deleteFavoriteAdmin(favId);
            // Refresh favorites
            const favs = await getFavorites(uid);
            setUserFavorites({ uid, data: favs });
        } catch (err) {
            alert("Delete favorite failed");
        }
    };

    const handleJsonUploadSubmit = async (e) => {
        e.preventDefault();
        try {
            await uploadAdminMatchJson(jsonUploadText);
            setJsonUploadOpen(false);
            setJsonUploadText('');
            fetchMatches();
        } catch (err) {
            alert("JSON Upload failed. Please check the format.");
        }
    };

    const handleSearchMatches = async () => {
        if (!searchTerm.trim()) {
            fetchMatches();
            return;
        }

        setLoadingMatches(true);
        try {
            const [localResp, hybridResp] = await Promise.all([
                searchAdminMatches(searchTerm),
                getHybridMatches()
            ]);

            let externalMatches = [];
            if (hybridResp.source === 'external' && hybridResp.data && hybridResp.data.typeMatches) {
                hybridResp.data.typeMatches.forEach(series => {
                    if (series.seriesMatches) {
                        series.seriesMatches.forEach(sm => {
                            if (sm.seriesAdWrapper) externalMatches.push(...(sm.seriesAdWrapper.matches || []));
                            else if (sm.matches) externalMatches.push(...(sm.matches || []));
                        });
                    }
                });
            }

            externalMatches.forEach(m => m.isExternal = true);

            const s = searchTerm.toLowerCase();
            const filteredExternal = externalMatches.filter(match => {
                const matchId = match.matchInfo?.matchId || match.id || '';
                const seriesName = match.matchInfo?.seriesName || '';
                const matchDesc = match.matchInfo?.matchDesc || '';
                const status = match.matchInfo?.status || match.status || '';
                const t1Name = match.matchInfo?.team1?.teamName || match.matchInfo?.team1?.teamSName || '';
                const t2Name = match.matchInfo?.team2?.teamName || match.matchInfo?.team2?.teamSName || '';

                const combinedText = `${matchId} ${seriesName} ${matchDesc} ${status} ${t1Name} ${t2Name}`.toLowerCase();
                const searchWords = s.split(' ').filter(w => w.trim().length > 0);
                return searchWords.every(word => combinedText.includes(word));
            });

            const matchMap = new Map();

            if (Array.isArray(localResp)) {
                localResp.forEach(m => {
                    const id = m.matchId || m._id || m.id;
                    if (id) matchMap.set(String(id), m);
                });
            }

            filteredExternal.forEach(m => {
                const id = m.matchInfo?.matchId || m.id;
                if (id && !matchMap.has(String(id))) {
                    matchMap.set(String(id), m);
                }
            });

            const mergedList = Array.from(matchMap.values()).sort((a, b) => {
                const dateA = new Date(a.startDate || a.matchInfo?.startDate || 0);
                const dateB = new Date(b.startDate || b.matchInfo?.startDate || 0);
                return dateB - dateA;
            });

            setMatches(mergedList);
        } catch (err) {
            console.error("Search error:", err);
            alert("Search failed. Please try again.");
        } finally {
            setLoadingMatches(false);
        }
    };

    const handleSaveExternalMatch = async (match) => {
        try {
            const mInfo = match.matchInfo || match;
            const matchPayload = {
                matchId: mInfo.matchId || mInfo.id || 'ext-' + Date.now(),
                seriesName: mInfo.seriesName || match.series?.name || 'Series',
                matchDesc: mInfo.matchDesc || match.description || 'Match Details',
                matchFormat: mInfo.matchFormat || match.format || 'CRICKET',
                startDate: mInfo.startDate || new Date().toISOString().split('T')[0],
                venue: mInfo.venueInfo?.ground || mInfo.venue?.name || 'Unknown',
                status: mInfo.status || match.status || 'Status',
                source: 'external-save',
                team1: { name: mInfo.team1?.teamName || 'Team 1', shortName: mInfo.team1?.teamSName || 'TM1' },
                team2: { name: mInfo.team2?.teamName || 'Team 2', shortName: mInfo.team2?.teamSName || 'TM2' },
                json: match
            };
            await addAdminMatch(matchPayload);
            alert("Match saved to Database successfully!");
            handleSearchMatches();
        } catch (err) {
            alert("Failed to save match.");
            console.error(err);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        // Check password against env variable
        if (passwordInput === process.env.REACT_APP_ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setErrorMsg('');
        } else {
            setErrorMsg('Incorrect admin password');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="admin-page admin-login-page">
                <div className="admin-login-card">
                    <h2>Admin Access</h2>
                    <p>Enter the master password to access the control panel.</p>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="admin-login-input"
                            autoFocus
                        />
                        {errorMsg && <p className="admin-error-text">{errorMsg}</p>}
                        <button type="submit" className="admin-btn primary admin-login-btn">Login</button>
                    </form>
                </div>
            </div>
        );
    }

    // Currently a placeholder for future admin functionality
    return (
        <div className="admin-page">
            <BackButton />
            <div className="admin-header">
                <h1>Admin Dashboard</h1>
                <p>Welcome to the Criczone control panel.</p>
            </div>

            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Users
                </button>
                <button
                    className={`admin-tab ${activeTab === 'matches' ? 'active' : ''}`}
                    onClick={() => setActiveTab('matches')}
                >
                    Matches
                </button>

                <button
                    className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    System Settings
                </button>
            </div>

            <div className="admin-content">
                {activeTab === 'overview' && (
                    <div className="admin-grid">
                        <div className="admin-card">
                            <h3>Total Users</h3>
                            <p className="admin-stat">1,204</p>
                        </div>
                        <div className="admin-card">
                            <h3>Active Matches</h3>
                            <p className="admin-stat">3</p>
                        </div>
                        <div className="admin-card">
                            <h3>API Status</h3>
                            <p className="admin-stat success">Healthy</p>
                        </div>
                        <div className="admin-card">
                            <h3>News Articles</h3>
                            <p className="admin-stat">156</p>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="admin-panel-section">
                        <h2>User Management</h2>
                        <p>Manage registered users and their details below.</p>

                        {loadingUsers ? <p>Loading users...</p> : (
                            <div className="placeholder-table" style={{ marginTop: '1rem', overflowX: 'auto' }}>
                                <div className="placeholder-row header" style={{ gridTemplateColumns: '2fr 2fr 1fr 2fr' }}>
                                    <span>Name</span>
                                    <span>Email</span>
                                    <span>Joined</span>
                                    <span>Actions</span>
                                </div>
                                {users.length === 0 ? <p style={{ padding: '1rem' }}>No users found.</p> : users.map(user => (
                                    <div className="placeholder-row" key={user.uid} style={{ gridTemplateColumns: '2fr 2fr 1fr 2fr', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {user.photoURL && <img src={user.photoURL} alt="Avatar" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />}
                                            {user.displayName || 'Unnamed User'}
                                        </span>
                                        <span>{user.email}</span>
                                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                                        <span style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="admin-btn-small" onClick={() => handleEditClick(user)}>Edit</button>
                                            <button className="admin-btn-small secondary" onClick={() => handleViewFavorites(user.uid)}>Favorites</button>
                                            <button className="admin-btn-small delete" onClick={() => handleDeleteUser(user.uid)} style={{ background: '#e53935', color: 'white' }}>Delete</button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'matches' && (
                    <div className="admin-panel-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2>Match Management</h2>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Search by ID, Series, Team, Year..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchMatches(); }}
                                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
                                />
                                <button className="admin-btn primary" onClick={handleSearchMatches}>Search</button>
                                <button className="admin-btn secondary" onClick={() => { setJsonUploadText(''); setJsonUploadOpen(true); }}>Upload JSON</button>
                                <button className="admin-btn primary" onClick={() => { setEditingMatch({ matchId: '', seriesName: '', matchDesc: '', status: '', 'team1.name': '', 'team1.score': '', 'team2.name': '', 'team2.score': '' }); setMatchModalOpen(true); }}>Add New Match</button>
                            </div>
                        </div>
                        <p>Manage all live, recent, and upcoming matches below.</p>

                        {loadingMatches ? <p>Loading matches...</p> : (
                            <div className="matches-grid" style={{ marginTop: '1rem' }}>
                                {matches.length === 0 ? <p style={{ padding: '1rem' }}>No matches found.</p> : matches.map(match => {
                                    const mInfo = match.matchInfo || match;
                                    const id = mInfo.matchId || mInfo.id || match._id;
                                    const desc = mInfo.matchDesc || match.description || 'Match Details';
                                    const series = mInfo.seriesName || (match.series ? match.series.name : 'Series');
                                    const format = mInfo.matchFormat || match.format || 'CRICKET';
                                    const status = mInfo.status || match.status || 'Status';

                                    const t1Data = mInfo.team1 || {};
                                    const t2Data = mInfo.team2 || {};
                                    const t1Name = t1Data.teamSName || t1Data.shortName || t1Data.teamName || t1Data.name || 'Team 1';
                                    const t2Name = t2Data.teamSName || t2Data.shortName || t2Data.teamName || t2Data.name || 'Team 2';
                                    const t1Score = match.team1?.runs ? `${match.team1.runs}/${match.team1.wickets}` : (match.team1?.score || '');
                                    const t2Score = match.team2?.runs ? `${match.team2.runs}/${match.team2.wickets}` : (match.team2?.score || '');

                                    const TEAM_LOGOS = {
                                        'csk': '/images/flags/csk.png', 'rcb': '/images/flags/rcb.png', 'mi': '/images/flags/mi.png',
                                        'kkr': '/images/flags/kkr.png', 'srh': '/images/flags/srh.png', 'dc': '/images/flags/dc.png',
                                        'pbks': '/images/flags/pbks.png', 'rr': '/images/flags/rr.png', 'lsg': '/images/flags/lsg.png',
                                        'gt': '/images/flags/gt.png',
                                        'ind': 'https://flagcdn.com/w80/in.png', 'aus': 'https://flagcdn.com/w80/au.png',
                                        'eng': 'https://flagcdn.com/w80/gb-eng.png', 'pak': 'https://flagcdn.com/w80/pk.png',
                                        'nz': 'https://flagcdn.com/w80/nz.png', 'sa': 'https://flagcdn.com/w80/za.png',
                                        'sl': 'https://flagcdn.com/w80/lk.png', 'ban': 'https://flagcdn.com/w80/bd.png',
                                        'afg': 'https://flagcdn.com/w80/af.png', 'ire': 'https://flagcdn.com/w80/ie.png',
                                        'zim': 'https://flagcdn.com/w80/zw.png', 'neth': 'https://flagcdn.com/w80/nl.png',
                                        'sco': 'https://flagcdn.com/w80/gb-sct.png', 'nep': 'https://flagcdn.com/w80/np.png',
                                        'uae': 'https://flagcdn.com/w80/ae.png', 'usa': 'https://flagcdn.com/w80/us.png',
                                        'can': 'https://flagcdn.com/w80/ca.png', 'png': 'https://flagcdn.com/w80/pg.png'
                                    };

                                    const getFlag = (teamObj, teamName) => {
                                        let short = (teamObj?.shortName || teamObj?.teamSName || '').toLowerCase().trim();
                                        if (!short && teamName) {
                                            const nameLower = teamName.toLowerCase().trim();
                                            const nameMap = {
                                                'india': 'ind', 'australia': 'aus', 'england': 'eng', 'pakistan': 'pak',
                                                'new zealand': 'nz', 'south africa': 'sa', 'sri lanka': 'sl', 'bangladesh': 'ban',
                                                'afghanistan': 'afg', 'ireland': 'ire', 'zimbabwe': 'zim', 'netherlands': 'neth',
                                                'scotland': 'sco', 'nepal': 'nep', 'uae': 'uae', 'usa': 'usa',
                                                'chennai super kings': 'csk', 'royal challengers bangalore': 'rcb', 'mumbai indians': 'mi',
                                                'kolkata knight riders': 'kkr', 'sunrisers hyderabad': 'srh', 'delhi capitals': 'dc',
                                                'punjab kings': 'pbks', 'rajasthan royals': 'rr', 'lucknow super giants': 'lsg', 'gujarat titans': 'gt'
                                            };
                                            short = nameMap[nameLower] || nameLower.substring(0, 3);
                                        }
                                        if (short && TEAM_LOGOS[short]) return TEAM_LOGOS[short];
                                        if (teamObj?.imageId) return `https://static.cricbuzz.com/a/img/v1/i1/c${teamObj.imageId}/i.jpg`;
                                        return teamObj?.image || null;
                                    };

                                    const t1Img = getFlag(mInfo.team1, t1Name);
                                    const t2Img = getFlag(mInfo.team2, t2Name);
                                    const getInitials = (n) => (n && typeof n === 'string' ? n.substring(0, 3).toUpperCase() : "UNK");

                                    return (
                                        <div key={id} className="scorecard vertical-card" style={{ cursor: 'default', flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                            <div className="card-header">
                                                <span className="match-desc">
                                                    {desc} • {series.length > 20 ? series.substring(0, 20) + '...' : series}
                                                </span>
                                                <span className="format-badge">{format}</span>
                                            </div>

                                            <div className="card-body">
                                                <div className="team-row">
                                                    <div className="team-info">
                                                        {t1Img ? (
                                                            <img src={t1Img} alt={t1Name} className="team-flag-small" referrerPolicy="no-referrer" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/48x32/1e293b/ffffff?text=${getInitials(t1Name)}`; }} />
                                                        ) : (
                                                            <div style={{ width: 28, height: 18, background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', borderRadius: '3px' }}>{getInitials(t1Name)}</div>
                                                        )}
                                                        <span className="team-shortname">{t1Name}</span>
                                                    </div>
                                                    <div className="team-score-display">{t1Score}</div>
                                                </div>

                                                <div className="team-row">
                                                    <div className="team-info">
                                                        {t2Img ? (
                                                            <img src={t2Img} alt={t2Name} className="team-flag-small" referrerPolicy="no-referrer" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/48x32/1e293b/ffffff?text=${getInitials(t2Name)}`; }} />
                                                        ) : (
                                                            <div style={{ width: 28, height: 18, background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', borderRadius: '3px' }}>{getInitials(t2Name)}</div>
                                                        )}
                                                        <span className="team-shortname">{t2Name}</span>
                                                    </div>
                                                    <div className="team-score-display">{t2Score}</div>
                                                </div>

                                                <div className="match-status-highlight">{status}</div>
                                            </div>

                                            <div className="card-footer-bar" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
                                                <span className="footer-link" onClick={() => navigate(`/scorecard/${match.matchId || match.id || match._id}`)} style={{ cursor: 'pointer', color: '#1d6e43' }}>VIEW</span>
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    {match.isExternal ? (
                                                        <span className="footer-link" onClick={() => handleSaveExternalMatch(match)} style={{ cursor: 'pointer', color: '#10b981', fontWeight: 'bold' }}>SAVE TO DB</span>
                                                    ) : (
                                                        <>
                                                            <span className="footer-link" onClick={() => handleEditMatchClick(match)} style={{ cursor: 'pointer', color: '#1976d2' }}>EDIT</span>
                                                            <span className="footer-link" onClick={() => handleDeleteMatch(id)} style={{ cursor: 'pointer', color: '#d32f2f' }}>DELETE</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}



                {activeTab === 'settings' && (
                    <div className="admin-panel-section">
                        <h2>System Settings</h2>
                        <div className="settings-form">
                            <div className="form-group">
                                <label>RapidAPI Key (Proxy)</label>
                                <input type="password" value="*************************" readOnly />
                                <button className="admin-btn-small">Update</button>
                            </div>
                            <div className="form-group">
                                <label>Maintenance Mode</label>
                                <input type="checkbox" /> Enable
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* JSON Upload Modal */}
            {jsonUploadOpen && (
                <div className="admin-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="admin-modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '600px', maxWidth: '90%' }}>
                        <h2>Upload Match JSON</h2>
                        <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>Paste the full JSON payload of the match. It will be parsed and automatically saved into the database, making it searchable immediately.</p>
                        <form onSubmit={handleJsonUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <textarea
                                value={jsonUploadText}
                                onChange={(e) => setJsonUploadText(e.target.value)}
                                placeholder='{"info": {"event": {"name": "Test Series"}, "teams": ["Team A", "Team B"]...}}'
                                style={{ width: '100%', height: '300px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                required
                            />
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="admin-btn secondary" onClick={() => setJsonUploadOpen(false)}>Cancel</button>
                                <button type="submit" className="admin-btn primary">Upload & Parse</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit / Add Match Modal */}
            {matchModalOpen && editingMatch && (
                <div className="admin-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="admin-modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2>{editingMatch._id ? 'Edit Match' : 'Add New Match'}</h2>
                        <form onSubmit={handleMatchSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>Match ID</label>
                                <input type="text" value={editingMatch.matchId || ''} onChange={e => setEditingMatch({ ...editingMatch, matchId: e.target.value })} disabled={!!editingMatch._id} placeholder="Leave blank to auto-generate" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', background: editingMatch._id ? '#eee' : '#fff' }} />
                            </div>
                            <div className="form-group">
                                <label>Series Name</label>
                                <input type="text" value={editingMatch.seriesName || ''} onChange={e => setEditingMatch({ ...editingMatch, seriesName: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                            <div className="form-group">
                                <label>Match Description (e.g. 1st T20I)</label>
                                <input type="text" value={editingMatch.matchDesc || ''} onChange={e => setEditingMatch({ ...editingMatch, matchDesc: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Team 1 Name</label>
                                    <input type="text" value={editingMatch.team1?.name || editingMatch['team1.name'] || ''} onChange={e => setEditingMatch({ ...editingMatch, team1: { ...editingMatch.team1, name: e.target.value } })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Team 1 Score</label>
                                    <input type="text" value={editingMatch.team1?.score || editingMatch['team1.score'] || ''} onChange={e => setEditingMatch({ ...editingMatch, team1: { ...editingMatch.team1, score: e.target.value } })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Team 2 Name</label>
                                    <input type="text" value={editingMatch.team2?.name || editingMatch['team2.name'] || ''} onChange={e => setEditingMatch({ ...editingMatch, team2: { ...editingMatch.team2, name: e.target.value } })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Team 2 Score</label>
                                    <input type="text" value={editingMatch.team2?.score || editingMatch['team2.score'] || ''} onChange={e => setEditingMatch({ ...editingMatch, team2: { ...editingMatch.team2, score: e.target.value } })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Status (e.g. India won by 10 runs)</label>
                                <input type="text" value={editingMatch.status || ''} onChange={e => setEditingMatch({ ...editingMatch, status: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="admin-btn secondary" onClick={() => { setMatchModalOpen(false); setEditingMatch(null); }}>Cancel</button>
                                <button type="submit" className="admin-btn primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editModalOpen && editingUser && (
                <div className="admin-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="admin-modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
                        <h2>Edit User</h2>
                        <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>Display Name</label>
                                <input type="text" value={editingUser.displayName} onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="admin-btn secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="admin-btn primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Favorites Modal */}
            {favoritesModalOpen && userFavorites && (
                <div className="admin-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="admin-modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h2>User Favorites</h2>

                        <div style={{ marginTop: '1rem' }}>
                            <h4>Players ({userFavorites.data.players?.length || 0})</h4>
                            <ul style={{ paddingLeft: '20px', marginBottom: '1rem', listStyle: 'none' }}>
                                {userFavorites.data.players?.map(f => (
                                    <li key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span>{f.title}</span>
                                        <button className="admin-btn-small secondary" onClick={() => handleDeleteFavorite(f._id, userFavorites.uid)}>Delete</button>
                                    </li>
                                ))}
                            </ul>

                            <h4>Videos ({userFavorites.data.videos?.length || 0})</h4>
                            <ul style={{ paddingLeft: '20px', marginBottom: '1rem', listStyle: 'none' }}>
                                {userFavorites.data.videos?.map(f => (
                                    <li key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span>{f.title}</span>
                                        <button className="admin-btn-small secondary" onClick={() => handleDeleteFavorite(f._id, userFavorites.uid)}>Delete</button>
                                    </li>
                                ))}
                            </ul>

                            <h4>Scorecards ({userFavorites.data.scorecards?.length || 0})</h4>
                            <ul style={{ paddingLeft: '20px', listStyle: 'none' }}>
                                {userFavorites.data.scorecards?.map(f => (
                                    <li key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span>{f.title}</span>
                                        <button className="admin-btn-small secondary" onClick={() => handleDeleteFavorite(f._id, userFavorites.uid)}>Delete</button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                            <button className="admin-btn primary" onClick={() => setFavoritesModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
