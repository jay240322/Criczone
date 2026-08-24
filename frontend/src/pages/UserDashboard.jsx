import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { getFavorites, getImageUrl, getUserById, updateUser } from '../api/cricapi';
import './Css/UserDashboard.css';

export default function UserDashboard() {
    const [userName, setUserName] = useState('Cricket Fan');
    const [photoURL, setPhotoURL] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [favorites, setFavorites] = useState({ players: [], videos: [], scorecards: [] });
    const [activeTab, setActiveTab] = useState('players');
    const navigate = useNavigate();

    useEffect(() => {
        // Default to localStorage first for instant render
        const storedName = localStorage.getItem('criczone_username');
        if (storedName) {
            setUserName(storedName);
        }

        const storedTheme = localStorage.getItem('criczone_theme');
        if (storedTheme === 'dark') {
            setIsDarkMode(true);
            document.body.classList.add('dark-theme');
        }

        const fetchUserData = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    // Fetch real-time profile from MongoDB
                    const dbUser = await getUserById(currentUser.uid);
                    if (dbUser) {
                        if (dbUser.displayName) {
                            setUserName(dbUser.displayName);
                            localStorage.setItem('criczone_username', dbUser.displayName);
                        }
                        if (dbUser.photoURL) {
                            setPhotoURL(dbUser.photoURL);
                        }
                    }

                    // Fetch favorites
                    const favs = await getFavorites(currentUser.uid);
                    setFavorites(favs);
                } catch (err) {
                    console.error("Failed to load user data", err);
                }
            }
        };

        // Delay slighty to wait for firebase to initialize user if arriving directly
        setTimeout(() => fetchUserData(), 1000);
    }, []);

    const handleNameSave = async () => {
        if (editName.trim()) {
            const newName = editName.trim();
            setUserName(newName);
            localStorage.setItem('criczone_username', newName);

            // Sync new name to backend so admin sees it too
            const currentUser = auth.currentUser;
            if (currentUser) {
                await updateUser(currentUser.uid, { displayName: newName });
            }
        }
        setIsEditing(false);
    };

    const toggleTheme = () => {
        const newTheme = !isDarkMode ? 'dark' : 'light';
        setIsDarkMode(!isDarkMode);
        localStorage.setItem('criczone_theme', newTheme);

        if (newTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('criczone_username');
            // Theme can be kept, but user specific things removed
            console.log("Logged out successfully");
            navigate('/');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <div className="dashboard-container">
            <BackButton />
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <div className="profile-avatar">
                        {photoURL ? (
                            <img src={photoURL} alt={userName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            userName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="profile-info">
                        {isEditing ? (
                            <div className="name-edit-container">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="name-edit-input"
                                    autoFocus
                                />
                                <button className="btn-save" onClick={handleNameSave}>Save</button>
                                <button className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                            </div>
                        ) : (
                            <div className="name-display-container">
                                <h1>{userName}</h1>
                                <button className="btn-edit" onClick={() => { setEditName(userName); setIsEditing(true); }}>
                                    ✏️ Edit
                                </button>
                            </div>
                        )}
                        <p className="member-since">Member since {new Date().getFullYear()}</p>
                    </div>
                </div>

                <div className="favorites-section">
                    <h2>My Favorites</h2>
                    <div className="favorites-tabs">
                        <button className={`fav-tab ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>Players</button>
                        <button className={`fav-tab ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>Videos</button>
                        <button className={`fav-tab ${activeTab === 'scorecards' ? 'active' : ''}`} onClick={() => setActiveTab('scorecards')}>Matches</button>
                    </div>

                    <div className="favorites-grid">
                        {activeTab === 'players' && favorites.players.length === 0 && <p className="no-favs">No favorite players yet.</p>}
                        {activeTab === 'players' && favorites.players.map(fav => (
                            <div key={fav._id} className="fav-card" onClick={() => navigate(`/players/${fav.itemId}?name=${encodeURIComponent(fav.title)}`)}>
                                <img src={fav.imageUrl ? getImageUrl(fav.imageUrl) : 'https://via.placeholder.com/80'} alt={fav.title} />
                                <div>
                                    <h4>{fav.title || 'Player'}</h4>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'videos' && favorites.videos.length === 0 && <p className="no-favs">No favorite videos yet.</p>}
                        {activeTab === 'videos' && favorites.videos.map(fav => (
                            <div key={fav._id} className="fav-card video" onClick={() => navigate('/videos', { state: { video: { id: fav.itemId, title: fav.title, thumbnail: fav.imageUrl } } })}>
                                <img src={fav.imageUrl || 'https://via.placeholder.com/150'} alt={fav.title} />
                                <div>
                                    <h4>{fav.title || 'Video'}</h4>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'scorecards' && favorites.scorecards.length === 0 && <p className="no-favs">No favorite matches yet.</p>}
                        {activeTab === 'scorecards' && favorites.scorecards.map(fav => (
                            <div key={fav._id} className="fav-card" onClick={() => navigate(`/scorecard/${fav.itemId}`)}>
                                <div className="fav-match-icon">🏏</div>
                                <div>
                                    <h4>{fav.title || 'Match Details'}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-settings">
                    <h2>Settings</h2>
                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>Theme Appearance</h3>
                            <p>Toggle between light and dark mode</p>
                        </div>
                        <div className="theme-toggle" onClick={toggleTheme}>
                            <div className={`toggle-track ${isDarkMode ? 'dark' : 'light'}`}>
                                <div className="toggle-thumb">
                                    {isDarkMode ? '🌙' : '☀️'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="logout-section" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <button className="btn-logout" onClick={handleLogout}>
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
