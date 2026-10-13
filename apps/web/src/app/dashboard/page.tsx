'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Bookmark, 
  ExternalLink, 
  Star, 
  GitFork, 
  Sparkles, 
  Trash2, 
  Compass, 
  ShieldCheck, 
  Calendar, 
  ArrowRight,
  Github,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { fetchCurrentUser, fetchSavedRepositories, unsaveRepository, getGitHubLoginUrl } from '../../lib/api';
import type { User, SavedRepositoryItem } from '../../lib/types';
import { formatNumber, formatDate, getLanguageColor } from '../../lib/utils';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [savedItems, setSavedItems] = useState<SavedRepositoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const res = await fetchSavedRepositories({ pageSize: 50 });
        setSavedItems(res.items);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(repositoryId: string, repoName: string) {
    if (!confirm(`Remove "${repoName}" from your saved repositories?`)) return;

    setRemovingId(repositoryId);
    try {
      await unsaveRepository(repositoryId);
      setSavedItems(prev => prev.filter(item => item.repositoryId !== repositoryId));
    } catch (err: any) {
      alert(`Could not remove repository: ${err?.message || 'Unknown error'}`);
    } finally {
      setRemovingId(null);
    }
  }

  // Filter saved items locally by name or language
  const filteredItems = savedItems.filter(item => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const repo = item.repository;
    if (!repo) return false;
    return (
      repo.fullName.toLowerCase().includes(q) ||
      (repo.description && repo.description.toLowerCase().includes(q)) ||
      (repo.language && repo.language.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-gray-400 text-sm">Loading your developer dashboard...</p>
      </div>
    );
  }

  // Unauthenticated State
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-teal-400">
          <Bookmark className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
          Sign In to Access Your Dashboard
        </h1>
        <p className="text-gray-400 max-w-md mx-auto mb-8">
          Save open-source repositories, analyze tech stacks with Gemini 3.8, and curate your personalized developer library.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={getGitHubLoginUrl('/dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold rounded-xl transition shadow-lg shadow-teal-500/10"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </a>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800/80 hover:bg-gray-800 text-gray-300 font-medium rounded-xl border border-gray-700/80 transition"
          >
            <Compass className="w-4 h-4" />
            Discover Repositories
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="space-y-8">
      {/* User Header Profile Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900 to-gray-850 border border-gray-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                className="w-16 h-16 rounded-full border-2 border-teal-500/40 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-teal-500/40 flex items-center justify-center text-teal-400 font-bold text-xl">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {user.displayName || user.username}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 capitalize">
                  {user.role}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-0.5">@{user.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold text-sm rounded-lg transition shadow-md shadow-teal-500/10"
            >
              <Compass className="w-4 h-4" />
              Explore More
            </Link>
            <button
              onClick={loadDashboard}
              title="Refresh"
              className="p-2 text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-800 border border-gray-700/80 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800/80">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Saved Repositories</span>
            <p className="text-2xl font-bold text-teal-400 mt-0.5">{savedItems.length}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">AI Analysis Ready</span>
            <p className="text-2xl font-bold text-purple-400 mt-0.5">Gemini 3.8</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sync Status</span>
            <div className="flex items-center gap-1.5 mt-1 text-emerald-400 text-sm font-medium">
              <ShieldCheck className="w-4 h-4" />
              Synchronized
            </div>
          </div>
        </div>
      </div>

      {/* Repositories Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Your Saved Repositories ({savedItems.length})
            </h2>
            <p className="text-sm text-gray-400">
              Repositories you have bookmarked for research, reference, and tracking.
            </p>
          </div>

          {savedItems.length > 0 && (
            <input
              type="text"
              placeholder="Filter saved projects..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="px-3.5 py-1.5 text-sm bg-gray-900 border border-gray-700/80 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 w-full sm:w-64"
            />
          )}
        </div>

        {savedItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-gray-900/40 border border-dashed border-gray-800">
            <Bookmark className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">No saved repositories yet</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              Browse the discovery feed to find high-impact open-source repositories and click the bookmark button to collect them here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold text-sm rounded-lg transition"
            >
              <Compass className="w-4 h-4" />
              Explore Discover Feed
            </Link>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-gray-900/30 border border-gray-800">
            <p className="text-gray-400 text-sm">No saved repositories matched &quot;{searchFilter}&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => {
              const repo = item.repository;
              const isRemoving = removingId === item.repositoryId;
              if (!repo) return null;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between p-5 rounded-xl bg-gray-900/70 border border-gray-800 hover:border-gray-700 transition"
                >
                  <div className="space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/repositories/${repo.id}`}
                        className="font-semibold text-white hover:text-teal-400 transition text-base tracking-tight truncate flex-1"
                      >
                        {repo.fullName}
                      </Link>
                      <button
                        onClick={() => handleRemove(item.repositoryId, repo.fullName)}
                        disabled={isRemoving}
                        title="Remove from saved"
                        className="text-gray-500 hover:text-red-400 transition p-1"
                      >
                        {isRemoving ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {repo.description || 'No description provided.'}
                    </p>

                    {/* Metadata & Stats */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-1">
                      {repo.language && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getLanguageColor(repo.language) }}
                          />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        {formatNumber(repo.stargazersCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3.5 h-3.5 text-gray-500" />
                        {formatNumber(repo.forksCount)}
                      </span>
                      <span className="flex items-center gap-1 text-gray-500 ml-auto text-[11px]">
                        <Calendar className="w-3 h-3" />
                        Saved {formatDate(item.savedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-800/60">
                    <Link
                      href={`/repositories/${repo.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      View AI Insights
                      <ArrowRight className="w-3 h-3" />
                    </Link>

                    <a
                      href={repo.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
                    >
                      GitHub
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
