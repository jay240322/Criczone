import React from 'react';
import './Loader.css';

export default function Loader({ message = "Loading..." }) {
    return (
        <div className="global-loader-container">
            <div className="global-loader-spinner"></div>
            {message && <p className="global-loader-text">{message}</p>}
        </div>
    );
};

