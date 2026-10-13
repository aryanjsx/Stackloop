'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import type { ChatMessage, UserPreferences, RepositoryDetail } from '../lib/types';
import {
  getLocalPreferences,
  askAiAboutRepo,
  askAiGeneral,
  fetchRepositoryById,
} from '../lib/api';

export function AiAgentWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(getLocalPreferences());
  const [currentRepo, setCurrentRepo] = useState<RepositoryDetail | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect active repository from current pathname /repositories/[id]
  useEffect(() => {
    let mounted = true;
    const parts = pathname.split('/repositories/');
    if (parts.length > 1 && parts[1]) {
      const repoId = parts[1].split('/')[0];
      if (repoId) {
        fetchRepositoryById(repoId)
          .then((data) => {
            if (mounted) setCurrentRepo(data);
          })
          .catch(() => {
            if (mounted) setCurrentRepo(null);
          });
        return () => {
          mounted = false;
        };
      }
    }
    setCurrentRepo(null);
  }, [pathname]);

  // Load preferences and listen for updates from profile page or storage
  useEffect(() => {
    setPreferences(getLocalPreferences());

    const handlePrefsUpdated = (e: any) => {
      if (e.detail) {
        setPreferences((prev) => ({ ...prev, ...e.detail }));
      } else {
        setPreferences(getLocalPreferences());
      }
    };

    window.addEventListener('stackloop_preferences_updated', handlePrefsUpdated);
    window.addEventListener('storage', handlePrefsUpdated);
    return () => {
      window.removeEventListener('stackloop_preferences_updated', handlePrefsUpdated);
      window.removeEventListener('storage', handlePrefsUpdated);
    };
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Seed initial welcome message if messages list is empty
  useEffect(() => {
    if (messages.length === 0) {
      const welcome: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hello! I'm your **StackLoop AI Agent** powered by **Gemini 3.8**.\n\nI tailor my insights to your profile preferences:\n- **Experience Level:** ${preferences.experienceLevel}\n- **Explanation Style:** ${preferences.explanationStyle}\n\n${
          currentRepo
            ? `You're currently viewing **${currentRepo.fullName}**. Ask me anything about its architecture, stack, tradeoffs, or click a quick prompt below!`
            : 'Ask me to recommend repositories, analyze trends, or explain architectural patterns across open source projects!'
        }`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcome]);
    }
  }, [preferences, currentRepo]);

  const handleSendMessage = async (queryText?: string, mode: 'describe' | 'architecture' | 'tradeoffs' | 'getting-started' | 'custom' = 'custom') => {
    const textToSend = queryText || inputQuery;
    if (!textToSend || textToSend.trim().length === 0) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
      repositoryId: currentRepo?.id,
      repositoryFullName: currentRepo?.fullName,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      let replyContent = '';
      const currentPrefs = getLocalPreferences();

      if (currentRepo) {
        // Query repo-specific AI describe endpoint
        const res = await askAiAboutRepo({
          repositoryId: currentRepo.id,
          query: textToSend,
          mode: mode,
          preferences: currentPrefs,
        });
        replyContent = res.content;
      } else {
        // Query general discovery AI endpoint
        const res = await askAiGeneral({
          query: textToSend,
          preferences: currentPrefs,
        });
        replyContent = res.content;
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toISOString(),
        repositoryId: currentRepo?.id,
        repositoryFullName: currentRepo?.fullName,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Sorry, I encountered an issue: ${err?.message || 'Unable to complete request'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const quickRepoPrompts = [
    { label: '⚡ Describe this repo', mode: 'describe' as const, query: 'Describe this repository' },
    { label: '🏗️ Explain Architecture', mode: 'architecture' as const, query: 'Explain architecture and system design' },
    { label: '⚖️ Pros & Cons', mode: 'tradeoffs' as const, query: 'What are the pros, cons, and architectural tradeoffs?' },
    { label: '🚀 How to get started', mode: 'getting-started' as const, query: 'How do I install and run this locally?' },
  ];

  const quickGeneralPrompts = [
    '🌟 Recommend top AI repos for my stack',
    '⚡ Find high-performance TypeScript tools',
    '🛠️ Best projects for intermediate contributors',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Collapsed Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center space-x-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-xl shadow-blue-500/25 border border-blue-400/30 hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label="Open StackLoop AI Agent"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <span className="hidden sm:inline-block text-xs sm:text-sm font-semibold tracking-wide">
            {currentRepo ? `Describe ${currentRepo.name}` : 'AI Agent'}
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider bg-white/20 px-1.5 py-0.5 rounded-full hidden sm:inline-block">
            3.8
          </span>
        </button>
      )}

      {/* Expanded Chat Drawer / Widget */}
      {isOpen && (
        <div className="relative w-[calc(100vw-2rem)] sm:w-[440px] h-[580px] max-h-[85vh] bg-[#0E1526] border border-gray-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-[#131C31] border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-white">StackLoop AI Agent</h3>
                  <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800/60 px-1.5 py-0.2 rounded-full">
                    Gemini 3.8
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 truncate max-w-[240px]">
                  {currentRepo ? (
                    <span className="text-blue-400 font-mono truncate">
                      {currentRepo.fullName}
                    </span>
                  ) : (
                    <span>Discovery & Recommendations</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <Link
                href="/profile"
                title="Edit AI persona preferences in profile"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <Sliders className="w-4 h-4" />
              </Link>
              <button
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close AI Agent"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Persona preference notification badge */}
          <div className="px-3.5 py-1.5 bg-[#17223b] border-b border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>
                Style: <strong className="text-gray-200">{preferences.explanationStyle}</strong> ({preferences.experienceLevel})
              </span>
            </div>
            <Link href="/profile" className="text-blue-400 hover:underline text-[10px]">
              Customize &rarr;
            </Link>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                      : 'bg-[#18233C] text-gray-200 border border-gray-700/60 rounded-tl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-[#18233C] border border-gray-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center space-x-2 text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span className="text-[11px]">Gemini 3.8 is analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-[#10172A] border-t border-gray-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {currentRepo
              ? quickRepoPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    disabled={loading}
                    onClick={() => handleSendMessage(p.query, p.mode)}
                    className="whitespace-nowrap px-2.5 py-1 bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 text-[11px] rounded-lg transition flex-shrink-0"
                  >
                    {p.label}
                  </button>
                ))
              : quickGeneralPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    disabled={loading}
                    onClick={() => handleSendMessage(p)}
                    className="whitespace-nowrap px-2.5 py-1 bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 text-[11px] rounded-lg transition flex-shrink-0"
                  >
                    {p}
                  </button>
                ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#131C31] border-t border-gray-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                currentRepo
                  ? `Ask about ${currentRepo.name}...`
                  : 'Ask about open source repos...'
              }
              disabled={loading}
              className="flex-1 bg-[#18233C] border border-gray-700/80 rounded-xl px-3.5 py-2 text-xs text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl transition shadow-md flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
