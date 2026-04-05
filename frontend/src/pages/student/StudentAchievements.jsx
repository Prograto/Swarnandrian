import React, { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import {
  RiTrophyLine,
  RiStarLine,
  RiFireLine,
  RiMedalLine,
  RiProgress3Line,
  RiZzzLine,
  RiCloseLine,
  RiRefreshLine,
} from 'react-icons/ri';
import { useAuthStore } from '../../store/authStore';

const BADGE_DEFINITIONS = {
  first_submission: {
    icon: '🎯',
    name: 'First Step',
    description: 'Made your first submission',
    category: 'Coding',
    color: 'bg-blue-100 text-blue-600',
    requirement: 'total_submissions >= 1',
  },
  accepted_10: {
    icon: '✅',
    name: 'Getting Started',
    description: 'Solved 10 coding problems',
    category: 'Coding',
    color: 'bg-emerald-100 text-emerald-600',
    requirement: 'accepted_coding >= 10',
  },
  accepted_50: {
    icon: '⭐',
    name: 'Problem Solver',
    description: 'Solved 50 coding problems',
    category: 'Coding',
    color: 'bg-amber-100 text-amber-600',
    requirement: 'accepted_coding >= 50',
  },
  accepted_100: {
    icon: '👑',
    name: 'Expert Coder',
    description: 'Solved 100 coding problems',
    category: 'Coding',
    color: 'bg-purple-100 text-purple-600',
    requirement: 'accepted_coding >= 100',
  },
  consecutive_7: {
    icon: '🔥',
    name: 'On Fire',
    description: 'Built a 7 day activity streak',
    category: 'Consistency',
    color: 'bg-red-100 text-red-600',
    requirement: 'streak >= 7',
  },
  consecutive_30: {
    icon: '🌟',
    name: 'Unstoppable',
    description: 'Built a 30 day activity streak',
    category: 'Consistency',
    color: 'bg-yellow-100 text-yellow-600',
    requirement: 'streak >= 30',
  },
  easy_master: {
    icon: '🟢',
    name: 'Easy Master',
    description: 'Solved 20 easy problems',
    category: 'Coding',
    color: 'bg-green-100 text-green-600',
    requirement: 'easy_solved >= 20',
  },
  medium_master: {
    icon: '🟡',
    name: 'Medium Master',
    description: 'Solved 15 medium problems',
    category: 'Coding',
    color: 'bg-yellow-100 text-yellow-600',
    requirement: 'medium_solved >= 15',
  },
  hard_master: {
    icon: '🔴',
    name: 'Hard Master',
    description: 'Solved 10 hard problems',
    category: 'Coding',
    color: 'bg-red-100 text-red-600',
    requirement: 'hard_solved >= 10',
  },
  dsa_specialist: {
    icon: '🧩',
    name: 'DSA Specialist',
    description: 'Solved 30 coding problems',
    category: 'Coding',
    color: 'bg-indigo-100 text-indigo-600',
    requirement: 'dsa_solved >= 30',
  },
  speed_demon: {
    icon: '⚡',
    name: 'Speed Demon',
    description: 'Solved a problem in under 5 minutes',
    category: 'Performance',
    color: 'bg-cyan-100 text-cyan-600',
    requirement: 'speed_solves >= 1',
  },
  perfection: {
    icon: '💯',
    name: 'Perfection',
    description: 'Maintained an 80%+ first attempt acceptance rate',
    category: 'Performance',
    color: 'bg-pink-100 text-pink-600',
    requirement: 'first_attempt_rate >= 80',
  },
  leaderboard_top10: {
    icon: '🏆',
    name: 'Top 10 Ranker',
    description: 'Reached the top 10 on the leaderboard',
    category: 'Competition',
    color: 'bg-orange-100 text-orange-600',
    requirement: 'leaderboard_rank <= 10',
  },
  test_ace: {
    icon: '📚',
    name: 'Test Ace',
    description: 'Scored 95%+ in a test',
    category: 'Performance',
    color: 'bg-violet-100 text-violet-600',
    requirement: 'best_test_percent >= 95',
  },
  competition_winner: {
    icon: '🥇',
    name: 'Champion',
    description: 'Won a competition',
    category: 'Competition',
    color: 'bg-yellow-100 text-yellow-600',
    requirement: 'competition_wins >= 1',
  },
  night_owl: {
    icon: '🌙',
    name: 'Night Owl',
    description: 'Submitted 5 solutions between midnight and 6 AM',
    category: 'Consistency',
    color: 'bg-slate-200 text-slate-700',
    requirement: 'night_submissions >= 5',
  },
  early_bird: {
    icon: '🌅',
    name: 'Early Bird',
    description: 'Submitted 5 solutions before sunrise',
    category: 'Consistency',
    color: 'bg-orange-100 text-orange-600',
    requirement: 'morning_submissions >= 5',
  },
};

const CATEGORY_STYLES = {
  Coding: 'border-blue-200 bg-blue-50/70',
  Consistency: 'border-emerald-200 bg-emerald-50/70',
  Performance: 'border-amber-200 bg-amber-50/70',
  Competition: 'border-violet-200 bg-violet-50/70',
};

const CATEGORY_LIST = ['All', 'Coding', 'Consistency', 'Performance', 'Competition'];

function ProgressRing({ value = 0, size = 44 }) {
  const normalized = Math.max(0, Math.min(100, value));
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="-rotate-90">
      <circle cx="18" cy="18" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-lighter" />
      <motion.circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: offset }}
        className="text-[#4F7CF3]"
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, helper, accentClass = 'bg-surface-card' }) {
  return (
    <div className={`rounded-3xl border border-theme p-4 shadow-soft ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{label}</p>
          <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
          {helper ? <p className="mt-1 text-xs text-secondary">{helper}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-[#4F7CF3] shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function BadgeCard({ badge, onSelect }) {
  const progress = Math.round((badge.progress || 0) * 100);
  const tone = CATEGORY_STYLES[badge.category] || 'border-theme bg-surface-card';

  return (
    <motion.button
      type="button"
      layoutId={`badge-${badge.id}`}
      onClick={() => onSelect(badge)}
      className={`group relative w-full overflow-hidden rounded-3xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${badge.isEarned ? tone : 'border-theme bg-surface-card'}`}
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(79,124,243,0.12),transparent_40%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-4xl shadow-sm">
          {badge.icon}
        </div>
        <span className={`badge text-[11px] ${badge.isEarned ? 'badge-mint' : 'bg-surface-lighter text-secondary'}`}>
          {badge.isEarned ? 'Earned' : 'In progress'}
        </span>
      </div>

      <div className="relative mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-primary">{badge.name}</h3>
            <p className="mt-1 text-xs text-secondary leading-relaxed">{badge.description}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${badge.isEarned ? 'bg-white/80 text-primary' : 'bg-surface-lighter text-secondary'}`}>
            {badge.category}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-secondary">
          <span>{badge.isEarned ? 'Completed' : badge.requirement}</span>
          <span className="font-semibold text-primary">{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
          <div
            className={`h-full rounded-full ${badge.isEarned ? 'bg-gradient-to-r from-[#4F7CF3] to-[#7C8CFF]' : 'bg-[#4F7CF3]/60'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {badge.earnedAt ? (
          <p className="mt-3 text-[11px] text-secondary">
            Earned {new Date(badge.earnedAt).toLocaleDateString()}
          </p>
        ) : null}
      </div>
    </motion.button>
  );
}

export default function AchievementBadges() {
  const { user } = useAuthStore();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: achievements = {}, isLoading, isError, refetch } = useQuery(
    'student-achievements',
    () => api.get('/profile/me/achievements').then((response) => response.data || {}),
    { staleTime: 120000 }
  );

  const {
    earned_badges = [],
    badge_progress = {},
    total_badges = Object.keys(BADGE_DEFINITIONS).length,
    summary = {},
    recent_badges = [],
  } = achievements;

  const earnedBadgeIds = useMemo(
    () => new Set(earned_badges.map((badge) => badge.badge_id)),
    [earned_badges]
  );

  const allBadges = useMemo(
    () => Object.entries(BADGE_DEFINITIONS).map(([id, badge]) => ({
      id,
      ...badge,
      isEarned: earnedBadgeIds.has(id),
      earnedAt: earned_badges.find((badgeItem) => badgeItem.badge_id === id)?.earned_at || null,
      progress: badge_progress[id] || 0,
    })),
    [badge_progress, earnedBadgeIds, earned_badges]
  );

  const earnedCount = allBadges.filter((badge) => badge.isEarned).length;
  const completionPercent = total_badges > 0 ? Math.round((earnedCount / total_badges) * 100) : 0;
  const visibleBadges = allBadges.filter((badge) => {
    if (showEarnedOnly && !badge.isEarned) return false;
    if (activeCategory !== 'All' && badge.category !== activeCategory) return false;
    return true;
  });
  const recentEarned = recent_badges.length > 0 ? recent_badges : earned_badges.slice(0, 4);
  const nextBadge = allBadges
    .filter((badge) => !badge.isEarned)
    .sort((left, right) => right.progress - left.progress)[0];

  if (isError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-theme bg-surface-card p-8 text-center shadow-soft">
          <RiZzzLine className="mx-auto mb-4 h-14 w-14 text-muted" />
          <h1 className="text-2xl font-bold text-primary">Achievements unavailable</h1>
          <p className="mt-2 text-sm text-secondary">
            The achievements endpoint could not be loaded. Try again after the backend refreshes.
          </p>
          <button onClick={() => refetch()} className="btn-primary mt-6 inline-flex items-center gap-2">
            <RiRefreshLine className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-theme bg-surface-card p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,124,243,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(246,184,198,0.18),transparent_30%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4F7CF3]/20 bg-[#4F7CF3]/10 px-3 py-1 text-xs font-semibold text-[#4F7CF3]">
                <RiMedalLine className="h-4 w-4" /> Badge Vault
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-primary">Achievements & Badges</h1>
              <p className="mt-3 text-sm leading-relaxed text-secondary max-w-2xl">
                {user?.name ? `${user.name}, ` : ''}unlock badges by solving problems, building streaks, and climbing the leaderboard.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-theme bg-surface-card px-4 py-3 shadow-soft">
                  <ProgressRing value={completionPercent} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Overall progress</p>
                    <p className="text-sm font-bold text-primary">{earnedCount}/{total_badges} badges earned</p>
                  </div>
                </div>
                {nextBadge ? (
                  <div className="rounded-2xl border border-theme bg-surface-card px-4 py-3 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Next target</p>
                    <p className="text-sm font-bold text-primary">{nextBadge.name}</p>
                    <p className="text-xs text-secondary">{Math.round(nextBadge.progress * 100)}% complete</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[520px] xl:grid-cols-3">
              <StatCard icon={RiMedalLine} label="Badges earned" value={earnedCount} helper="Live badge count" accentClass="bg-emerald-50/80" />
              <StatCard icon={RiProgress3Line} label="Completion" value={`${completionPercent}%`} helper="Across all tracked badges" accentClass="bg-blue-50/80" />
              <StatCard icon={RiFireLine} label="Current streak" value={`${summary.current_streak || 0} days`} helper="Submission streak" accentClass="bg-orange-50/80" />
              <StatCard icon={RiTrophyLine} label="Leaderboard" value={summary.leaderboard_rank ? `#${summary.leaderboard_rank}` : '—'} helper="Overall rank" accentClass="bg-violet-50/80" />
              <StatCard icon={RiStarLine} label="Best test" value={summary.best_test_percent ? `${Math.round(summary.best_test_percent)}%` : '—'} helper="Best test score" accentClass="bg-amber-50/80" />
              <StatCard icon={RiMedalLine} label="Wins" value={summary.competition_wins || 0} helper="Competition victories" accentClass="bg-pink-50/80" />
            </div>
          </div>
        </motion.section>

        {recentEarned.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-theme bg-surface-card p-5 shadow-soft"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-primary">Recently earned</h2>
                <p className="text-xs text-secondary">Your latest wins appear here first.</p>
              </div>
              <span className="badge badge-primary">{recentEarned.length}</span>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {recentEarned.map((badgeItem) => {
                const badgeMeta = BADGE_DEFINITIONS[badgeItem.badge_id] || {};
                return (
                  <button
                    key={badgeItem.badge_id}
                    type="button"
                    onClick={() => setSelectedBadge({
                      id: badgeItem.badge_id,
                      ...badgeMeta,
                      isEarned: true,
                      earnedAt: badgeItem.earned_at,
                      progress: 1,
                    })}
                    className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-theme bg-surface px-4 py-3 text-left transition-all hover:border-[#4F7CF3]/30 hover:shadow-soft"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl">
                      {badgeMeta.icon || '🏅'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-primary">{badgeMeta.name || badgeItem.badge_id}</p>
                      <p className="text-xs text-secondary">
                        Earned {badgeItem.earned_at ? new Date(badgeItem.earned_at).toLocaleDateString() : 'recently'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}

        <section className="rounded-3xl border border-theme bg-surface-card p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-primary">Badge gallery</h2>
              <p className="text-xs text-secondary">Tap any badge to inspect the requirement and your progress.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEarnedOnly((prev) => !prev)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${showEarnedOnly ? 'border-transparent bg-[#4F7CF3] text-white' : 'border-theme bg-surface text-secondary hover:text-primary'}`}
              >
                {showEarnedOnly ? 'Showing earned' : 'Show earned only'}
              </button>
              {CATEGORY_LIST.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${activeCategory === category ? 'border-transparent bg-surface-lighter text-primary shadow-sm' : 'border-theme bg-surface text-secondary hover:text-primary'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RiProgress3Line className="mx-auto mb-3 h-8 w-8 animate-spin text-[#4F7CF3]" />
                <p className="text-sm text-secondary">Loading achievements...</p>
              </div>
            </div>
          ) : visibleBadges.length > 0 ? (
            <motion.div layout className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <AnimatePresence>
                {visibleBadges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <BadgeCard badge={badge} onSelect={setSelectedBadge} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="py-20 text-center">
              <RiZzzLine className="mx-auto mb-4 h-14 w-14 text-muted" />
              <p className="text-xl font-semibold text-primary">No badges to display</p>
              <p className="mt-2 text-sm text-secondary">Try a different filter or earn more badges to populate the gallery.</p>
            </div>
          )}
        </section>

        <AnimatePresence>
          {selectedBadge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              data-lenis-prevent
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
              onClick={() => setSelectedBadge(null)}
            >
              <motion.div
                layoutId={`badge-${selectedBadge.id}`}
                onClick={(event) => event.stopPropagation()}
                className={`relative w-full max-w-lg overflow-hidden rounded-3xl border bg-surface-card shadow-2xl ${CATEGORY_STYLES[selectedBadge.category] || 'border-theme'}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedBadge(null)}
                  className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-secondary shadow-sm transition-colors hover:text-primary"
                >
                  <RiCloseLine className="h-4 w-4" />
                </button>

                <div className="p-8 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-5xl shadow-soft">
                    {selectedBadge.icon}
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-theme bg-surface px-3 py-1 text-xs font-semibold text-secondary">
                    {selectedBadge.category}
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-primary">{selectedBadge.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">{selectedBadge.description}</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-theme bg-surface p-4 text-left">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Status</p>
                      <p className="mt-1 font-semibold text-primary">{selectedBadge.isEarned ? 'Badge earned' : 'In progress'}</p>
                    </div>
                    <div className="rounded-2xl border border-theme bg-surface p-4 text-left">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Progress</p>
                      <p className="mt-1 font-semibold text-primary">{Math.round((selectedBadge.progress || 0) * 100)}%</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-theme bg-surface p-4 text-left">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-secondary">Requirement</span>
                      <span className="font-semibold text-primary">{selectedBadge.requirement}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-lighter">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#4F7CF3] to-[#7C8CFF]"
                        style={{ width: `${Math.round((selectedBadge.progress || 0) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {selectedBadge.earnedAt ? (
                    <p className="mt-5 text-xs text-secondary">
                      Earned on {new Date(selectedBadge.earnedAt).toLocaleString()}
                    </p>
                  ) : null}

                  <button onClick={() => setSelectedBadge(null)} className="btn-primary mt-6 inline-flex items-center gap-2">
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
