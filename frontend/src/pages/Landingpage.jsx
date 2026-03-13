import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Css/landingpage.css';
import logo from '../assets/CricZone.png';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="landing-container">
            <div className="animated-bg">
                <div className="circle circle-1"></div>
                <div className="circle circle-2"></div>
                <div className="circle circle-3"></div>
            </div>

            <div className="content-wrapper">
                <h1 className="main-title">
                    <span className="slide-up" style={{
                        fontSize: "5rem",
                        color: "var(--title-green)",
                    }}><img src={logo} alt="Criczone" height="50%" width="50%" /></span>
                </h1>
                <p className="subtitle fade-in">
                    Live Scores. Player Stats. The Heart of Cricket.
                </p>
                <div className="description fade-in-delay">
                    Experience every boundary, wicket, and milestone in real-time.
                    Your ultimate companion for everything cricket.
                </div>

                <button className="get-started-btn bounce-in" onClick={() => navigate('/login')}>
                    Get Started
                </button>
            </div>
            <div className="features-section">
                <div className="feature-card float-delay-1">
                    <div className="card-icon">🔴</div>
                    <h3>Live Score</h3>
                    <p>Catch every ball, boundary, and wicket in real-time.</p>
                </div>
                <div className="feature-card float-delay-2">
                    <div className="card-icon">📅</div>
                    <h3>Past Matches</h3>
                    <p>Relive the excitement with detailed match history.</p>
                </div>
                <div className="feature-card float-delay-3">
                    <div className="card-icon">📰</div>
                    <h3>Latest News</h3>
                    <p>Stay updated with breaking stories and player stats.</p>
                </div>
            </div>

            <footer className="landing-footer">
                <div className="footer-links">
                    <a href="#instagram">Instagram</a>
                    <a href="#facebook">Facebook</a>
                </div>
                <p>&copy; 2026 CricZone. All rights reserved. | Created by Jay, Sumit, & Shubham</p>
            </footer>
        </div>
    );
};