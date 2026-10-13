'use client';

import React from 'react';
import type { AiSummary } from '../lib/types';
import { formatDate } from '../lib/utils';
import { Sparkles, BrainCircuit, CheckCircle2 } from 'lucide-react';

interface AiSummaryCardProps {
  aiSummary?: AiSummary;
  repoName: string;
}

export function AiSummaryCard({ aiSummary, repoName }: AiSummaryCardProps) {
  if (!aiSummary || !aiSummary.summary) {
    return (
      <div className="bg-gradient-to-br from-[#111827] to-[#131f37] border border-blue-900/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Gemini 3.8 Analysis
              <span className="text-[11px] font-mono bg-blue-950/80 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-full">
                Queued
              </span>
            </h3>
            <p className="text-xs text-gray-400">Automated architecture overview</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 italic">
          AI insights for {repoName} are currently processing or pending background ingestion.
        </p>
      </div>
    );
  }

  const confidencePercent = aiSummary.confidenceScore
    ? Math.round(aiSummary.confidenceScore * 100)
    : 95;

  return (
    <div className="bg-gradient-to-br from-[#111827] to-[#121c33] border border-blue-900/40 rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-blue-950/20">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 text-blue-400 border border-blue-500/30">
            <BrainCircuit className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Gemini 3.8 Insights
              <span className="text-[10px] font-mono bg-blue-900/60 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full">
                {aiSummary.aiModel || 'gemini-3.8-flash'}
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Generated {formatDate(aiSummary.generatedAt)}
            </p>
          </div>
        </div>

        {/* Confidence metric */}
        <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-800/30 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-gray-300">Confidence:</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">
            {confidencePercent}%
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-invert prose-sm max-w-none text-gray-300 text-sm leading-relaxed whitespace-pre-line">
        {aiSummary.summary}
      </div>
    </div>
  );
}
