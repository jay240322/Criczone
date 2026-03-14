import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHybridNews } from "../api/cricapi";
import { getNewsImage } from "../utils/images";
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import "./Css/news.css"; // Reusing news styles

export default function Topics() {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState('recent'); // Default to recent general news

    const topics = [
        { id: 'recent', name: 'Recent' },
        { id: '1', name: 'International' },
        { id: '20', name: 'T20 Leagues' },
        { id: '13', name: 'Country League' }
    ];

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                setLoading(true);
                // The RapidAPI specific topic/category endpoints are historically frozen (e.g. 2008, 2020).
                // To get "fresh" news in these categories, we fetch the live global news stream
                // and accurately filter them locally by context and keywords.
                const response = await getHybridNews();
                const stories = response.data?.storyList || [];
                
                // Extract valid stories
                const validStories = stories.filter(item => item.story).map(item => ({
                    ...item.story,
                    headline: item.story.hline || item.story.headline,
                    id: item.story.id
                }));

                let filteredStories = validStories;

                if (selectedTopic === '1') {
                    // International: Broad filter avoiding specific T20 leagues
                    filteredStories = validStories.filter(s => {
                        const text = `${s.context || ''} ${s.headline || ''} ${s.intro || ''}`.toLowerCase();
                        const isLeague = /(ipl|psl|bbl|hundred|league|women's premier|wpl|cpl|super kings|capitals|indians|riders|sunrisers|titans)/i.test(text);
                        return !isLeague || /(icc|world cup|test|odi|t20i|tour)/i.test(text);
                    });
                } else if (selectedTopic === '20') {
                    // T20 Leagues: Specifically look for franchise/league keywords
                    filteredStories = validStories.filter(s => {
                        const text = `${s.context || ''} ${s.headline || ''} ${s.intro || ''}`.toLowerCase();
                        return /(ipl|psl|bbl|hundred|league|wpl|cpl|super kings|capitals|indians|riders|sunrisers|titans|franchise|auction)/i.test(text);
                    });
                } else if (selectedTopic === '13') {
                    // Features / Country League
                    filteredStories = validStories.filter(s => {
                        const text = `${s.context || ''} ${s.headline || ''} ${s.intro || ''}`.toLowerCase();
                        return s.storyType === 'Features' || /(feature|exclusive|interview|domestic|county|shield)/i.test(text);
                    });
                }

                setNewsList(filteredStories.slice(0, 25));
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
            <h1 className="news-page-title">Topics</h1>

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
