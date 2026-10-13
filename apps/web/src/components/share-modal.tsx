'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Copy, Share2, Twitter, Linkedin, MessageSquare } from 'lucide-react';
import type { Repository } from '../lib/types';

interface ShareModalProps {
  repository: Pick<Repository, 'id' | 'name' | 'fullName' | 'description' | 'repositoryUrl'>;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ repository, isOpen, onClose }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

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

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/repositories/${repository.id}`
    : `https://stackloop.dev/repositories/${repository.id}`;

  const shareText = `Check out ${repository.fullName} on StackLoop — AI-Powered GitHub Discovery!`;
  const markdownSnippet = `[![StackLoop Discovery](https://img.shields.io/badge/StackLoop-AI%20Discovery-blue)](${appUrl})\nExplore [${repository.fullName}](${repository.repositoryUrl}) - ${repository.description || 'Open source project'}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownSnippet);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${repository.fullName} on StackLoop`,
          text: shareText,
          url: appUrl,
        });
      } catch {
        // User cancelled share
      }
    }
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(appUrl)}&hashtags=opensource,github,stackloop`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`;
  const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(appUrl)}&title=${encodeURIComponent(`${repository.fullName} — AI-analyzed on StackLoop`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl p-6 space-y-6 text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Share Repository</h3>
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

        {/* Copy Direct URL */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">StackLoop Discovery Link</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="flex-1 bg-[#172033] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-gray-300 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Social Share Grid */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-300">Share to Social Platforms</span>
          <div className="grid grid-cols-3 gap-2.5">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 bg-gray-800/80 hover:bg-gray-800 text-gray-200 border border-gray-700/60 hover:border-blue-500/50 py-2.5 px-3 rounded-xl text-xs font-medium transition"
            >
              <Twitter className="w-4 h-4 text-[#1DA1F2]" />
              <span>X / Twitter</span>
            </a>
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 bg-gray-800/80 hover:bg-gray-800 text-gray-200 border border-gray-700/60 hover:border-blue-500/50 py-2.5 px-3 rounded-xl text-xs font-medium transition"
            >
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              <span>LinkedIn</span>
            </a>
            <a
              href={redditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 bg-gray-800/80 hover:bg-gray-800 text-gray-200 border border-gray-700/60 hover:border-blue-500/50 py-2.5 px-3 rounded-xl text-xs font-medium transition"
            >
              <MessageSquare className="w-4 h-4 text-[#FF4500]" />
              <span>Reddit</span>
            </a>
          </div>
        </div>

        {/* Native Web Share button if available */}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center space-x-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 text-xs text-gray-300 py-2 rounded-xl transition"
          >
            <Share2 className="w-4 h-4 text-blue-400" />
            <span>Open System Share Dialog...</span>
          </button>
        )}

        {/* Markdown Snippet */}
        <div className="space-y-1.5 pt-2 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-400">README Badge & Markdown Snippet</span>
            <button
              onClick={handleCopyMarkdown}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
            >
              {copiedMarkdown ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedMarkdown ? 'Snippet Copied!' : 'Copy Markdown'}</span>
            </button>
          </div>
          <pre className="bg-[#0B1220] border border-gray-800 rounded-lg p-2.5 text-[11px] font-mono text-gray-400 overflow-x-auto">
            {markdownSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
