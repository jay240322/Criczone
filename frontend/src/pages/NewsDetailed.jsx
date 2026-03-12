import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHybridNewsDetail, getImageUrl } from '../api/cricapi';
// import { getNewsImage } from '../utils/images';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import './Css/NewsDetailed.css';

const NewsDetailed = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [newsData, setNewsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const response = await getHybridNewsDetail(id);
                console.log("News Detail Source:", response.source);
                setNewsData(response.data);
            } catch (err) {
                console.error("Error fetching news detail:", err);
                setError("Failed to load full article.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDetail();
        }
    }, [id]);



    const renderContent = (contentData) => {
        // 1. If content is a simple string, return it wrapped in p
        if (typeof contentData === 'string') {
            return <p>{contentData}</p>;
        }

        // 2. If it's an array
        if (Array.isArray(contentData) && contentData.length > 0) {
            return contentData.map((item, index) => {
                // Case A: Array of strings
                if (typeof item === 'string') {
                    return <p key={index}>{item}</p>;
                }
                // Case B: Complex structure from API (item.content.contentType...)
                if (item.content && item.content.contentType === 'text') {
                    return <p key={index}>{item.content.contentValue}</p>;
                }
                // Case C: Direct object with 'content' or 'value' (fallback)
                if (item.content && typeof item.content === 'string') {
                    return <p key={index}>{item.content}</p>;
                }
                return null;
            });
        }

        // 3. Fallback: If no content, try generic description/intro
        if (newsData.intro || newsData.description) {
            return <p>{newsData.intro || newsData.description}</p>;
        }

        return <p>No detailed content available.</p>;
    };

    if (loading) return <Loader message="Loading Article..." />;
    if (error) return <div className="news-error">{error}</div>;
    if (!newsData) return <div className="news-error">Article not found.</div>;

    return (
        <div className="news-detailed-container">
            <BackButton />
            <div className="news-detailed-content">
                <h1 className="news-detailed-title">{newsData.headline || newsData.hline}</h1>
                <p className="news-detailed-meta">
                    {new Date(parseInt(newsData.publishTime || newsData.pubTime)).toLocaleString()} | {newsData.context}
                </p>
                <div className="news-detailed-image">
                    <img
                        src={getImageUrl(newsData.coverImage?.id)}
                        alt={newsData.coverImage?.caption || newsData.headline}
                        className="news-detailed-img"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                    {newsData.coverImage?.caption && <p className="image-caption">{newsData.coverImage.caption}</p>}
                </div>
                <div className="news-detailed-text">
                    {renderContent(newsData.content)}
                </div>
            </div>
        </div>
    );
};

export default NewsDetailed;
