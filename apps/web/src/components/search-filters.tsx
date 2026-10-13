'use client';

import React from 'react';
import { Search, X, ArrowUpDown, Filter } from 'lucide-react';

interface SearchFiltersProps {
  searchQuery: string;
  selectedLanguage: string;
  sortBy: 'popular' | 'newest' | 'updated';
  onSearchChange: (q: string) => void;
  onLanguageChange: (lang: string) => void;
  onSortChange: (sort: 'popular' | 'newest' | 'updated') => void;
  onReset: () => void;
}

const POPULAR_LANGUAGES = [
  'TypeScript',
  'Python',
  'Rust',
  'Go',
  'JavaScript',
  'Java',
  'C++',
];

export function SearchFilters({
  searchQuery,
  selectedLanguage,
  sortBy,
  onSearchChange,
  onLanguageChange,
  onSortChange,
  onReset,
}: SearchFiltersProps) {
  const hasActiveFilters = searchQuery !== '' || selectedLanguage !== '' || sortBy !== 'popular';

  return (
    <div className="space-y-4 mb-8">
      {/* Search Input and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search repositories by name, description, or keyword..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-[#111827] border border-gray-800 focus:border-blue-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="appearance-none bg-[#111827] border border-gray-800 text-gray-300 text-sm font-medium py-2.5 pl-9 pr-9 rounded-xl focus:outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest Added</option>
              <option value="updated">Recently Updated</option>
            </select>
            <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="px-3 py-2.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700/60 transition whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Language Quick Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-gray-500 flex items-center gap-1 mr-1 text-[11px] font-mono">
          <Filter className="w-3 h-3" />
          Language:
        </span>

        <button
          onClick={() => onLanguageChange('')}
          className={`px-3 py-1 rounded-lg font-medium transition ${
            selectedLanguage === ''
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-800/50 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          All
        </button>

        {POPULAR_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
          return (
            <button
              key={lang}
              onClick={() => onLanguageChange(isSelected ? '' : lang)}
              className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-800/50 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {lang}
            </button>
          );
        })}
      </div>
    </div>
  );
}
