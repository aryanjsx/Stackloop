'use client';

import React, { useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { saveRepository, unsaveRepository, getGitHubLoginUrl } from '../lib/api';

interface BookmarkButtonProps {
  repositoryId: string;
  initialSaved?: boolean;
  onToggle?: (saved: boolean) => void;
  size?: 'sm' | 'md';
}

export function BookmarkButton({
  repositoryId,
  initialSaved = false,
  onToggle,
  size = 'md',
}: BookmarkButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    setLoading(true);

    const previousState = isSaved;
    setIsSaved(!previousState);

    try {
      if (previousState) {
        await unsaveRepository(repositoryId);
        onToggle?.(false);
      } else {
        await saveRepository(repositoryId);
        onToggle?.(true);
      }
    } catch (err: any) {
      // Revert optimistic update
      setIsSaved(previousState);
      const msg = err?.message || '';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('authentication required')) {
        if (confirm('You must sign in with GitHub to save repositories. Proceed to login?')) {
          window.location.href = getGitHubLoginUrl(window.location.pathname);
        }
      } else {
        alert(`Failed to update bookmark: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={isSaved ? 'Remove from saved repositories' : 'Save repository'}
      title={isSaved ? 'Saved (Click to remove)' : 'Save to your collection'}
      className={`inline-flex items-center justify-center rounded-lg transition border ${
        isSmall ? 'p-1.5 text-xs' : 'p-2 text-sm'
      } ${
        isSaved
          ? 'bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/20'
          : 'bg-gray-800/60 text-gray-400 border-gray-700/60 hover:text-white hover:bg-gray-800 hover:border-gray-600'
      }`}
    >
      {loading ? (
        <Loader2 className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin text-teal-400`} />
      ) : (
        <Bookmark
          className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
            isSaved ? 'fill-teal-400 text-teal-400' : 'text-current'
          }`}
        />
      )}
    </button>
  );
}
