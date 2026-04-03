import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PaginationControls from '../../components/student/PaginationControls';

const PAGE_SIZE = 8;

export default function StudentCoding() {
  const { mode } = useParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(['coding-sections-student', mode, page, search], () =>
    api.get('/coding/sections', { params: { mode, paginate: true, page, limit: PAGE_SIZE, search } }).then(r => r.data)
  );
  const sections = Array.isArray(data) ? data : (data?.items || []);
  const total = Array.isArray(data) ? data.length : (data?.total || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="section-title inline-flex items-center gap-2">Coding - {mode === 'practice' ? <><MenuBookRoundedIcon sx={{ fontSize: 20 }} /> Practice Mode</> : <><EmojiEventsRoundedIcon sx={{ fontSize: 20 }} /> Competitor Mode</>}</h1>
        <p className="text-gray-400 text-sm mt-0.5">Choose a concept to view coding problems with filters and bookmarks.</p>
      </div>

      <label className="flex items-center gap-2 rounded-2xl border border-theme bg-surface-card px-3 py-2">
        <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-secondary" />
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search coding concepts"
          className="w-full bg-transparent text-sm text-primary outline-none"
        />
      </label>

      {isLoading ? (
        <div className="card p-8 text-center text-secondary">Loading concepts...</div>
      ) : sections.length === 0 ? (
        <div className="card p-8 text-center text-secondary">No concepts available.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-3xl border border-theme bg-surface-card overflow-hidden"
            >
              <div className="h-32 bg-gradient-to-br from-[#e9f0ff] to-[#f6f8ff]">
                {section.banner_url ? <img src={section.banner_url} alt={section.name} className="h-full w-full object-cover" loading="lazy" /> : null}
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-primary">{section.name}</h3>
                <p className="text-xs text-secondary line-clamp-2">{section.description || 'Practice this concept with curated coding problems.'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">{section.problem_count || 0} Problems</span>
                  <Link to={`/student/coding/${mode}/section/${section.id}`} className="btn-primary text-xs">Open Concept</Link>
                </div>
              </div>
            </motion.div>
          ))}
          </div>
      )}

      <PaginationControls page={page} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
