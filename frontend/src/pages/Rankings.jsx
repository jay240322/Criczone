import React, { useEffect, useState } from 'react';
import { getRankings, getImageUrl } from '../api/cricapi';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import './Css/Rankings.css';

export default function Rankings() {
    const [category, setCategory] = useState('batsmen'); // batsmen, bowlers, allrounders
    const [format, setFormat] = useState('test'); // test, odi, t20
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRankings = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await getRankings(category, format);
                if (response.data && response.data.rank) {
                    setData(response.data.rank);
                } else {
                    setData([]);
                }
            } catch (err) {
                console.error("Error fetching rankings:", err);
                setError("Failed to load rankings.");
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, [category, format]);

    return (
        <div className="rankings-page-wrapper">
            <BackButton />
            <div className="rankings-header">
                <h1>ICC Rankings</h1>
                <p>Top players across all formats</p>
            </div>

            <div className="rankings-filters">
                <div className="filter-group">
                    {['batsmen', 'bowlers', 'allrounders'].map(c => (
                        <button
                            key={c}
                            className={`filter-btn ${category === c ? 'active' : ''}`}
                            onClick={() => setCategory(c)}
                        >
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="divider" style={{ width: '1px', background: '#444', margin: '0 1rem' }}></div>
                <div className="filter-group">
                    {['test', 'odi', 't20'].map(f => (
                        <button
                            key={f}
                            className={`filter-btn ${format === f ? 'active' : ''}`}
                            onClick={() => setFormat(f)}
                        >
                            {f.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {loading && <Loader message="Loading Rankings..." />}

            {!loading && error && <div className="error-msg">{error}</div>}

            {!loading && data && (
                <div className="rankings-table-container">
                    <table className="rankings-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Player</th>
                                <th>Country</th>
                                <th>Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={item.id} className="table-row">
                                    <td className={`rank-cell ${index < 3 ? 'top-rank' : ''}`}>#{item.rank}</td>
                                    <td className="player-cell">
                                        <img
                                            src={getImageUrl(item.faceImageId)}
                                            alt={item.name}
                                            className="player-img"
                                            onError={(e) => e.target.style.background = '#444'}
                                        />
                                        <Link to={`/players/${item.id}`} className="player-name">{item.name}</Link>
                                    </td>
                                    <td className="country-cell">{item.country}</td>
                                    <td><span className="rating-cell">{item.rating}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};