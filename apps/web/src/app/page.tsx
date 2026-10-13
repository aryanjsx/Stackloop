'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { Repository } from '../lib/types';
import { fetchRepositories, fetchSavedRepositories } from '../lib/api';
import { RepositoryCard } from '../components/repository-card';
import { SearchFilters } from '../components/search-filters';
import { Compass, Sparkles, RefreshCw } from 'lucide-react';

export default function DiscoverPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [savedRepoIds, setSavedRepoIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'updated'>('popular');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRepositories({
        q: searchQuery || undefined,
        language: selectedLanguage || undefined,
        sort: sortBy,
        page,
        pageSize: 12,
      });

      setRepositories(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);

      // Attempt to load saved repositories for the current user
      try {
        const savedRes = await fetchSavedRepositories({ page: 1, pageSize: 100 });
        const ids = new Set(savedRes.items.map((i) => i.repositoryId));
        setSavedRepoIds(ids);
      } catch {
        // User not logged in or saved list fetch failed, leave empty
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedLanguage, sortBy, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLanguage('');
    setSortBy('popular');
    setPage(1);
  };

  const handleBookmarkToggle = (repoId: string, saved: boolean) => {
    setSavedRepoIds((prev) => {
      const next = new Set(prev);
      if (saved) {
        next.add(repoId);
      } else {
        next.delete(repoId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#111c35] to-[#0d1527] border border-blue-900/30 p-8 sm:p-10 shadow-2xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Gemini 3.8 Intelligence Engine Active</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Discover Exceptional <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
              Open-Source Repositories
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
            Curated GitHub discovery enriched by automated AI architecture summaries,
            technology classifications, and real-time community engagement metrics.
          </p>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <SearchFilters
        searchQuery={searchQuery}
        selectedLanguage={selectedLanguage}
        sortBy={sortBy}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        onLanguageChange={(lang) => {
          setSelectedLanguage(lang);
          setPage(1);
        }}
        onSortChange={(sort) => {
          setSortBy(sort);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* Main Content Area */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            <span>Discover Repositories</span>
            <span className="text-xs font-mono text-gray-400 font-normal">
              ({total} {total === 1 ? 'project' : 'projects'})
            </span>
          </h2>

          <button
            onClick={loadData}
            title="Refresh feed"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-[#111827] border border-gray-800 rounded-xl p-5 animate-pulse space-y-4"
              >
                <div className="h-4 bg-gray-800 rounded w-1/3" />
                <div className="h-5 bg-gray-800 rounded w-3/4" />
                <div className="h-10 bg-gray-800/60 rounded w-full" />
                <div className="h-4 bg-gray-800 rounded w-1/2 pt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-8 text-center space-y-3">
            <p className="text-red-400 text-sm font-medium">{error}</p>
            <p className="text-gray-400 text-xs">
              Make sure the StackLoop API service is running at port 4000.
            </p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && repositories.length === 0 && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-950/80 text-blue-400 flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No repositories found</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              We couldn&apos;t find any repositories matching your filters. Try clearing your search or selecting a different language.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Repository Grid */}
        {!loading && !error && repositories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {repositories.map((repo) => (
              <RepositoryCard
                key={repo.id}
                repository={repo}
                isSaved={savedRepoIds.has(repo.id)}
                onBookmarkToggle={(saved) => handleBookmarkToggle(repo.id, saved)}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400 font-mono px-3">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
