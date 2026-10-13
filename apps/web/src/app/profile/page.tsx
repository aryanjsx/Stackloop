'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchCurrentUser,
  fetchUserPreferences,
  saveUserPreferences,
  verifyGithubPat,
  getGitHubLoginUrl,
  logout,
} from '../../lib/api';
import type { User, UserPreferences } from '../../lib/types';
import {
  User as UserIcon,
  Github,
  Key,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RotateCcw,
  ExternalLink,
  Shield,
  Code2,
  Layers,
  Cpu,
  LogOut,
} from 'lucide-react';

const POPULAR_LANGUAGES = [
  'TypeScript',
  'Python',
  'Rust',
  'Go',
  'JavaScript',
  'C++',
  'Java',
  'Kotlin',
  'Swift',
  'Elixir',
  'Ruby',
  'PHP',
];

const POPULAR_TOPICS = [
  'Machine Learning',
  'DevOps & Cloud',
  'Web Development',
  'Security & Auth',
  'System Design',
  'Microservices',
  'Data Engineering',
  'Mobile Apps',
  'Databases & Storage',
  'Developer Tools',
];

const EXPERIENCE_LEVELS: { id: UserPreferences['experienceLevel']; label: string; desc: string }[] = [
  {
    id: 'Beginner',
    label: 'Beginner',
    desc: 'Clear, gentle explanations without overwhelming jargon. Focus on fundamentals.',
  },
  {
    id: 'Intermediate',
    label: 'Intermediate',
    desc: 'Balanced practical depth, implementation patterns, and core libraries.',
  },
  {
    id: 'Advanced',
    label: 'Advanced',
    desc: 'Deep dives into internal architecture, low-level tradeoffs, and production scaling.',
  },
];

