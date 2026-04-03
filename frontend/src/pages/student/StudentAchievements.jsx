import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import {
  RiTrophyLine, RIStarLine, RiFireLine, RiThumbsUpLine,
  RiProgress3Line, RiZzzLine,
} from 'react-icons/ri';
import { useAuthStore } from '../../store/authStore';

const BADGE_DEFINITIONS = {
  first_submission: {
    icon: '🎯',
    name: 'First Step',
    description: 'Made your first code submission',
    color: 'bg-blue-100 text-blue-600',
    requirement: 'total_submissions >= 1',
  },
  accepted_10: {
    icon: '✅',
    name: 'Getting Started',
    description: 'Solved 10 problems',
    color: 'bg-emerald-100 text-emerald-600',
    requirement: 'accepted_submissions >= 10',
  },
  accepted_50: {
    icon: '⭐',
    name: 'Problem Solver',
    description: 'Solved 50 problems',
    color: 'bg-amber-100 text-amber-600',
    requirement: 'accepted_submissions >= 50',
  },
  accepted_100: {
    icon: '👑',
    name: 'Expert Coder',
    description: 'Solved 100 problems',
    color: 'bg-purple-100 text-purple-600',
    requirement: 'accepted_submissions >= 100',
  },
  consecutive_7: {
    icon: '🔥',
    name: 'On Fire',
    description: '7 day consecutive streak',
    color: 'bg-red-100 text-red-600',
    requirement: 'streak >= 7',
  },
  consecutive_30: {
    icon: '🌟',
    name: 'Unstoppable',
    description: '30 day consecutive streak',
    color: 'bg-yellow-100 text-yellow-600',
    requirement: 'streak >= 30',
  },
  easy_master: {
    icon: '🟢',
    name: 'Easy Master',
    description: 'Solved 20 easy problems',
    color: 'bg-green-100 text-green-600',
    requirement: 'easy_problems >= 20',
  },
  medium_master: {
    icon: '🟡',
    name: 'Medium Master',
    description: 'Solved 15 medium problems',
    color: 'bg-yellow-100 text-yellow-600',
    requirement: 'medium_problems >= 15',
  },
  hard_master: {
    icon: '🔴',
    name: 'Hard Master',
    description: 'Solved 10 hard problems',
    color: 'bg-red-100 text-red-600',
    requirement: 'hard_problems >= 10',
  },
  dsa_specialist: {
    icon: '🧩',
    name: 'DSA Specialist',
    description: 'Solved 30 DSA problems',
    color: 'bg-indigo-100 text-indigo-600',
    requirement: 'dsa_problems >= 30',
  },
  speed_demon: {
    icon: '⚡',
    name: 'Speed Demon',
    description: 'Solved problem in under 5 minutes',
    color: 'bg-cyan-100 text-cyan-600',
    requirement: 'fast_solve_time',
  },
  perfection: {
    icon: '💯',
    name: 'Perfection',
    description: 'First attempt acceptance rate > 80%',
    color: 'bg-pink-100 text-pink-600',
    requirement: 'first_attempt_rate >= 80',
  },
  leaderboard_top10: {
    icon: '🏆',
    name: 'Top 10 Ranker',
    description: 'Reached top 10 in leaderboard',
    color: 'bg-orange-100 text-orange-600',
    requirement: 'leaderboard_rank <= 10',
  },
  test_ace: {
    icon: '📚',
    name: 'Test Ace',
    description: 'Scored 95%+ in a test',
    color: 'bg-violet-100 text-violet-600',
    requirement: 'test_score >= 95',
  },
  competition_winner: {
    icon: '🥇',
    name: 'Champion',
    description: 'Won a competition',
    color: 'bg-yellow-100 text-yellow-600',
    requirement: 'competition_wins >= 1',
  },
  night_owl: {
    icon: '🌙',
    name: 'Night Owl',
    description: 'Submitted 5 solutions between 12 AM - 6 AM',
    color: 'bg-slate-200 text-slate-700',
    requirement: 'night_submissions >= 5',
  },
  early_bird: {
    icon: '🌅',
    name: 'Early Bird',
    description: 'Made 5 submissions before 6 AM',
    color: 'bg-orange-100 text-orange-600',
    requirement: 'morning_submissions >= 5',
  },
};

