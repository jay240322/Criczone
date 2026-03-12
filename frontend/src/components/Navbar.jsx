import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserById } from '../api/cricapi';
import { onAuthStateChanged } from 'firebase/auth';
import './Navbar.css';

const Navbar = () => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [photoURL, setPhotoURL] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      // Toggle scrolled state when scrolled down more than 50px
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const dbUser = await getUserById(user.uid);
          if (dbUser && dbUser.photoURL) {
            setPhotoURL(dbUser.photoURL);
          } else if (user.photoURL) {
            setPhotoURL(user.photoURL);
          }
        } catch (err) {
          console.error("Failed to fetch user photo for navbar", err);
        }
      } else {
        setPhotoURL('');
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleMore = () => {
    setIsMoreOpen(!isMoreOpen);
  };

  const closeMore = () => {
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-left">
          <Link to="/home" className="navbar-logo" style={{ textDecoration: 'none', color: 'inherit' }}>CricZone</Link>
        </div>
        <div className="navbar-right">
          <ul className="navbar-links">
            <li><Link to="/livescore">Live Score</Link></li>
            <li><Link to="/schedule">Schedule</Link></li>
            <li><Link to="/news">News</Link></li>
            <li><Link to="/topics">Topics</Link></li>
            <li><Link to="/teams">Teams</Link></li>
            <li><Link to="/videos">Videos</Link></li>
            <li><Link to="/rankings">Rankings</Link></li>
          </ul>
          <div className="profile-icon" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', overflow: 'hidden' }}>
            {photoURL ? (
              <img src={photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="icon"
              >
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </nav>

      {/* Overlay to close dropdown when clicking outside */}
      {isMoreOpen && <div className="more-dropdown-overlay" onClick={closeMore}></div>}

      {/* Mobile Bottom Navbar */}
      <div className="bottom-navbar">
        <Link to="/livescore" className={`bottom-nav-item ${location.pathname === '/livescore' ? 'active' : ''}`} onClick={closeMore}>
          <span className="bottom-nav-icon">🏏</span>
          <span className="bottom-nav-text">Matches</span>
        </Link>
        <Link to="/news" className={`bottom-nav-item ${location.pathname === '/news' ? 'active' : ''}`} onClick={closeMore}>
          <span className="bottom-nav-icon">📰</span>
          <span className="bottom-nav-text">News</span>
        </Link>
        <Link to="/videos" className={`bottom-nav-item ${location.pathname === '/videos' ? 'active' : ''}`} onClick={closeMore}>
          <span className="bottom-nav-icon">📺</span>
          <span className="bottom-nav-text">Videos</span>
        </Link>

        <div className="bottom-nav-item more-btn-wrapper">
          <div className="more-btn-toggle" onClick={toggleMore} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <span className="bottom-nav-icon">☰</span>
            <span className="bottom-nav-text">More</span>
          </div>
        </div>
      </div>

      {/* Fixed More Dropdown (moved outside bottom-navbar to prevent stacking context clipping) */}
      {isMoreOpen && (
        <div className="mobile-fixed-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="more-dropdown-item" onClick={() => { navigate('/topics'); closeMore(); }}>Topics</div>
          <div className="more-dropdown-item" onClick={() => { navigate('/teams'); closeMore(); }}>Teams</div>
          <div className="more-dropdown-item" onClick={() => { navigate('/rankings'); closeMore(); }}>Rankings</div>
          <div className="more-dropdown-item" onClick={() => { navigate('/schedule'); closeMore(); }}>Schedule</div>
        </div>
      )}
    </>
  );
};

export default Navbar;
