import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPlayerStats, getImageUrl } from '../api/cricapi';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import FavoriteButton from '../components/FavoriteButton';
import './Css/teams.css';

export default function PlayerDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlayer = async () => {
            try {
                setLoading(true);
                console.log(`Fetching stats for Player ID: ${id}`);
                const { data } = await getPlayerStats(id);
                console.log("Player Data:", data);
                setData(data);
            } catch (err) {
                console.error("Error fetching player:", err);
                setError(`Failed to load player details. Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchPlayer();
    }, [id]);

    if (loading) return <Loader message="Loading Player Info..." />;
    if (error) return (
        <div className="error-container">
            <p>Error for Player ID: {id}</p>
            <p>{error}</p>
        </div>
    );
    if (!data) return <div className="no-data">Player not found.</div>;

    // Parse new API structure
    // Root keys: appIndex, rankings, recentBatting, recentBowling, faceImageId, etc.
    // Name is confusingly not at root in debug output? Wait, debug output showed appIndex.seoTitle: "Virat Kohli Profile..."
    // Usually there is a 'name' or 'userInfo' key. Let's look for known keys.
    // Debug showed: "faceImageId": 616517

    // Merge data and stats (for fallback local cache scenario where stats are nested)
    const pData = data.stats ? { ...data, ...data.stats } : data;

    let name = "Unknown Player";
    if (pData.appIndex && pData.appIndex.seoTitle) {
        name = pData.appIndex.seoTitle.split(" Profile")[0];
    }
    if (pData.name) name = pData.name; // Use direct property if exists

    const imageId = pData.faceImageId || pData.imageId;
    const dob = pData.DoBFormat;
    const teams = pData.teamNameIds ? pData.teamNameIds.map(t => t.teamName).join(', ') : '';

    return (
        <div className="teams-page-wrapper">
            <div className="teams-container">
                <BackButton />
                <div className="team-detail-header" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        <FavoriteButton
                            type="player"
                            itemId={id}
                            title={name}
                            imageUrl={imageId ? imageId.toString() : ""}
                        />
                    </div>
                    <img
                        src={getImageUrl(imageId)}
                        alt={name}
                        className="team-detail-flag"
                        style={{ borderRadius: '50%', width: '150px', height: '150px', objectFit: 'cover', objectPosition: 'top' }}
                    />
                    <h1>{name}</h1>
                </div>

                <div className="player-info-card" style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', width: '100%', boxSizing: 'border-box' }}>
                    <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                        <div>
                            <h3>Personal Info</h3>
                            <p><strong>Born:</strong> {dob || 'N/A'}</p>
                            <p><strong>Teams:</strong> {teams || 'N/A'}</p>
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <h3>Bio</h3>
                            <div dangerouslySetInnerHTML={{ __html: pData.bio || 'No bio available.' }} />
                        </div>

                        {pData.rankings && (
                            <div>
                                <h3>Rankings</h3>
                                {Object.entries(pData.rankings).map(([format, ranks]) => (
                                    <div key={format} style={{ marginBottom: '0.5rem' }}>
                                        <strong style={{ textTransform: 'capitalize' }}>{format}:</strong>
                                        {Object.entries(ranks).map(([k, v]) => <span key={k} style={{ marginLeft: '10px' }}>{k.replace('BestRank', '').replace('Rank', '')}: #{v}</span>)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Batting */}
                    {pData.recentBatting && (
                        <div style={{ marginTop: '2rem' }}>
                            <h3>Recent Batting</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                                            {pData.recentBatting.headers.map(h => <th key={h} style={{ padding: '0.8rem' }}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pData.recentBatting.rows.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                {row.values.map((v, i) => <td key={i} style={{ padding: '0.8rem' }}>{v}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};