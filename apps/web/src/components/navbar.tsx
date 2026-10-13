'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchCurrentUser, getGitHubLoginUrl, logout } from '../lib/api';
import type { User } from '../lib/types';
import { Github, Bookmark, Compass, LogOut, Loader2, Sparkles, Sliders } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      window.location.href = '/';
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#0B1220]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              S
            </div>
            <span className="font-semibold text-lg text-white tracking-tight flex items-center gap-2">
              StackLoop
              <span className="text-[10px] font-mono uppercase tracking-wider bg-blue-900/60 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded">
                AI 3.8
              </span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/'
                  ? 'bg-gray-800/80 text-white border border-gray-700/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Compass className="w-4 h-4 text-blue-400" />
              Discover
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/dashboard'
                  ? 'bg-gray-800/80 text-white border border-gray-700/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Bookmark className="w-4 h-4 text-teal-400" />
              Saved
            </Link>
            <Link
              href="/profile"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/profile'
                  ? 'bg-gray-800/80 text-white border border-gray-700/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              Preferences
            </Link>
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {loading ? (
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            </div>
          ) : user ? (
            <div className="flex items-center space-x-2">
              <Link
                href="/profile"
                title="Profile & Preferences"
                className={`flex items-center space-x-2 text-sm px-3 py-1.5 rounded-lg border transition ${
                  pathname === '/profile'
                    ? 'bg-gray-800 text-white border-purple-500/50'
                    : 'text-gray-300 hover:text-white bg-gray-800/60 hover:bg-gray-800 border-gray-700/60'
                }`}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-5 h-5 rounded-full ring-1 ring-blue-500/50"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-xs sm:text-sm">{user.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800/60 rounded-lg border border-transparent hover:border-gray-700 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/profile"
                title="Configure preferences & AI settings"
                className="p-2 text-gray-400 hover:text-purple-300 hover:bg-gray-800/60 rounded-lg border border-transparent hover:border-gray-700 transition"
              >
                <Sliders className="w-4 h-4" />
              </Link>
              <a
                href={getGitHubLoginUrl(pathname)}
                title="Instant demo sign in without GitHub credentials"
                className="hidden sm:inline-flex items-center space-x-1.5 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-700/50 text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Demo Sign In</span>
              </a>
              <a
                href={getGitHubLoginUrl(pathname)}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-lg shadow-sm transition border border-blue-400/20"
              >
                <Github className="w-4 h-4" />
                <span>Sign in with GitHub</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
