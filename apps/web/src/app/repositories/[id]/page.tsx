'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchRepositoryById } from '../../../lib/api';
import type { RepositoryDetail } from '../../../lib/types';
import { BookmarkButton } from '../../../components/bookmark-button';
import { AiSummaryCard } from '../../../components/ai-summary-card';
import { formatNumber, formatDate, getLanguageColor } from '../../../lib/utils';
import {
  ArrowLeft,
  ExternalLink,
  Star,
  GitFork,
  AlertCircle,
  Eye,
  HardDrive,
  GitBranch,
  Calendar,
  Layers,
  Tags,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export default function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [repo, setRepo] = useState<RepositoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchRepositoryById(resolvedParams.id)
      .then((data) => {
        if (mounted) setRepo(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Failed to load repository');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-gray-400">Loading repository details...</p>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-8 max-w-lg mx-auto space-y-3">
          <h2 className="text-lg font-semibold text-red-400">Repository Not Found</h2>
          <p className="text-xs text-gray-400">{error || 'Unable to retrieve repository information.'}</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  const languageColor = getLanguageColor(repo.language);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top navigation */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Discover
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-gray-400">{repo.ownerLogin}</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 tracking-tight">
              <span>{repo.name}</span>
              {repo.isVerified && (
                <span title="Verified Repository">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <BookmarkButton repositoryId={repo.id} initialSaved={repo.isSaved} size="md" />
            <a
              href={repo.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/20"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
          {repo.description || 'No description provided by repository maintainers.'}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-800">
          <div className="bg-[#172033]/60 border border-gray-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Star className="w-4 h-4 fill-amber-400/20" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Stars</div>
              <div className="text-sm font-semibold text-white font-mono">
                {formatNumber(repo.stargazersCount)}
              </div>
            </div>
          </div>

          <div className="bg-[#172033]/60 border border-gray-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Forks</div>
              <div className="text-sm font-semibold text-white font-mono">
                {formatNumber(repo.forksCount)}
              </div>
            </div>
          </div>

          <div className="bg-[#172033]/60 border border-gray-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Issues</div>
              <div className="text-sm font-semibold text-white font-mono">
                {formatNumber(repo.openIssuesCount)}
              </div>
            </div>
          </div>

          <div className="bg-[#172033]/60 border border-gray-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Watchers</div>
              <div className="text-sm font-semibold text-white font-mono">
                {formatNumber(repo.watchersCount)}
              </div>
            </div>
          </div>
        </div>

        {/* Extra repository metadata pills */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2">
          {repo.language && (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: languageColor }}
              />
              <span className="text-gray-300">{repo.language}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-gray-500" />
            <span>{repo.defaultBranch}</span>
          </div>

          {repo.sizeKb && (
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-gray-500" />
              <span>{Math.round(repo.sizeKb / 1024)} MB</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span>Updated {formatDate(repo.lastPushAt || repo.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Gemini 3.8 AI Summary Card */}
      <AiSummaryCard aiSummary={repo.aiSummary} repoName={repo.name} />

      {/* Technologies & Categories Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technologies */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Detected Technologies</span>
          </h3>

          {repo.technologies && repo.technologies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {repo.technologies.map((t) => (
                <span
                  key={t.id}
                  className="px-3 py-1 bg-gray-800 text-gray-200 text-xs font-medium rounded-lg border border-gray-700/60"
                >
                  {t.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Technology classification is automatically generated during background ingestion.
            </p>
          )}
        </div>

        {/* Categories */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Tags className="w-4 h-4 text-teal-400" />
            <span>Categories</span>
          </h3>

          {repo.categories && repo.categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {repo.categories.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1 bg-teal-950/40 text-teal-300 text-xs font-medium rounded-lg border border-teal-800/40"
                >
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Categories will be assigned as ecosystem taxonomies update.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
