'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, GitFork, ExternalLink, Loader2, CheckCircle2, Key, AlertCircle } from 'lucide-react';
import type { Repository } from '../lib/types';
import { forkRepository, getLocalPreferences } from '../lib/api';

interface ForkModalProps {
  repository: Pick<Repository, 'id' | 'name' | 'fullName' | 'repositoryUrl' | 'forksCount'>;
  isOpen: boolean;
  onClose: () => void;
  onForked?: (newForkUrl: string) => void;
}

export function ForkModal({ repository, isOpen, onClose, onForked }: ForkModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forkSuccess, setForkSuccess] = useState<{ url: string; fullName: string } | null>(null);
  const [hasPat, setHasPat] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const prefs = getLocalPreferences();
      setHasPat(Boolean(prefs.githubPat && prefs.githubPat.trim().length > 0));
      setError(null);
      setForkSuccess(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApiFork = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await forkRepository(repository.id);
      if (res.fork_url) {
        setForkSuccess({
          url: res.fork_url,
          fullName: res.full_name || repository.name,
        });
        if (onForked) onForked(res.fork_url);
      } else if (res.direct_fork_url) {
        window.open(res.direct_fork_url, '_blank', 'noopener,noreferrer');
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to trigger fork. You can fork directly on GitHub.');
    } finally {
      setLoading(false);
    }
  };

  const directGithubForkUrl = `https://github.com/${repository.fullName}/fork`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl p-6 space-y-6 text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Fork Repository</h3>
              <p className="text-xs text-gray-400">{repository.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {forkSuccess ? (
          /* Success state */
          <div className="py-4 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-white">Fork Created Successfully!</h4>
              <p className="text-xs text-gray-400">
                Your new fork is now being provisioned in your GitHub account.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href={forkSuccess.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition shadow-md"
              >
                <span>Open Forked Repository</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium px-4 py-2.5 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Main Fork content */
          <div className="space-y-5">
            <p className="text-xs text-gray-300 leading-relaxed">
              Forking creates a standalone copy of <strong className="text-white font-mono">{repository.fullName}</strong> in your GitHub account so you can experiment, make changes, and open pull requests.
            </p>

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              {hasPat ? (
                /* User has PAT configured: one-click fork */
                <button
                  onClick={handleApiFork}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-3 px-4 rounded-xl shadow-md transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Forking via GitHub API...</span>
                    </>
                  ) : (
                    <>
                      <GitFork className="w-4 h-4" />
                      <span>Fork Directly to My GitHub Account</span>
                    </>
                  )}
                </button>
              ) : null}

              {/* Direct GitHub web link button */}
              <a
                href={directGithubForkUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-medium transition ${
                  hasPat
                    ? 'bg-gray-800/80 hover:bg-gray-800 text-gray-300 border border-gray-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md'
                }`}
              >
                <GitFork className="w-4 h-4" />
                <span>{hasPat ? 'Or Fork via GitHub.com Webpage' : 'Fork Repository on GitHub.com'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Helper note for PAT */}
            <div className="p-3 bg-[#172033]/70 border border-gray-800 rounded-xl flex items-start gap-2.5 text-xs text-gray-400">
              <Key className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>
                  {hasPat
                    ? 'Your GitHub Personal Access Token is active and ready for in-app forking.'
                    : 'Tip: Add a GitHub Personal Access Token in your Profile for instant 1-click in-app forking.'}
                </span>
                {!hasPat && (
                  <div>
                    <Link
                      href="/profile"
                      onClick={onClose}
                      className="text-blue-400 hover:text-blue-300 font-medium underline inline-flex items-center gap-1"
                    >
                      Configure GitHub Token in Profile &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
