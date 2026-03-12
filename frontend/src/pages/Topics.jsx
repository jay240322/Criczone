import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNewsByTopic, getHybridNews, getLocalTopicNews } from "../api/cricapi";
import { getNewsImage } from "../utils/images";
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import "./Css/news.css"; // Reusing news styles

export default function Topics() {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState('349'); // Default to 349 (Recent/India)

    const topics = [
        { id: '349', name: 'Recent' },
        { id: '1', name: 'International' },
        { id: '20', name: 'T20 Leagues' },
        { id: '13', name: 'Features' }
    ];

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                setLoading(true);
                const response = await getNewsByTopic(selectedTopic);
                console.log("Topics Data:", response);

                const stories = response.data.storyList || [];
                // Filter valid stories
                const validStories = stories.filter(item => item.story);
                const normalized = validStories.map(item => ({
                    ...item.story,
                    headline: item.story.hline || item.story.headline,
                    id: item.story.id
                })).slice(0, 25); // Limit to latest 25 items

                setNewsList(normalized);
                setError(null);
            } catch (err) {
                console.error("Error fetching topics:", err);
                setError("Failed to load topics.");
            } finally {
                setLoading(false);
            }
        };

        fetchTopics();
    }, [selectedTopic]);

    if (loading) return <Loader message="Loading Topics..." />;
    // if (error) return <div className="news-error">{error}</div>; // Allow UI to show even if error to switch topics

    return (
        <div className="news-page-container">
            <BackButton />
            <h1 className="news-page-title">Curated Topics</h1>

            <div className="topic-selector" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {topics.map(topic => (
                    <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic.id)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: 'none',
                            background: selectedTopic === topic.id ? '#009270' : '#e0e0e0',
                            color: selectedTopic === topic.id ? 'white' : '#333',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {topic.name}
                    </button>
                ))}
            </div>

            {error && <div className="news-error">{error}</div>}

            <div className="news-list-stack">
                {newsList.map((story, index) => {
                    if (!story.id && !story.headline) return null;

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
                                        {story.pubTime ? new Date(parseInt(story.pubTime)).toLocaleDateString() : ''}
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
