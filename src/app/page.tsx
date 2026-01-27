'use client';

import { useState, useEffect } from 'react';
import CEOWarRoom from '../components/CEOWarRoom';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated (session storage)
    const auth = sessionStorage.getItem('war-room-auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        sessionStorage.setItem('war-room-auth', 'true');
        setIsAuthenticated(true);
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Authentication failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2">🎯 CEO WAR ROOM</h1>
            <p className="text-zinc-400">Enter password to access dashboard</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
              autoFocus
            />
            
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            
            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <CEOWarRoom />;
}
