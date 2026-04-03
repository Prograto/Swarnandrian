import React, { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import PaginationControls from '../../components/student/PaginationControls';
import { isBookmarked, toggleBookmark } from '../../utils/bookmarks';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

const PAGE_SIZE = 8;

function domainConfig(domain) {
  if (domain === 'coding') {
    return {
      title: 'Coding Problems',
      endpoint: '/coding/problems',
      mapItems: (rows) => Array.isArray(rows) ? rows : (rows?.problems || rows?.items || []),
      total: (rows) => Array.isArray(rows) ? rows.length : (rows?.total || 0),
      sectionKey: 'section_id',
      extraParams: {},
      type: 'problem',
      nameField: 'name',
      descField: 'statement',
      difficultyField: 'difficulty',
      cardImage: 'banner_url',
      actionLabel: 'Write Problem',
      href: (row) => `/code/${row.id}`,
    };
  }

  const isApt = domain === 'aptitude';
  return {
    title: isApt ? 'Aptitude Tests' : 'Technical Tests',
    endpoint: isApt ? '/aptitude/tests' : '/technical/tests',
    mapItems: (rows) => Array.isArray(rows) ? rows : (rows?.items || []),
    total: (rows) => Array.isArray(rows) ? rows.length : (rows?.total || 0),
    sectionKey: 'section_id',
    extraParams: { paginate: true },
    type: 'test',
    nameField: 'name',
    descField: 'description',
    difficultyField: null,
    cardImage: 'banner_url',
    actionLabel: 'Write Test',
    href: (row) => `/test/${row.id}`,
  };
}

export default function StudentSectionTests() {
  const location = useLocation();
  const { domain: routeDomain, mode, sectionId } = useParams();
  const pathDomain = location.pathname.split('/')[2];
  const domain = routeDomain || pathDomain;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [difficulty, setDifficulty] = useState('');
  const [bookmarkVersion, setBookmarkVersion] = useState(0);

  const config = domainConfig(domain);

  const { data: submissionHistory = [] } = useQuery(
    ['student-section-history', domain, sectionId],
    () => {
      const endpoint = domain === 'coding' ? '/submissions/code/history' : '/submissions/aptitude/history';
      return api.get(endpoint, { params: { limit: 500 } }).then((res) => res.data?.submissions || []);
    },
    { staleTime: 60000, enabled: !!sectionId && !!domain }
  );

  const attemptMap = useMemo(() => {
    const grouped = new Map();
    submissionHistory.forEach((submission) => {
      const key = domain === 'coding' ? submission.problem_id : submission.test_id;
      if (!key) return;
      const current = grouped.get(key) || { attempts: 0, bestScore: 0, latestScore: 0, latestAt: null };
      const score = Number(submission.score || submission.marks || 0);
      current.attempts += 1;
      current.bestScore = Math.max(current.bestScore, score);
      current.latestScore = score;
      if (!current.latestAt || new Date(submission.submitted_at) > new Date(current.latestAt)) {
        current.latestAt = submission.submitted_at;
      }
      grouped.set(key, current);
    });
    return grouped;
  }, [submissionHistory, domain]);

  const { data, isLoading } = useQuery(
    ['student-section-items', domain, mode, sectionId, search, page, difficulty],
    () => {
      const params = {
        [config.sectionKey]: sectionId,
        mode,
        search,
        page,
        limit: PAGE_SIZE,
        ...config.extraParams,
      };
      if (difficulty && domain === 'coding') params.difficulty = difficulty;
      return api.get(config.endpoint, { params }).then((res) => res.data);
    },
    { keepPreviousData: true, enabled: !!sectionId && !!domain }
  );

  const items = useMemo(() => config.mapItems(data), [config, data, bookmarkVersion]);
  const total = useMemo(() => config.total(data), [config, data]);

  const onToggleBookmark = (row) => {
    const id = `${domain}-${config.type}-${row.id}`;
    const result = toggleBookmark({
      id,
      type: config.type,
      name: row[config.nameField],
      description: row[config.descField] || '',
      difficulty: config.difficultyField ? row[config.difficultyField] : undefined,
      section_name: sectionId,
      href: config.href(row),
      mode,
      domain,
    });
    setBookmarkVersion((v) => v + 1);
    toast.success(result.active ? 'Bookmarked' : 'Bookmark removed');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {!sectionId ? (
        <div className="card p-8 text-center text-secondary">
          Select a concept section to view tests and problems.
        </div>
      ) : (
        <>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="section-title">{config.title}</h1>
          <p className="text-sm text-secondary mt-1">Mode: {mode} · Section: {sectionId}</p>
        </div>
        <Link to={`/student/${domain}/${mode}`} className="btn-secondary text-sm">Back to Concepts</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="md:col-span-2 flex items-center gap-2 rounded-2xl border border-theme bg-surface-card px-3 py-2">
          <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-secondary" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search tests or problems"
            className="w-full bg-transparent text-sm text-primary outline-none"
          />
        </label>
        {domain === 'coding' ? (
          <select
            value={difficulty}
            onChange={(e) => {
              setPage(1);
              setDifficulty(e.target.value);
            }}
            className="input"
          >
            <option value="">All Difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        ) : <div />}
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-secondary">Loading...</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-secondary">No items found for this section.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((row, index) => {
            const bookmarkId = `${domain}-${config.type}-${row.id}`;
            const active = isBookmarked(bookmarkId);
            const attempt = attemptMap.get(row.id);
            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-3xl border border-theme bg-surface-card overflow-hidden shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
              >
                <div className="h-36 bg-gradient-to-br from-[#e9f0ff] to-[#f5f8ff] relative">
                  {row[config.cardImage] ? (
                    <img src={row[config.cardImage]} alt={row[config.nameField]} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(79,124,243,0.28),transparent_60%)]" />
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleBookmark(row)}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-primary"
                  >
                    {active ? <BookmarkRoundedIcon sx={{ fontSize: 18 }} /> : <BookmarkBorderRoundedIcon sx={{ fontSize: 18 }} />}
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-primary line-clamp-1">{row[config.nameField]}</h3>
                  <p className="text-xs text-secondary line-clamp-2">{row[config.descField] || 'No description available.'}</p>
                  {attempt ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Attempted {attempt.attempts} time{attempt.attempts > 1 ? 's' : ''} · Best score {attempt.bestScore}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-secondary">{domain === 'coding' ? (row.difficulty || 'Unrated') : `${row.question_ids?.length || 0} Questions`}</span>
                    <Link to={config.href(row)} className="btn-primary text-xs inline-flex items-center gap-1">
                      {config.actionLabel}
                      <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <PaginationControls page={page} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
