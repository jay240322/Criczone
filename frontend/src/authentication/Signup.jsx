import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import cricapi from '../api/cricapi';
import './singup.css';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Optionally update the user's display name
            await updateProfile(userCredential.user, { displayName: name });
            localStorage.setItem('criczone_username', name); // Persist name

            // Sync to MongoDB
            await cricapi.syncUserToDB({ ...userCredential.user, displayName: name });

            console.log("Signed up successfully.");

            // Clear form
            setName('');
            setEmail('');
            setPassword('');

            // Navigate to home after successful signup
            navigate('/home');

        } catch (err) {
            console.error("Signup Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const username = user.displayName || user.email.split('@')[0];
            localStorage.setItem('criczone_username', username);

            // Sync to MongoDB
            await cricapi.syncUserToDB(user);

            console.log("Google Signup Successful");
            navigate('/home');
        } catch (err) {
            console.error("Google Signup Error:", err);
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Join CricZone</h2>
                    <p>Create an account to track your favorite teams</p>
                </div>

                {error && <div className="auth-error-message" style={{ color: 'red', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

                <form className="auth-form" onSubmit={handleSignup}>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Signing Up...' : 'Sign Up'}
                    </button>

                    <div className="auth-divider">
                        <span>OR</span>
                    </div>

                    <button type="button" className="google-auth-btn" onClick={handleGoogleSignup}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" className="google-icon" />
                        Continue with Google
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Log In instead</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
