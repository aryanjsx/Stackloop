'use client';

import React, { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { starRepository, getLocalPreferences } from '../lib/api';
import { formatNumber } from '../lib/utils';

interface StarButtonProps {
  repositoryId: string;
  initialStars: number;
  initialStarred?: boolean;
  onToggle?: (starred: boolean, newCount: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function StarButton({
  repositoryId,
  initialStars,
  initialStarred = false,
  onToggle,
  size = 'md',
  showCount = true,
}: StarButtonProps) {
  const [starred, setStarred] = useState(initialStarred);
  const [starsCount, setStarsCount] = useState(initialStars);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    const nextStarred = !starred;
    const nextCount = starsCount + (nextStarred ? 1 : -1);

    // Optimistic UI update
    setStarred(nextStarred);
    setStarsCount(nextCount);
    if (onToggle) onToggle(nextStarred, nextCount);

    try {
      setLoading(true);
      const prefs = getLocalPreferences();
      const res = await starRepository(repositoryId, nextStarred, prefs.githubPat);
      if (typeof res?.stargazers_count === 'number') {
        setStarsCount(res.stargazers_count);
      }
    } catch (err) {
      console.error('Failed to star repository', err);
      // Revert on complete failure if needed
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5 rounded-lg',
    md: 'text-xs sm:text-sm px-3.5 py-1.5 gap-2 rounded-xl',
    lg: 'text-sm sm:text-base px-4 py-2 gap-2.5 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4 h-4 sm:w-5 sm:h-5',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={starred ? 'Starred on GitHub & StackLoop' : 'Star this repository'}
      className={`inline-flex items-center font-medium transition-all duration-150 border ${
        starred
          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
          : 'bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-700/70 hover:border-gray-600'
      } ${sizeClasses[size]}`}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin text-amber-400`} />
      ) : (
        <Star
          className={`${iconSizes[size]} transition-transform ${
            starred ? 'fill-amber-400 text-amber-400 scale-110' : 'text-gray-400 hover:text-amber-400'
          }`}
        />
      )}
      <span>{starred ? 'Starred' : 'Star'}</span>
      {showCount && (
        <span
          className={`font-mono text-[11px] px-1.5 py-0.2 rounded-md ${
            starred ? 'bg-amber-400/20 text-amber-300' : 'bg-gray-700/60 text-gray-300'
          }`}
        >
          {formatNumber(starsCount)}
        </span>
      )}
    </button>
  );
}
