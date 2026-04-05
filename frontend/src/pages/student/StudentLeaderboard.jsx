import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LooksOneRoundedIcon from '@mui/icons-material/LooksOneRounded';
import LooksTwoRoundedIcon from '@mui/icons-material/LooksTwoRounded';
import Looks3RoundedIcon from '@mui/icons-material/Looks3Rounded';

const DEPTS = ['','CSE','ECE','EEE','MECH','CIVIL','IT','AIDS','AIML'];
const MEDAL = {
  1: <LooksOneRoundedIcon sx={{ fontSize: 28 }} className="text-amber-500" />,
  2: <LooksTwoRoundedIcon sx={{ fontSize: 28 }} className="text-slate-500" />,
  3: <Looks3RoundedIcon sx={{ fontSize: 28 }} className="text-orange-500" />,
};

export default function StudentLeaderboard() {
  const { user } = useAuthStore();
  const [dept, setDept]   = useState('');
  const [year, setYear]   = useState('');
  const [sectionType, setSectionType] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [testId, setTestId] = useState('');
  const [wsStatus, setWsStatus] = useState('connecting');

  const sectionTypeOptions = ['coding', 'aptitude', 'technical', 'competition'];
  const { data, refetch } = useQuery(
    ['leaderboard', dept, year, sectionType, sectionId, testId],
    () => api.get('/leaderboard/', {
      params: {
        department: dept || undefined,
        year: year || undefined,
        section_type: sectionType || undefined,
        section_id: sectionId || undefined,
        test_id: testId || undefined,
      },
    }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const wsBase = backendUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
    const WS_URL = wsBase + '/api/v1/ws/leaderboard';
    let ws;
    let pingInterval;
    let reconnectTimeout;
    let active = true;
    const connect = () => {
      if (!active) return;
      try {
        ws = new WebSocket(WS_URL);
        ws.onopen = () => { setWsStatus('connected'); pingInterval = setInterval(() => ws.send('ping'), 20000); };
        ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.type==='score_update') refetch(); } catch {} };
        ws.onclose = () => { setWsStatus('disconnected'); clearInterval(pingInterval); if (active) reconnectTimeout = setTimeout(connect, 5000); };
        ws.onerror = () => setWsStatus('error');
      } catch { setWsStatus('error'); }
    };
    connect();
    return () => { active = false; ws?.close(); clearInterval(pingInterval); clearTimeout(reconnectTimeout); };
  }, []);

  const entries = data?.leaderboard || [];
  const sectionOptions = data?.sections || [];
  const testOptions = data?.tests || [];
  const effectiveSectionTypes = data?.section_types?.length ? data.section_types : sectionTypeOptions;
  const wsIndicatorClass = wsStatus === 'connected'
    ? 'bg-emerald-500 animate-pulse'
    : wsStatus === 'connecting'
      ? 'bg-amber-400 animate-pulse'
      : 'bg-red-400';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="section-title inline-flex items-center gap-2"><EmojiEventsRoundedIcon sx={{ fontSize: 22 }} /> Leaderboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">Rankings across coding, aptitude, technical, and competition scores</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200">
            <span className={`w-2 h-2 rounded-full ${wsIndicatorClass}`} />
            <span className="text-xs text-gray-500 font-medium">
              {wsStatus === 'connected' ? 'Live updates' : wsStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3">
          <select className="input py-2 text-sm w-36" value={dept} onChange={e=>setDept(e.target.value)}>
            <option value="">All Depts</option>
            {DEPTS.filter(Boolean).map(d=><option key={d}>{d}</option>)}
          </select>
          <select className="input py-2 text-sm w-28" value={year} onChange={e=>setYear(e.target.value)}>
            <option value="">All Years</option>
            {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
          </select>
          <select
            className="input py-2 text-sm flex-1 min-w-40"
            value={sectionType}
            onChange={(e) => {
              setSectionType(e.target.value);
              setSectionId('');
              setTestId('');
            }}
          >
            <option value="">All Types</option>
            {effectiveSectionTypes.map((type) => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>
          <select
            className="input py-2 text-sm flex-1 min-w-44"
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setTestId('');
            }}
          >
            <option value="">All Sections</option>
            {sectionOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name} {option.section_type ? `(${option.section_type})` : ''}</option>
            ))}
          </select>
          <select
            className="input py-2 text-sm flex-1 min-w-44"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
          >
            <option value="">All Tests</option>
            {testOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name} {option.section_type ? `(${option.section_type})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Podium */}
        {entries.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-4">
            {[entries[1],entries[0],entries[2]].map((e,pi) => {
              const rank = pi===0?2:pi===1?1:3;
              const height = rank===1?'h-28':'h-20';
              const bg = rank===1?'bg-gradient-to-b from-amber-100 to-amber-50 border-amber-300':rank===2?'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-300':'bg-gradient-to-b from-orange-100 to-orange-50 border-orange-300';
              return (
                <motion.div key={e?.student_id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:pi*0.1}} className="flex flex-col items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm">{e?.name}</p>
                  <p className="text-xs text-gray-400 font-bold">{e?.score}pts</p>
                  <div className={`${height} w-20 rounded-t-2xl border-2 flex items-center justify-center text-3xl ${bg}`}>{MEDAL[rank]}</div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Rank','Student','Dept','Year','Score'].map(h=><th key={h} className="tbl-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {entries.map(e => {
                  const isMe = e.student_id === user?.student_id;
                  return (
                    <motion.tr key={e.student_id} layout initial={{opacity:0}} animate={{opacity:1}}
                      className={`tbl-row ${isMe?'bg-purple-50 border-l-2 border-l-[#6C63FF]':''}`}>
                      <td className="tbl-cell font-bold text-lg w-12">{MEDAL[e.rank]||<span className="text-gray-600">#{e.rank}</span>}</td>
                      <td className="tbl-cell font-semibold text-gray-800">
                        {e.name}{isMe&&<span className="ml-2 badge bg-purple-100 text-purple-700">You</span>}
                      </td>
                      <td className="tbl-cell text-gray-500">{e.department}</td>
                      <td className="tbl-cell text-gray-500">Y{e.year}</td>
                      <td className="tbl-cell font-bold text-amber-600">{e.score}</td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {!entries.length&&<tr><td colSpan={5} className="text-center py-10 text-gray-400">No rankings yet for the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
    </div>
  );
}