const EXPLANATION_STYLES: { id: UserPreferences['explanationStyle']; label: string; desc: string }[] = [
  {
    id: 'Concise & Direct',
    label: 'Concise & Direct',
    desc: 'Executive bullet points, high-level pros/cons, and fast evaluation.',
  },
  {
    id: 'Deep Architectural',
    label: 'Deep Architectural',
    desc: 'Data flow, design patterns, microservices boundaries, and system components.',
  },
  {
    id: 'Beginner Friendly',
    label: 'Beginner Friendly',
    desc: 'Plain english, analogies, guided walkthroughs, and helpful terminology.',
  },
  {
    id: 'Practical Code-First',
    label: 'Practical Code-First',
    desc: 'Hands-on snippets, copy-paste starter commands, and usage recipes.',
  },
];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Preference fields
  const [languages, setLanguages] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<UserPreferences['experienceLevel']>('Intermediate');
  const [explanationStyle, setExplanationStyle] = useState<UserPreferences['explanationStyle']>('Concise & Direct');
  const [githubPat, setGithubPat] = useState('');
  const [customLangInput, setCustomLangInput] = useState('');
  const [customTopicInput, setCustomTopicInput] = useState('');

  // PAT verification state
  const [patTesting, setPatTesting] = useState(false);
  const [patVerification, setPatVerification] = useState<{
    valid?: boolean;
    login?: string;
    avatar_url?: string;
    error?: string;
  } | null>(null);

  // Load User and Preferences
  useEffect(() => {
    let mounted = true;

    fetchCurrentUser()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setUserLoading(false);
      });

    fetchUserPreferences()
      .then((prefs) => {
        if (!mounted) return;
        setLanguages(prefs.languages || ['TypeScript', 'Python']);
        setTopics(prefs.topics || ['Machine Learning', 'Web Development']);
        setExperienceLevel(prefs.experienceLevel || 'Intermediate');
        setExplanationStyle(prefs.explanationStyle || 'Concise & Direct');
        setGithubPat(prefs.githubPat || '');
      })
      .catch((err) => {
        console.error('Failed to load user preferences', err);
      })
      .finally(() => {
        if (mounted) setPrefsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const addCustomLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLangInput.trim();
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages((prev) => [...prev, trimmed]);
      setCustomLangInput('');
    }
  };

  const toggleTopic = (topic: string) => {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const addCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTopicInput.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics((prev) => [...prev, trimmed]);
      setCustomTopicInput('');
    }
  };

  const handleTestPat = async () => {
    if (!githubPat.trim()) {
      setPatVerification({ valid: false, error: 'Please enter a GitHub token first.' });
      return;
    }

    try {
      setPatTesting(true);
      setPatVerification(null);
      const res = await verifyGithubPat(githubPat.trim());
      setPatVerification(res);
    } catch (err: any) {
      setPatVerification({ valid: false, error: err?.message || 'Verification failed.' });
    } finally {
      setPatTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const payload: Partial<UserPreferences> = {
        languages,
        topics,
        experienceLevel,
        explanationStyle,
        githubPat: githubPat.trim(),
      };

      await saveUserPreferences(payload);

      // Dispatch event for AiAgentWidget and other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stackloop_preferences_updated', { detail: payload }));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLanguages(['TypeScript', 'Python']);
    setTopics(['Machine Learning', 'Web Development']);
    setExperienceLevel('Intermediate');
    setExplanationStyle('Concise & Direct');
    setGithubPat('');
    setPatVerification(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      window.location.href = '/';
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  if (userLoading || prefsLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-gray-400">Loading your profile & preferences...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Sliders className="w-7 h-7 text-purple-400" />
          <span>Profile & AI Preferences</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Customize your engineering preferences. The bottom-right AI Agent and discovery feeds dynamically tailor insights to match your tech stack and expertise.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-16 h-16 rounded-full ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20">
                {user ? user.username.charAt(0).toUpperCase() : <UserIcon className="w-8 h-8" />}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  {user ? (user.displayName || user.username) : 'Guest User'}
                </h2>
                {user && (
                  <span className="text-[10px] uppercase font-mono tracking-wider bg-blue-950/80 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full">
                    {user.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                {user ? `@${user.username}` : 'Local session mode'}
              </p>
              {user?.email && <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <a
                  href={`https://github.com/${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-medium transition"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Profile</span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/50 rounded-lg text-xs font-medium transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={getGitHubLoginUrl('/profile')}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl shadow-md transition border border-blue-400/20"
                >
                  <Github className="w-4 h-4" />
                  <span>Connect GitHub Account</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <div className="space-y-8">
        {/* Section 1: Preferred Languages */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Preferred Programming Languages</h3>
              <p className="text-xs text-gray-400">
                Choose the languages you specialize in or want to discover more repositories for.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {POPULAR_LANGUAGES.map((lang) => {
              const selected = languages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                      : 'bg-gray-800/80 text-gray-300 border-gray-700/80 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {selected && <span className="mr-1.5">✓</span>}
                  {lang}
                </button>
              );
            })}
            {languages
              .filter((l) => !POPULAR_LANGUAGES.includes(l))
              .map((custom) => (
                <button
                  key={custom}
                  type="button"
                  onClick={() => toggleLanguage(custom)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 text-white border border-blue-500 shadow-sm transition"
                >
                  ✓ {custom}
                </button>
              ))}
          </div>

          <form onSubmit={addCustomLanguage} className="flex items-center gap-2 max-w-sm pt-2">
            <input
              type="text"
              value={customLangInput}
              onChange={(e) => setCustomLangInput(e.target.value)}
              placeholder="Add other language (e.g. Zig, Scala)..."
              className="flex-1 bg-gray-900 border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!customLangInput.trim()}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs font-medium text-white rounded-xl border border-gray-700 transition"
            >
              Add
            </button>
          </form>
        </div>

        {/* Section 2: Technical Domains & Topics */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Focus Topics & Domains</h3>
              <p className="text-xs text-gray-400">
                Select areas of interest to guide the Gemini 3.8 agent and intelligent repo discovery.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {POPULAR_TOPICS.map((topic) => {
              const selected = topics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                    selected
                      ? 'bg-teal-600 text-white border-teal-500 shadow-sm shadow-teal-500/30'
                      : 'bg-gray-800/80 text-gray-300 border-gray-700/80 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {selected && <span className="mr-1.5">✓</span>}
                  {topic}
                </button>
              );
            })}
            {topics
              .filter((t) => !POPULAR_TOPICS.includes(t))
              .map((custom) => (
                <button
                  key={custom}
                  type="button"
                  onClick={() => toggleTopic(custom)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-teal-600 text-white border border-teal-500 shadow-sm transition"
                >
                  ✓ {custom}
                </button>
              ))}
          </div>

          <form onSubmit={addCustomTopic} className="flex items-center gap-2 max-w-sm pt-2">
            <input
              type="text"
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              placeholder="Add other topic (e.g. LLMs, Kubernetes)..."
              className="flex-1 bg-gray-900 border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={!customTopicInput.trim()}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs font-medium text-white rounded-xl border border-gray-700 transition"
            >
              Add
            </button>
          </form>
        </div>

        {/* Section 3: Experience Level */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Experience Level</h3>
              <p className="text-xs text-gray-400">
                Adjusts the depth and technical complexity of AI descriptions and code summaries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {EXPERIENCE_LEVELS.map((lvl) => {
              const active = experienceLevel === lvl.id;
              return (
                <div
                  key={lvl.id}
                  onClick={() => setExperienceLevel(lvl.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    active
                      ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/50'
                      : 'bg-gray-800/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-white">{lvl.label}</span>
                    <input
                      type="radio"
                      name="experienceLevel"
                      checked={active}
                      onChange={() => setExperienceLevel(lvl.id)}
                      className="text-amber-500 focus:ring-amber-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{lvl.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: AI Explanation Style */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">AI Agent Explanation Style</h3>
              <p className="text-xs text-gray-400">
                Determines how the bottom-right AI Assistant communicates repo analysis and answers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {EXPLANATION_STYLES.map((style) => {
              const active = explanationStyle === style.id;
              return (
                <div
                  key={style.id}
                  onClick={() => setExplanationStyle(style.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    active
                      ? 'bg-purple-950/20 border-purple-500/60 ring-1 ring-purple-500/50'
                      : 'bg-gray-800/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-white">{style.label}</span>
                    <input
                      type="radio"
                      name="explanationStyle"
                      checked={active}
                      onChange={() => setExplanationStyle(style.id)}
                      className="text-purple-500 focus:ring-purple-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{style.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: GitHub Personal Access Token (PAT) */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">GitHub Access Token (Optional)</h3>
                <p className="text-xs text-gray-400">
                  Enables 1-click starring and forking directly into your GitHub account from StackLoop.
                </p>
              </div>
            </div>

            <a
              href="https://github.com/settings/tokens/new?scopes=public_repo&description=StackLoop%20Web%20Client"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition"
            >
              <span>Generate PAT on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={githubPat}
                onChange={(e) => {
                  setGithubPat(e.target.value);
                  setPatVerification(null);
                }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 bg-gray-900 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestPat}
                disabled={patTesting || !githubPat.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 border border-gray-700 rounded-xl text-xs sm:text-sm font-medium transition"
              >
                {patTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* PAT Verification result feedback */}
            {patVerification && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  patVerification.valid
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/30 border-red-800/60 text-red-300'
                }`}
              >
                {patVerification.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      Token validated successfully! Connected to GitHub user{' '}
                      <strong>@{patVerification.login}</strong>.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{patVerification.error || 'Invalid GitHub token. Please verify token permissions.'}</span>
                  </>
                )}
              </div>
            )}

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Required permission:{' '}
              <code className="text-gray-400 bg-gray-900 px-1 py-0.5 rounded">public_repo</code>.
              Your token is stored safely in your browser session and transmitted directly over HTTPS to perform your authorized star/fork operations.
            </p>
          </div>
        </div>

        {/* Action Buttons & Feedback */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 rounded-xl transition border border-transparent hover:border-gray-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 animate-fade-in font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Preferences saved!
              </span>
            )}
            {saveError && (
              <span className="text-xs text-red-400 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4" />
                {saveError}
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/20 transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
