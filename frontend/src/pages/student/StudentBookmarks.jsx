import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiBookmarkLine, RiBookmarkFill, RiFilter3Line, RiProgress3Line,
  RiDeleteBin2Line, RiArrowRightLine, RiZzzLine,
} from 'react-icons/ri';
import { useAuthStore } from '../../store/authStore';

const STORAGE_KEY = 'swarnandrian-bookmarks';

function readBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeBookmarks(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function StudentBookmarks() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all', // problem, test, competition
    difficulty: 'all', // easy, medium, hard
    sortBy: 'recent', // recent, name, difficulty
  });

  // Fetch bookmarks
  const { data: bookmarks = [], isLoading } = useQuery(
    ['student-bookmarks', filters],
    () => Promise.resolve(readBookmarks()),
    { staleTime: 60000 }
  );

  // Remove bookmark mutation
  const removeBookmarkMutation = {
    mutate: (bookmarkId) => {
      const next = readBookmarks().filter((bookmark) => bookmark.id !== bookmarkId);
      writeBookmarks(next);
      toast.success('Bookmark removed');
      queryClient.invalidateQueries('student-bookmarks');
    },
  };

  // Filter bookmarks
  const problemBookmarks = bookmarks.filter((b) => b.type === 'problem');
  const testBookmarks = bookmarks.filter((b) => b.type === 'test');
  const competitionBookmarks = bookmarks.filter((b) => b.type === 'competition');

  const displayBookmarks =
    activeTab === 'all'
      ? bookmarks
      : activeTab === 'problems'
      ? problemBookmarks
      : activeTab === 'tests'
      ? testBookmarks
      : competitionBookmarks;

  const stats = {
    total: bookmarks.length,
    problems: problemBookmarks.length,
    tests: testBookmarks.length,
    competitions: competitionBookmarks.length,
  };

  const handleRemoveBookmark = (bookmarkId) => {
    if (window.confirm('Remove from bookmarks?')) {
      removeBookmarkMutation.mutate(bookmarkId);
    }
  };

  const BookmarkCard = ({ bookmark }) => {
    const difficultyColors = {
      easy: 'text-emerald-600 bg-emerald-50',
      medium: 'text-amber-600 bg-amber-50',
      hard: 'text-red-600 bg-red-50',
    };

    const typeColors = {
      problem: 'bg-blue-50 border-blue-200',
      test: 'bg-purple-50 border-purple-200',
      competition: 'bg-pink-50 border-pink-200',
    };

    const typeLabel = {
      problem: '💻 Problem',
      test: '📝 Test',
      competition: '🏆 Competition',
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`rounded-2xl border p-5 hover:shadow-lg transition-all ${typeColors[bookmark.type] || 'bg-white border-gray-100'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-500">
                {typeLabel[bookmark.type] || bookmark.type}
              </span>
              {bookmark.difficulty && (
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${
                    difficultyColors[bookmark.difficulty] || ''
                  }`}
                >
                  {bookmark.difficulty}
                </span>
              )}
            </div>

            <h3 className="font-bold text-gray-900 truncate text-lg">
              {bookmark.name || bookmark.title || 'Untitled'}
            </h3>

            {bookmark.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {bookmark.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              {bookmark.section_name && (
                <span>📂 {bookmark.section_name}</span>
              )}
              {bookmark.bookmarked_at && (
                <span>⭐ {new Date(bookmark.bookmarked_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRemoveBookmark(bookmark.id)}
              className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
              title="Remove bookmark"
            >
              <RiDeleteBin2Line className="w-5 h-5" />
            </motion.button>

            {bookmark.href && (
              <motion.a
                whileHover={{ x: 4 }}
                href={bookmark.href}
                className="px-3 py-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 text-xs font-bold transition-colors inline-flex items-center gap-1"
              >
                Open <RiArrowRightLine className="w-3 h-3" />
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const TabButton = ({ id, label, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        activeTab === id
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label} {count > 0 && <span className="ml-1 text-xs">({count})</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="sticky top-16 z-20 bg-surface/95 backdrop-blur border-b border-theme">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RiBookmarkFill className="w-6 h-6 text-amber-500" /> My Bookmarks
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Quick access to your saved problems, tests & competitions
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, icon: '📌' },
              { label: 'Problems', value: stats.problems, icon: '💻' },
              { label: 'Tests', value: stats.tests, icon: '📝' },
              { label: 'Competitions', value: stats.competitions, icon: '🏆' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500">{stat.icon} {stat.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters & Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <TabButton id="all" label="All" count={stats.total} />
            <TabButton id="problems" label="Problems" count={stats.problems} />
            <TabButton id="tests" label="Tests" count={stats.tests} />
            <TabButton id="competitions" label="Competitions" count={stats.competitions} />

            <div className="ml-auto pl-2 border-l border-gray-200">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <RiFilter3Line className="w-4 h-4" /> Filters
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Difficulty
                </label>
                <select
                  value={filters.difficulty}
                  onChange={(e) =>
                    setFilters({ ...filters, difficulty: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="recent">Recently Bookmarked</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="difficulty">Difficulty</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="problem">Problems</option>
                  <option value="test">Tests</option>
                  <option value="competition">Competitions</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RiProgress3Line className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Loading bookmarks...</p>
            </div>
          </div>
        ) : displayBookmarks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RiZzzLine className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No bookmarks yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Start exploring and save your favorite problems!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {displayBookmarks.map((bookmark) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
