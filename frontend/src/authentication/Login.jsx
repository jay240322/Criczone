import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import cricapi from '../api/cricapi';
import './login.css';

export default function login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Extract username from email
            const username = userCredential.user.displayName || email.split('@')[0];
            localStorage.setItem('criczone_username', username);

            // Sync to MongoDB
            await cricapi.syncUserToDB(userCredential.user);

            console.log("Logged in successfully");
            navigate('/home');
        } catch (err) {
            console.error("Login Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const username = user.displayName || user.email.split('@')[0];
            localStorage.setItem('criczone_username', username);

            // Sync to MongoDB
            await cricapi.syncUserToDB(user);

            console.log("Google Login Successful");
            navigate('/home');
        } catch (err) {
            console.error("Google Login Error:", err);
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Log in to your CricZone account</p>
                </div>

                {error && <div className="auth-error-message" style={{ color: 'red', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className="forgot-password">
                            <a href="#reset">Forgot Password?</a>
                        </div>
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Logging In...' : 'Log In'}
                    </button>

                    <div className="auth-divider">
                        <span>OR</span>
                    </div>

                    <button type="button" className="google-auth-btn" onClick={handleGoogleLogin}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" className="google-icon" />
                        Continue with Google
                    </button>
                </form>

                <div className="auth-footer">
                    <p>New to CricZone? <Link to="/signup">Create new account</Link></p>
                </div>
            </div>
        </div>
    );
};