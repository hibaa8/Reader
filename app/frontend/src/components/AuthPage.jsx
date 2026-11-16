import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useLibrary } from '../LibraryContext';
import '../styles/AuthPage.css';

export default function AuthPage({ mode }) {
    const signup = mode === 'signup';
    const { user, accountAction } = useLibrary();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [working, setWorking] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setWorking(true);
        try {
            await accountAction(signup ? 'signup' : 'login', signup ? { name, email, password } : { email, password });
            navigate('/');
        } catch (failure) {
            setError(failure.message);
        } finally {
            setWorking(false);
        }
    };

    return <>
        <Navbar />
        <main className="auth-page" id="main-content">
            <div className="auth-card">
                {user ? <><h1>You are signed in</h1><p>Your reading progress is saved to this account.</p><Link to="/">Back to library</Link></> : <>
                    <span className="eyebrow">YOUR LIBRARY</span>
                    <h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
                    <p>Keep your reading history and pick up where you left off.</p>
                    <form onSubmit={submit}>
                        {signup && <label>Name<input autoComplete="name" required maxLength="80" value={name} onChange={(event) => setName(event.target.value)} /></label>}
                        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                        <label>Password<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 12 : undefined} maxLength="128" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                        {signup && <small>Use at least 12 characters.</small>}
                        {error && <p className="auth-error" role="alert">{error}</p>}
                        <button type="submit" disabled={working}>{working ? 'Working…' : signup ? 'Create account' : 'Sign in'}</button>
                    </form>
                    <p className="auth-switch">{signup ? 'Already have an account?' : 'New here?'} <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create an account'}</Link></p>
                </>}
            </div>
        </main>
    </>;
}
