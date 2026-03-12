import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import News from './pages/News';
import NewsDetailed from './pages/NewsDetailed';
import Topics from './pages/Topics';
import Schedule from './pages/Schedule';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import PlayerDetail from './pages/PlayerDetail';
import Rankings from './pages/Rankings';
import ScorecardDetails from './pages/ScorecardDetails';
import LiveScore from './pages/LiveScore';
import Videos from './pages/Videos';
import LandingPage from './pages/Landingpage';
import UserDashboard from './pages/UserDashboard';
import Login from './authentication/Login';
import Signup from './authentication/Signup';
import AdminPanel from './pages/AdminPanel';

function AppContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isAdminPage = location.pathname === '/admin@criczone';

  return (
    <>
      {(!isLandingPage && !isAuthPage && !isAdminPage) && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/livescore" element={<LiveScore />} />
        <Route path="/news" element={<News />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamDetail />} />
        <Route path="/players/:id" element={<PlayerDetail />} />
        <Route path="/news/:id" element={<NewsDetailed />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/scorecard/:matchId" element={<ScorecardDetails />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin@criczone" element={<AdminPanel />} />
      </Routes>
    </>
  );
}

function App() {
  useEffect(() => {
    const storedTheme = localStorage.getItem('criczone_theme');
    if (storedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
  }, []);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
