import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHybridNews } from "../api/cricapi";
import { getNewsImage } from "../utils/images";
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import "./Css/news.css";

export default function News() {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');

    const fetchNews = async (query = '') => {
        try {
            setLoading(true);
            const response = await getHybridNews(query);
            console.log("News Data Source:", response.source);

            const stories = response.data.storyList || [];
            // Filter valid stories
            const validStories = stories.filter(item => item.story || item.headline); // item.headline check for local structure
            // Normalize structure: Local might return direct objects, External returns { story: {...} }
            const normalized = validStories.map(item => {
                const s = item.story || item;
                // Normalize keys (API uses hline, DB uses headline)
                return {
                    ...s,
                    headline: s.headline || s.hline,
                    id: s.id || s._id // Ensure ID exists (External 'id' or Mongo '_id')
                };
            });

            setNewsList(normalized);
            setError(null);
        } catch (err) {
            console.error("Error fetching news:", err);
            setError("Failed to load news.");
        } finally {
            setLoading(false);
        }
    };

    // Debounced Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchNews(searchTerm);
        }, 500); // 500ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchNews(searchTerm);
    };

    if (loading) return <Loader message="Loading News..." />;
    if (error) return <div className="news-error">{error}</div>;

    return (
        <div className="news-page-container">
            <BackButton />
            <h1 className="news-page-title">Latest Cricket News</h1>

            <form onSubmit={handleSearch} className="search-container" style={{ maxWidth: '600px', margin: '0 auto 2rem auto', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Search archives..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
                <button
                    type="submit"
                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#009270', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Search
                </button>
            </form>
            <div className="news-list-stack">
                {newsList.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666', marginTop: '2rem' }}>
                        No news found matching "{searchTerm}".
                    </div>
                )}
                {newsList.map((story, index) => {
                    // Item is already normalized in fetchNews
                    if (!story.id && !story.headline) return null; // Skip invalid items

                    return (
                        <Link
                            to={`/news/${story.id}`}
                            key={story.id || index}
                            state={{ newsItem: story }}
                            className="news-card-link"
                        >
                            <div className="news-card-mini">
                                <div className="news-card-image">
                                    <img
                                        src={getNewsImage(story.imageId || (story.coverImage?.id))}
                                        alt={story.headline}
                                    />
                                </div>
                                <div className="news-card-content">
                                    <h2 className="news-card-headline">{story.headline}</h2>
                                    <p className="news-card-intro">{story.intro}</p>
                                    <span className="news-card-time">
                                        {story.pubTime ? new Date(parseInt(story.pubTime)).toLocaleDateString() : 'Just now'}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}