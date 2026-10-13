'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Repository } from '../lib/types';
import { BookmarkButton } from './bookmark-button';
import { StarButton } from './star-button';
import { ForkModal } from './fork-modal';
import { ShareModal } from './share-modal';
import { formatNumber, formatDate, getLanguageColor } from '../lib/utils';
import { GitFork, ShieldCheck, Sparkles, ExternalLink, Share2 } from 'lucide-react';

interface RepositoryCardProps {
  repository: Repository;
  isSaved?: boolean;
  onBookmarkToggle?: (saved: boolean) => void;
}

export function RepositoryCard({
  repository,
  isSaved = false,
  onBookmarkToggle,
}: RepositoryCardProps) {
  const [isForkOpen, setIsForkOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const languageColor = getLanguageColor(repository.language);

  return (
    <div className="group relative bg-[#111827] hover:bg-[#141d30] border border-gray-800 hover:border-gray-700/80 rounded-xl p-5 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-black/40">
      <div>
        {/* Card Header: Owner, Title, and Action Buttons */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono mb-1 truncate">
              <span>{repository.ownerLogin}</span>
              <span>/</span>
            </div>
            <Link
              href={`/repositories/${repository.id}`}
              className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors tracking-tight flex items-center gap-1.5 truncate"
            >
              <span className="truncate">{repository.name}</span>
              {repository.isVerified && (
                <ShieldCheck
                  className="w-4 h-4 text-blue-400 flex-shrink-0"
                  aria-label="Verified repository"
                />
              )}
            </Link>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsShareOpen(true);
              }}
              title="Share repository"
              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition border border-transparent hover:border-gray-700"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <BookmarkButton
              repositoryId={repository.id}
              initialSaved={isSaved}
              onToggle={onBookmarkToggle}
              size="sm"
            />
            <a
              href={repository.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on GitHub"
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition border border-transparent hover:border-gray-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 leading-relaxed mb-4 min-h-[2.5rem]">
          {repository.description || 'No description provided by repository maintainers.'}
        </p>
      </div>

      {/* Card Footer: Language, Stars, Forks, AI badge */}
      <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          {repository.language && (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: languageColor }}
              />
              <span className="text-gray-300">{repository.language}</span>
            </div>
          )}

          <StarButton
            repositoryId={repository.id}
            initialStars={repository.stargazersCount}
            size="sm"
            showCount={true}
          />

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsForkOpen(true);
            }}
            title="Fork repository"
            className="flex items-center gap-1 text-gray-400 hover:text-blue-300 hover:bg-gray-800 px-2 py-1 rounded-lg border border-transparent hover:border-gray-700 transition"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>{formatNumber(repository.forksCount)}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-gray-500">
            {formatDate(repository.lastPushAt || repository.updatedAt)}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] bg-blue-950/60 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-full font-mono">
            <Sparkles className="w-2.5 h-2.5 text-blue-400" />
            AI
          </span>
        </div>
      </div>

      <ForkModal
        repository={repository}
        isOpen={isForkOpen}
        onClose={() => setIsForkOpen(false)}
      />
      <ShareModal
        repository={repository}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}
