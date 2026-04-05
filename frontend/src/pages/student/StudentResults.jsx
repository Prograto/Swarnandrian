import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import {
  RiFilter3Line, RiDownload2Line, RiProgress3Line,
  RiCheckFill, RiCloseFill, RiClockFill, RiZzzLine,
} from 'react-icons/ri';
import { useAuthStore } from '../../store/authStore';

const SUBMISSION_STATUS_CONFIG = {
  accepted: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: '✓ Accepted' },
  wrong_answer: { color: 'text-red-600', bg: 'bg-red-50', label: '✗ Wrong Answer' },
  time_limit_exceeded: { color: 'text-orange-600', bg: 'bg-orange-50', label: '⏱ TLE' },
  compilation_error: { color: 'text-red-700', bg: 'bg-red-100', label: '⚠ Compilation Error' },
  runtime_error: { color: 'text-red-600', bg: 'bg-red-50', label: '⚠ Runtime Error' },
  pending: { color: 'text-blue-600', bg: 'bg-blue-50', label: '⏳ Pending' },
  in_progress: { color: 'text-blue-500', bg: 'bg-blue-50', label: '▶ In Progress' },
};

export default function StudentResults() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all', // coding, aptitude, technical, competition
    status: 'all',
    dateRange: 'all', // all, week, month
    minScore: null,
    maxScore: null,
  });

  // Fetch all submissions
  const { data: codingSubmissions = [], isLoading: codingLoading } = useQuery(
    'student-coding-submissions',
    () => api.get('/submissions/code/history?limit=200').then(r => r.data?.submissions || []),
    { staleTime: 60000 }
  );

  const { data: testSubmissions = [], isLoading: testLoading } = useQuery(
    'student-test-submissions',
    () => api.get('/submissions/aptitude/history?limit=200').then(r => r.data?.submissions || []),
    { staleTime: 60000 }
  );

  const { data: competitionSubmissions = [], isLoading: compLoading } = useQuery(
    'student-competition-submissions',
    () => api.get('/submissions/competitions/history?limit=200').then(r => r.data?.submissions || []),
    { staleTime: 60000 }
  );

  // Filter submissions
  const filterSubmissions = (submissions, type) => {
    let filtered = submissions;

    if (filters.type !== 'all' && filters.type !== type) return [];
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();

      switch (filters.dateRange) {
        case 'week':
          filtered = filtered.filter(s => {
            const submittedAt = new Date(s.submitted_at);
            const daysAgo = (now - submittedAt) / (1000 * 60 * 60 * 24);
            return daysAgo <= 7;
          });
          break;
        case 'month':
          filtered = filtered.filter(s => {
            const submittedAt = new Date(s.submitted_at);
            const daysAgo = (now - submittedAt) / (1000 * 60 * 60 * 24);
            return daysAgo <= 30;
          });
          break;
        default:
          break;
      }
    }

    if (filters.minScore !== null && filters.minScore !== '') {
      filtered = filtered.filter(s => (s.marks || s.score || 0) >= filters.minScore);
    }
    if (filters.maxScore !== null && filters.maxScore !== '') {
      filtered = filtered.filter(s => (s.marks || s.score || 0) <= filters.maxScore);
    }

    return filtered.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  };

  const allCoding = filterSubmissions(codingSubmissions, 'coding');
  const allTests = filterSubmissions(testSubmissions, 'test');
  const allCompetitions = filterSubmissions(competitionSubmissions, 'competition');

  const allSubmissions = [...allCoding, ...allTests, ...allCompetitions];
  const displaySubmissions = activeTab === 'all' ? allSubmissions : 
    activeTab === 'coding' ? allCoding :
    activeTab === 'aptitude' ? allTests.filter(t => t.section_type === 'aptitude') :
    activeTab === 'technical' ? allTests.filter(t => t.section_type === 'technical') :
    allCompetitions;

  const sectionBreakdown = useMemo(() => {
    const groups = new Map();

    [...codingSubmissions, ...testSubmissions, ...competitionSubmissions].forEach((submission) => {
      const label = submission.section_name || submission.test_name || submission.problem_name || submission.name || submission.section_type || 'Unknown';
      const type = submission.section_type || (submission.problem_id ? 'coding' : 'test');
      const entityId = submission.problem_id
        ? `problem:${submission.problem_id}`
        : submission.competition_id && submission.test_id
          ? `competition:${submission.competition_id}:${submission.test_id}`
          : submission.test_id
            ? `test:${submission.test_id}`
            : label;
      const key = `${type}:${entityId}`;
      const current = groups.get(key) || { label, type, attempts: 0, bestScore: 0, latest: null };
      const score = Number(submission.score || submission.marks || 0);
      current.attempts += 1;
      current.bestScore = Math.max(current.bestScore, score);
      if (!current.latest || new Date(submission.submitted_at) > new Date(current.latest)) {
        current.latest = submission.submitted_at;
      }
      groups.set(key, current);
    });

    return Array.from(groups.values())
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 6);
  }, [codingSubmissions, testSubmissions, competitionSubmissions]);

  const scoreSummary = useMemo(() => {
    const practiceBest = new Map();
    const competitorBest = new Map();
    const codingBest = new Map();
    const aptitudeBest = new Map();
    const technicalBest = new Map();

    const addBest = (map, key, score) => {
      const nextScore = Math.max(0, Number(score || 0));
      const currentScore = map.get(key) || 0;
      if (nextScore > currentScore) {
        map.set(key, nextScore);
      }
    };

    const getItemKey = (submission) => {
      if (submission.problem_id) return `problem:${submission.problem_id}`;
      if (submission.competition_id && submission.test_id) return `competition:${submission.competition_id}:${submission.test_id}`;
      if (submission.test_id) return `test:${submission.test_id}`;
      return `submission:${submission.id || submission.submitted_at || submission.name || submission.problem_name || submission.test_name || 'unknown'}`;
    };

    const allHistory = [...codingSubmissions, ...testSubmissions, ...competitionSubmissions];
    allHistory.forEach((submission) => {
      const score = Number(submission.score || submission.marks || 0);
      const examType = submission.exam_type || 'practice';
      const sectionType = submission.section_type || (submission.problem_id ? 'coding' : 'test');
      const itemKey = getItemKey(submission);

      if (examType === 'practice') {
        addBest(practiceBest, itemKey, score);
      }
      if (examType === 'competitor') {
        addBest(competitorBest, itemKey, score);
      }

      if (sectionType === 'coding') {
        addBest(codingBest, itemKey, score);
      } else if (sectionType === 'aptitude') {
        addBest(aptitudeBest, itemKey, score);
      } else if (sectionType === 'technical') {
        addBest(technicalBest, itemKey, score);
      }
    });

    const sumMap = (map) => Array.from(map.values()).reduce((total, value) => total + value, 0);

    return {
      practice: sumMap(practiceBest),
      competitor: sumMap(competitorBest),
      coding: sumMap(codingBest),
      aptitude: sumMap(aptitudeBest),
      technical: sumMap(technicalBest),
    };
  }, [codingSubmissions, testSubmissions, competitionSubmissions]);

  const stats = {
    total: allSubmissions.length,
    coding: allCoding.length,
    aptitude: allTests.filter(t => t.section_type === 'aptitude').length,
    technical: allTests.filter(t => t.section_type === 'technical').length,
    competitions: allCompetitions.length,
  };

  const isLoading = codingLoading || testLoading || compLoading;

  const handleExport = () => {
    const headers = ['Type', 'Title', 'Score', 'Status', 'Submitted At', 'Language/Duration'];
    const rows = displaySubmissions.map(s => [
      s.problem_id ? 'Coding' : s.section_type === 'competition' ? 'Competition' : s.section_type || 'Test',
      s.name || s.problem_name || s.test_name || 'Untitled',
      s.marks || s.score || '-',
      s.status || 'Unknown',
      new Date(s.submitted_at).toLocaleString(),
      s.language || `${s.time_limit_minutes || 0}m`,
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const SubmissionCard = ({ submission, type }) => {
    const statusConfig = SUBMISSION_STATUS_CONFIG[submission.status] || SUBMISSION_STATUS_CONFIG['pending'];
    const score = submission.marks || submission.score || 0;
    const maxScore = submission.max_marks || submission.total_marks || 100;
    const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all ${statusConfig.bg}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">
              {submission.name || submission.problem_name || submission.test_name || 'Untitled'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {type === 'coding' ? (
                <>
                  <span className="inline-block mr-3">
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      {submission.language || 'Unknown'}
                    </span>
                  </span>
                  <span className="text-xs">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block mr-3">
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                      {submission.section_type === 'competition' ? 'Competition' : (submission.section_type || 'Test').toUpperCase()}
                    </span>
                  </span>
                  <span className="text-xs">
                    {submission.time_limit_minutes && `${submission.time_limit_minutes}m `}
                    {new Date(submission.submitted_at).toLocaleString()}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusConfig.color} ${statusConfig.bg}`}>
              {statusConfig.label}
            </span>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-800">
                {score}/{maxScore || '—'}
              </p>
              {maxScore > 0 && (
                <p className="text-xs text-gray-500">
                  {percentage}% accuracy
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Additional info */}
        {submission.compilation_error && (
          <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700 max-h-16 overflow-y-auto">
            <p className="font-bold mb-1">Compilation Error:</p>
            <code className="text-xs break-words">{submission.compilation_error}</code>
          </div>
        )}
        {submission.runtime_error && (
          <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-700 max-h-16 overflow-y-auto">
            <p className="font-bold mb-1">Runtime Error:</p>
            <code className="text-xs break-words">{submission.runtime_error}</code>
          </div>
        )}
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
              <p className="text-sm text-gray-500 mt-1">View your submission history and performance</p>
            </div>
            <button
              onClick={handleExport}
              disabled={displaySubmissions.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <RiDownload2Line className="w-4 h-4" /> Export
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, icon: '📊' },
              { label: 'Coding', value: stats.coding, icon: '💻' },
              { label: 'Aptitude', value: stats.aptitude, icon: '🧠' },
              { label: 'Technical', value: stats.technical, icon: '⚙️' },
              { label: 'Competitions', value: stats.competitions, icon: '🏆' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500">{stat.icon} {stat.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-2xl border border-theme bg-surface-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-secondary">Score summary</p>
                <p className="text-sm text-secondary mt-1">Best score per problem or test, split by mode and section</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Practice Mode', value: scoreSummary.practice, helper: 'Best valid score in practice mode' },
                { label: 'Competitor Mode', value: scoreSummary.competitor, helper: 'Best valid score in competitor mode' },
                { label: 'Coding', value: scoreSummary.coding, helper: 'Best coding score across attempts' },
                { label: 'Aptitude', value: scoreSummary.aptitude, helper: 'Best aptitude score across attempts' },
                { label: 'Technical', value: scoreSummary.technical, helper: 'Best technical score across attempts' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-theme bg-surface p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-secondary">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-primary">{item.value}</p>
                  <p className="mt-1 text-xs text-secondary">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section breakdown */}
          <div className="mb-6 rounded-2xl border border-theme bg-surface-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-secondary">Section breakdown</p>
                <p className="text-sm text-secondary mt-1">Quick snapshot of your best scoring areas</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sectionBreakdown.length === 0 ? (
                <div className="rounded-xl border border-dashed border-theme p-4 text-sm text-secondary md:col-span-2 lg:col-span-3 xl:col-span-4">
                  No section data yet.
                </div>
              ) : sectionBreakdown.map((item) => (
                <div key={`${item.type}-${item.label}`} className="rounded-xl border border-theme bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-secondary">{item.type}</p>
                      <p className="mt-1 font-semibold text-primary line-clamp-1">{item.label}</p>
                    </div>
                    <span className="badge bg-surface-lighter text-secondary">{item.attempts} attempts</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-secondary">Best score</span>
                    <span className="font-bold text-amber-600">{item.bestScore}</span>
                  </div>
                  {item.latest && <p className="mt-1 text-xs text-secondary">Latest: {new Date(item.latest).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <TabButton id="all" label="All" count={stats.total} />
            <TabButton id="coding" label="Coding" count={stats.coding} />
            <TabButton id="aptitude" label="Aptitude" count={stats.aptitude} />
            <TabButton id="technical" label="Technical" count={stats.technical} />
            <TabButton id="competition" label="Competitions" count={stats.competitions} />
            
            <div className="ml-auto pl-2 border-l border-gray-200">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <RiFilter3Line className="w-4 h-4" /> Filters
              </button>
            </div>
          </div>

          {/* Filters */}
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="accepted">Accepted</option>
                  <option value="wrong_answer">Wrong Answer</option>
                  <option value="compilation_error">Compilation Error</option>
                  <option value="time_limit_exceeded">TLE</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Min Score</label>
                <input
                  type="number"
                  value={filters.minScore || ''}
                  onChange={(e) => setFilters({ ...filters, minScore: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Max Score</label>
                <input
                  type="number"
                  value={filters.maxScore || ''}
                  onChange={(e) => setFilters({ ...filters, maxScore: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="100"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RiProgress3Line className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Loading submissions...</p>
            </div>
          </div>
        ) : displaySubmissions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RiZzzLine className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">{allSubmissions.length === 0 ? 'No submissions yet' : 'No submissions match the selected filters'}</p>
              <p className="text-sm text-gray-400 mt-1">{allSubmissions.length === 0 ? 'Your submissions will appear here' : 'Try clearing one or more filters'}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displaySubmissions.map((submission, i) => (
              <SubmissionCard
                key={`${submission.id || i}`}
                submission={submission}
                type={submission.section_type === 'competition' ? 'competition' : (submission.problem_id ? 'coding' : 'test')}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