export default function AchievementBadges() {
  const { user } = useAuthStore();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [filterEarned, setFilterEarned] = useState(false);

  // Fetch achievements
  const { data: achievements = {}, isLoading } = useQuery(
    'student-achievements',
    () => api.get('/profile/me/achievements').then(r => r.data || {}),
    { staleTime: 120000 }
  );

  const { earned_badges = [], badge_progress = {}, total_earned = 0 } = achievements;

  // Determine earned badges
  const earnedBadgeIds = new Set(earned_badges.map(b => b.badge_id));
  const allBadges = Object.entries(BADGE_DEFINITIONS).map(([id, badge]) => ({
    id,
    ...badge,
    isEarned: earnedBadgeIds.has(id),
    earnedAt: earned_badges.find(b => b.badge_id === id)?.earned_at,
    progress: badge_progress[id] || 0,
  }));

  const displayBadges = filterEarned ? allBadges.filter(b => b.isEarned) : allBadges;
  const earnedCount = allBadges.filter(b => b.isEarned).length;

  const BadgeCard = ({ badge, isExpanded }) => (
    <motion.div
      layoutId={`badge-${badge.id}`}
      onClick={() => setSelectedBadge(isExpanded ? null : badge)}
      className={`relative rounded-2xl cursor-pointer transition-all ${
        badge.isEarned
          ? `${badge.color} shadow-lg`
          : 'bg-gray-100 text-gray-400 opacity-60'
      } ${isExpanded ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}
    >
      <div className="aspect-square flex flex-col items-center justify-center p-4">
        <motion.span
          animate={{ scale: isExpanded ? 1.2 : 1 }}
          className="text-5xl mb-2"
        >
          {badge.icon}
        </motion.span>
        <p className="text-xs font-bold text-center leading-tight">
          {badge.name}
        </p>

        {badge.isEarned && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
          >
            ✓
          </motion.div>
        )}

        {!badge.isEarned && badge.progress > 0 && (
          <div className="absolute bottom-2 left-2 right-2 w-10 h-10 flex items-center justify-center">
            <div className="relative w-full h-full">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="40%"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-300"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="40%"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${Math.PI * 0.8 * badge.progress} ${Math.PI * 0.8}`}
                  className="text-blue-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-600">
                {Math.round(badge.progress * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <RiTrophyLine className="w-8 h-8 text-amber-500" /> Achievements & Badges
          </h1>
          <p className="text-gray-600">
            Earn badges by reaching milestones and completing challenges!
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Badges Earned', value: earnedCount, icon: '🏅', color: 'bg-emerald-50' },
            { label: 'Total Badges', value: Object.keys(BADGE_DEFINITIONS).length, icon: '⭐', color: 'bg-blue-50' },
            { label: 'Completion', value: `${Math.round((earnedCount / Object.keys(BADGE_DEFINITIONS).length) * 100)}%`, icon: '📊', color: 'bg-purple-50' },
            { label: 'Next Milestone', value: earnedCount < Object.keys(BADGE_DEFINITIONS).length ? 'In Progress' : '🎉 All Done!', icon: '🎯', color: 'bg-amber-50' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${stat.color} rounded-2xl p-4 border border-gray-100`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {stat.icon} {stat.label}
              </p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filter Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setFilterEarned(!filterEarned)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterEarned
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterEarned ? '✓ Showing Earned' : 'Show All Badges'}
          </button>
        </div>

        {/* Badges Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RiProgress3Line className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Loading achievements...</p>
            </div>
          </div>
        ) : (
          <>
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8"
            >
              <AnimatePresence>
                {displayBadges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <BadgeCard
                      badge={badge}
                      isExpanded={selectedBadge?.id === badge.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Selected Badge Details */}
            {selectedBadge && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                onClick={() => setSelectedBadge(null)}
              >
                <motion.div
                  layoutId={`badge-${selectedBadge.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`${selectedBadge.color} rounded-3xl p-8 max-w-md w-full shadow-2xl`}
                >
                  <div className="text-center">
                    <span className="text-7xl mb-4 block">{selectedBadge.icon}</span>
                    <h2 className="text-3xl font-bold mb-2">{selectedBadge.name}</h2>
                    <p className="text-lg mb-6 opacity-90">
                      {selectedBadge.description}
                    </p>

                    {selectedBadge.isEarned ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mb-6"
                      >
                        <p className="text-sm font-semibold mb-2">✓ Badge Earned!</p>
                        <p className="text-xs opacity-75">
                          {new Date(selectedBadge.earnedAt).toLocaleDateString()}
                        </p>
                      </motion.div>
                    ) : (
                      <div className="mb-6">
                        <p className="text-sm font-semibold mb-3">Progress</p>
                        <div className="w-full bg-white/30 rounded-full h-2 mb-2">
                          <div
                            style={{ width: `${selectedBadge.progress * 100}%` }}
                            className="bg-white h-2 rounded-full"
                          />
                        </div>
                        <p className="text-xs opacity-75">
                          {Math.round(selectedBadge.progress * 100)}% Complete
                        </p>
                      </div>
                    )}

                    <p className="text-xs opacity-75 mb-6">
                      {selectedBadge.requirement}
                    </p>

                    <button
                      onClick={() => setSelectedBadge(null)}
                      className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-bold transition-all"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && displayBadges.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <RiZzzLine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No badges to display</p>
            <p className="text-gray-500 mt-2">
              Start earning badges by solving problems!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
