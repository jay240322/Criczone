import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { getFavorites, toggleFavorite } from '../api/cricapi';
import './FavoriteButton.css';

export default function FavoriteButton({ type, itemId, title, imageUrl, extraData }) {
    const [isFav, setIsFav] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Since Firebase auth might take a moment to initialize
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser && itemId) {
                try {
                    const favs = await getFavorites(currentUser.uid);
                    // Check if this item exists in the user's favorites
                    const typeArray = favs[`${type}s`] || []; // 'players', 'videos', 'scorecards'
                    const exists = typeArray.some(f => f.itemId === itemId.toString());
                    setIsFav(exists);
                } catch (e) {
                    console.error("Error checking favorite status", e);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [itemId, type]);

    const handleToggle = async (e) => {
        e.stopPropagation(); // prevent navigation if placed inside a card
        e.preventDefault();

        if (!user) {
            alert("Please log in to save favorites!");
            return;
        }

        try {
            // Optimistic UI update
            setIsFav(!isFav);
            const res = await toggleFavorite(user.uid, type, itemId.toString(), title, imageUrl, extraData);

            // Sync with actual backend response in case of error
            if (res.status === 'added') setIsFav(true);
            else if (res.status === 'removed') setIsFav(false);
        } catch (err) {
            console.error("Failed to toggle fav", err);
            setIsFav(isFav); // revert on error
        }
    };

    if (loading || !user) return null; // Only show for logged in users

    return (
        <button
            className={`favorite-btn ${isFav ? 'active' : ''}`}
            onClick={handleToggle}
            title={isFav ? "are you sure" : "Add to favorites"}
        >
            <span className="fav-text">{isFav ? 'Remove from favourites' : '+ Add to favourite'}</span>
        </button>
    );
};

