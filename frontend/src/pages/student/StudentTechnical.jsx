import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import PaginationControls from '../../components/student/PaginationControls';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

const PAGE_SIZE = 9;
const DIFF_FILTERS = ['All', 'Easy', 'Medium', 'Hard'];
const GRADIENTS = [
  'from-[#ECFDF5] to-[#D1FAE5]','from-[#EEF2FF] to-[#E0E7FF]',
  'from-[#FFFBEB] to-[#FEF3C7]','from-[#F5F3FF] to-[#EDE9FE]',
  'from-[#EFF6FF] to-[#DBEAFE]','from-[#FDF2F8] to-[#FCE7F3]',
];

export default function StudentTechnical() {
  const { mode } = useParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [diff, setDiff] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery(
    ['tech-sections-student', mode, page, search, diff],
    () => api.get('/technical/sections', {
      params: { mode, paginate: true, page, limit: PAGE_SIZE, search, ...(diff !== 'All' && { difficulty: diff }) }
    }).then(r => r.data),
    { keepPreviousData: true }
  );
  const sections = Array.isArray(data) ? data : (data?.items || []);
  const total = Array.isArray(data) ? data.length : (data?.total || 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-5 lg:pr-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="section-title flex items-center gap-2">
            {mode === 'practice'
              ? <><MenuBookRoundedIcon sx={{ fontSize: 22 }} className="text-emerald-600" /> Technical Practice</>
              : <><EmojiEventsRoundedIcon sx={{ fontSize: 22 }} className="text-amber-500" /> Technical Competitor</>}
          </h1>
          <p className="text-sm text-secondary mt-0.5">OS, DBMS, Networks, OOP & more</p>
        </div>
        <Link to={mode === 'practice' ? '/student/technical/competitor' : '/student/technical/practice'}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start">
          {mode === 'practice' ? <><EmojiEventsRoundedIcon sx={{ fontSize: 14 }} /> Competitor Mode</> : <><MenuBookRoundedIcon sx={{ fontSize: 14 }} /> Practice Mode</>}
        </Link>
      </div>
      <div className="flex gap-3">
        <label className="flex items-center gap-2 flex-1 rounded-2xl border border-theme bg-surface-card px-3 py-2.5 focus-within:border-[#4F7CF3] transition-all">
          <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-secondary flex-shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search technical topics…" className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-muted" />
        </label>
        <button onClick={() => setShowFilters(v => !v)}
          className={`btn-secondary flex items-center gap-2 text-xs flex-shrink-0 ${showFilters ? 'border-[#4F7CF3] text-[#4F7CF3]' : ''}`}>
          <TuneRoundedIcon sx={{ fontSize: 16 }} /> Filters {diff !== 'All' && <span className="w-2 h-2 rounded-full bg-[#4F7CF3]" />}
        </button>
      </div>
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 overflow-hidden">
            <span className="text-xs text-secondary self-center">Difficulty:</span>
            {DIFF_FILTERS.map(f => <button key={f} onClick={() => { setDiff(f); setPage(1); }} className={`pill text-xs ${diff === f ? 'active' : ''}`}>{f}</button>)}
          </motion.div>
        )}
      </AnimatePresence>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-theme overflow-hidden">
              <div className="skeleton h-28" /><div className="p-4 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-full" /><div className="skeleton h-8 w-full mt-3" /></div>
            </div>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="card p-12 text-center">
          <SettingsRoundedIcon sx={{ fontSize: 40 }} className="text-muted mx-auto mb-3" />
          <p className="text-secondary font-medium">No topics found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sections.map((section, index) => (
            <motion.div key={section.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
              className="group rounded-3xl border border-theme bg-surface-card overflow-hidden hover:shadow-lift hover:border-[rgba(79,124,243,0.28)] transition-all duration-300 flex flex-col">
              <div className={`h-28 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} relative flex-shrink-0`}>
                {section.banner_url
                  ? <img src={section.banner_url} alt={section.name} className="h-full w-full object-cover" loading="lazy" />
                  : <div className="h-full w-full flex items-center justify-center opacity-20"><SettingsRoundedIcon sx={{ fontSize: 48 }} /></div>}
                <div className="absolute top-3 right-3">
                  <span className={`badge ${section.difficulty === 'Hard' ? 'badge-hard' : section.difficulty === 'Medium' ? 'badge-medium' : 'badge-easy'}`}>{section.difficulty || 'Practice'}</span>
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1 gap-3">
                <div>
                  <h3 className="font-semibold text-primary text-sm group-hover:text-[#4F7CF3] transition-colors">{section.name}</h3>
                  <p className="text-xs text-secondary mt-1 line-clamp-2">{section.description || 'Technical concept questions.'}</p>
                </div>
                <div className="flex items-center gap-2 mt-auto text-xs text-secondary">
                  <SettingsRoundedIcon sx={{ fontSize: 14 }} />{section.question_count || 0} Question{(section.question_count || 0) !== 1 ? 's' : ''}
                </div>
                <Link to={`/student/technical/${mode}/section/${section.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold text-white group-hover:shadow-md transition-all"
                  style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}>
                  Open Topic <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <PaginationControls page={page} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
