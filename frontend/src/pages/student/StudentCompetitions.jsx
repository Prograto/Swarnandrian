import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import PaginationControls from '../../components/student/PaginationControls';

const STATUS_COLOR  = { upcoming:'bg-amber-100 text-amber-700', active:'bg-emerald-100 text-emerald-700', ended:'bg-gray-100 text-gray-500' };
const STATUS_BORDER = { upcoming:'border-l-amber-400', active:'border-l-emerald-500', ended:'border-l-gray-200' };
const PAGE_SIZE = 9;

export default function StudentCompetitions() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data } = useQuery(
    ['student-competitions', status, search, page],
    () => api.get('/competitions/', { params: { paginate: true, status, search, page, limit: PAGE_SIZE } }).then(r => r.data),
    { keepPreviousData: true }
  );

  const competitions = Array.isArray(data) ? data : (data?.items || []);
  const total = Array.isArray(data) ? data.length : (data?.total || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="space-y-2">
          <h1 className="section-title inline-flex items-center gap-2"><FlagRoundedIcon sx={{fontSize:22}}/> Competitions</h1>
          <p className="text-gray-400 text-sm mt-0.5">Join faculty-hosted timed competitions</p>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="input md:col-span-2"
              placeholder="Search competitions"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
            <select
              className="input"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {competitions.map((c,i)=>(
            <motion.div key={c.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
              className={`card border-l-4 ${STATUS_BORDER[c.status]||'border-l-gray-200'} flex flex-col overflow-hidden`}>
              <div className="h-36 bg-gradient-to-br from-[#edf5ff] to-[#f7fbff]">
                {c.banner_url ? (
                  <img src={c.banner_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(79,124,243,0.26),transparent_60%)]" />
                )}
              </div>

              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-800 leading-tight">{c.name}</h3>
                  <span className={`badge ${STATUS_COLOR[c.status]} shrink-0`}>{c.status}</span>
                </div>
                {c.description&&<p className="text-sm text-gray-500 line-clamp-2">{c.description}</p>}
                <div className="space-y-1 text-xs text-gray-400">
                  <p className="inline-flex items-center gap-1"><EventAvailableRoundedIcon sx={{fontSize:12}}/> Start: {c.start_time?new Date(c.start_time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}</p>
                  <p className="inline-flex items-center gap-1"><AccessTimeRoundedIcon sx={{fontSize:12}}/> End: {c.end_time?new Date(c.end_time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                {c.status==='active'&&(
                  <Link to={`/student/competitions/${c.id}`} className="btn-primary w-full text-sm text-center">Open Competition →</Link>
                )}
                {c.status==='upcoming'&&<div className="text-center py-2 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">Opens soon</div>}
                {c.status==='ended'&&<div className="text-center py-2 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">Competition ended</div>}
              </div>
            </motion.div>
          ))}
          {!competitions.length&&<div className="col-span-3 card p-12 text-center"><p className="text-4xl mb-3 inline-flex"><FlagRoundedIcon sx={{fontSize:36}}/></p><p className="text-gray-400">No competitions right now. Check back soon!</p></div>}
        </div>

        <PaginationControls page={page} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
