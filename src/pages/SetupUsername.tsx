import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db } from '../lib/firebase';

export default function SetupUsername() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError('');

    try {
      // Validate username
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      // Validate password
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Set password for Google users so they can sign in with email/password later
      await updatePassword(currentUser, password);

      // Update user document with username
      await updateDoc(doc(db, 'users', currentUser.uid), {
        username: username.toLowerCase(),
        displayName: username,
        updatedAt: new Date(),
        hasPassword: true, // Flag to indicate user has set a password
      });

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Floating ocean elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-6 h-6 bg-blue-400/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-cyan-300/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-blue-300/20 rounded-full animate-bounce"></div>
      </div>

      <div className="relative max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100">
            Complete Your Setup
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Choose your username and create a password for your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input-primary mt-1"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-primary mt-1"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="input-primary mt-1"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-300">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-400 space-y-3">
            <div>
              <p className="font-medium text-slate-300">Username requirements:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>At least 3 characters long</li>
                <li>Only letters, numbers, and underscores</li>
                <li>Will be converted to lowercase</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-300">Password requirements:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>At least 6 characters long</li>
                <li>Must match confirmation</li>
              </ul>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim() || !confirmPassword.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting up...
                </div>
              ) : (
                'Complete Setup'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
