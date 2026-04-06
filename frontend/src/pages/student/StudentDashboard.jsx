import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import StudentNavbar from '../../components/student/StudentNavbar';
import { useAuthStore } from '../../store/authStore';
import {
  RiCodeLine, RiBrainLine, RiSettings3Line, RiTrophyLine,
  RiBarChartLine, RiUserLine, RiGlobalLine, RiLogoutBoxLine,
  RiArrowDownSLine, RiMenuLine, RiCloseLine,
  RiArrowRightLine, RiStarLine, RiLineChartLine, RiBookmarkLine,
} from 'react-icons/ri';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import WavingHandRoundedIcon from '@mui/icons-material/WavingHandRounded';
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import CollectionsBookmarkRoundedIcon from '@mui/icons-material/CollectionsBookmarkRounded';
import NotificationPanel from '../../components/common/NotificationPanel';
import { useThemeMode } from '../../context/ThemeContext';

const NAV_ITEMS = [
  { label:'Coding',   icon:<RiCodeLine className="w-4 h-4"/>,    items:[
    { label:'Practice Mode',   icon:<MenuBookRoundedIcon sx={{ fontSize: 18 }}/>, href:'/student/coding/practice',   desc:'Unlimited attempts' },
    { label:'Competitor Mode', icon:<EmojiEventsRoundedIcon sx={{ fontSize: 18 }}/>, href:'/student/coding/competitor',  desc:'Scored + leaderboard' },
  ]},
  { label:'Aptitude', icon:<RiBrainLine className="w-4 h-4"/>,   items:[
    { label:'Practice Mode',   icon:<MenuBookRoundedIcon sx={{ fontSize: 18 }}/>, href:'/student/aptitude/practice',  desc:'Unlimited attempts' },
    { label:'Competitor Mode', icon:<EmojiEventsRoundedIcon sx={{ fontSize: 18 }}/>, href:'/student/aptitude/competitor', desc:'Scored + leaderboard' },
  ]},
  { label:'Technical',icon:<RiSettings3Line className="w-4 h-4"/>, items:[
    { label:'Practice Mode',   icon:<MenuBookRoundedIcon sx={{ fontSize: 18 }}/>, href:'/student/technical/practice',  desc:'OS, DBMS, Networks' },
    { label:'Competitor Mode', icon:<EmojiEventsRoundedIcon sx={{ fontSize: 18 }}/>, href:'/student/technical/competitor', desc:'Scored + leaderboard' },
  ]},
  { label:'Media', icon:<CollectionsBookmarkRoundedIcon sx={{ fontSize: 18 }}/>, items:[
    { label:'Media Library', icon:<CollectionsBookmarkRoundedIcon sx={{ fontSize: 18 }}/>, href:'/student/media', desc:'View and download resources' },
  ]},
];

function HoverDropdown({ label, icon, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return ()=>document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      <button onClick={()=>setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-[#4F7CF3] hover:bg-blue-50 transition-all">
        {icon}{label}<RiArrowDownSLine className={`w-3.5 h-3.5 transition-transform ${open?'rotate-180':''}`}/>
      </button>
      <AnimatePresence>
        {open&&(
          <motion.div initial={{opacity:0,y:-6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:0.97}} transition={{duration:0.15}}
            className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-2xl border border-gray-100 z-50 overflow-hidden"
            style={{boxShadow:'0 12px 40px rgba(79,124,243,0.15)'}}>
            {items.map((item,i)=>(
              <Link key={i} to={item.href} onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#4F7CF3] transition-colors border-b border-gray-50 last:border-0">
                <span className="text-base w-5 text-center">{item.icon}</span>
                <div><p className="font-semibold text-sm leading-tight">{item.label}</p><p className="text-xs text-gray-400 mt-0.5">{item.desc}</p></div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return ()=>document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      <button onClick={()=>setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-all">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{background:'linear-gradient(135deg,#4F7CF3,#7C8CFF)'}}>
          {user?.name?.[0]?.toUpperCase()||'U'}
        </div>
        <span className="text-sm font-semibold text-gray-700 max-w-[100px] truncate hidden sm:block">{user?.student_id}</span>
        <RiArrowDownSLine className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open?'rotate-180':''}`}/>
      </button>
      <AnimatePresence>
        {open&&(
          <motion.div initial={{opacity:0,y:-6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:0.97}} transition={{duration:0.15}}
            className="absolute top-full right-0 mt-1.5 w-56 bg-white rounded-2xl border border-gray-100 z-50 overflow-hidden"
            style={{boxShadow:'0 12px 40px rgba(79,124,243,0.15)'}}>
            <div className="px-4 py-4 border-b border-gray-100"
              style={{background:'linear-gradient(135deg,#E6E4F8,#F0F0FF)'}}>
              <p className="font-bold text-gray-800 text-sm">{user?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user?.department} · Year {user?.year}</p>
            </div>
            {[
              {icon:<RiUserLine className="w-4 h-4"/>,label:'My Profile',   href:'/student/profile'},
              {icon:<RiGlobalLine className="w-4 h-4"/>,label:'Portfolio',   href:`/portfolio/${user?.student_id}`},
              {icon:<RiBarChartLine className="w-4 h-4"/>,label:'Results',    href:'/student/results'},
              {icon:<RiLineChartLine className="w-4 h-4"/>,label:'Analytics', href:'/student/analytics'},
              {icon:<RiBookmarkLine className="w-4 h-4"/>,label:'Bookmarks',  href:'/student/bookmarks'},
              {icon:<RiTrophyLine className="w-4 h-4"/>,label:'Achievements',href:'/student/achievements'},
              {icon:<RiBarChartLine className="w-4 h-4"/>,label:'Leaderboard',href:'/student/leaderboard'},
            ].map((item,i)=>(
              <Link key={i} to={item.href} onClick={()=>setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#4F7CF3] transition-colors">
                {item.icon}{item.label}
              </Link>
            ))}
            <div className="border-t border-gray-100">
              <button onClick={()=>{logout();navigate('/login');}}
                className="flex items-center gap-3 px-4 py-3 w-full text-sm text-red-500 hover:bg-red-50 transition-colors">
                <RiLogoutBoxLine className="w-4 h-4"/> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const STUDENT_NAV_EXPORT = NAV_ITEMS;

const CARD_COLORS = [
  {bg:'bg-card-lavender',icon:'text-[#4F7CF3]',iconBg:'bg-white/60'},
  {bg:'bg-card-mint',    icon:'text-emerald-600',iconBg:'bg-white/60'},
  {bg:'bg-card-pink',    icon:'text-pink-600',   iconBg:'bg-white/60'},
  {bg:'bg-card-yellow',  icon:'text-amber-600',  iconBg:'bg-white/60'},
];

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggleTheme } = useThemeMode();
  const { data:stats } = useQuery('my-stats',()=>api.get('/profile/me/stats').then(r=>r.data));
  const { data:competitions } = useQuery('active-competitions',()=>api.get('/competitions/').then(r=>r.data));
  const { data:codingSections } = useQuery('dashboard-coding-sections', () =>
    api.get('/coding/sections').then((r) => r.data || [])
  );
  const { data:aptitudeSections } = useQuery('dashboard-apt-sections', () =>
    api.get('/aptitude/sections').then((r) => r.data || [])
  );
  const { data:technicalSections } = useQuery('dashboard-tech-sections', () =>
    api.get('/technical/sections').then((r) => r.data || [])
  );
  const { data:dashboardTests } = useQuery('dashboard-tests', async () => {
    const [apt, tech] = await Promise.all([
      api.get('/aptitude/tests'),
      api.get('/technical/tests'),
    ]);
    return [...(apt.data || []), ...(tech.data || [])];
  });
  const { data:dashboardTestHistory = [] } = useQuery(
    'dashboard-test-history',
    () => api.get('/submissions/aptitude/history?limit=500').then((r) => r.data?.submissions || []),
    { staleTime: 60000 }
  );

  const unwrapList = (payload) => (Array.isArray(payload) ? payload : (payload?.items || []));

  const allCompetitions = unwrapList(competitions);
  const activeComps = allCompetitions.filter(c=>c.status==='active');
  const codingSectionsList = unwrapList(codingSections);
  const aptitudeSectionsList = unwrapList(aptitudeSections);
  const technicalSectionsList = unwrapList(technicalSections);
  const testsList = unwrapList(dashboardTests);

  const concepts = [
    ...codingSectionsList.map((s) => ({
      ...s,
      stream: 'Coding',
      href: `/student/coding/${s.mode || 'practice'}/section/${s.id}`,
    })),
    ...aptitudeSectionsList.map((s) => ({
      ...s,
      stream: 'Aptitude',
      href: `/student/aptitude/${s.mode || 'practice'}/section/${s.id}`,
    })),
    ...technicalSectionsList.map((s) => ({
      ...s,
      stream: 'Technical',
      href: `/student/technical/${s.mode || 'practice'}/section/${s.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const tests = testsList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const practiceConcepts = concepts.filter((c) => (c.mode || 'practice') === 'practice').slice(0, 6);
  const competitorConcepts = concepts.filter((c) => c.mode === 'competitor').slice(0, 6);
  const practiceTests = tests.filter((t) => (t.mode || 'practice') === 'practice').slice(0, 6);
  const competitorTests = tests.filter((t) => t.mode === 'competitor').slice(0, 6);
  const testAttemptMap = useMemo(() => {
    const grouped = new Map();
    dashboardTestHistory.forEach((submission) => {
      if (!submission.test_id) return;
      const current = grouped.get(submission.test_id) || { attempts: 0 };
      current.attempts += 1;
      grouped.set(submission.test_id, current);
    });
    return grouped;
  }, [dashboardTestHistory]);

  const getAttemptCap = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const statCards = [
    { icon:<RiBarChartLine/>, label:'Submissions',  value:stats?.total_submissions },
    { icon:<RiStarLine/>,     label:'Accepted',     value:stats?.accepted_submissions },
    { icon:<AssignmentTurnedInRoundedIcon sx={{ fontSize: 18 }}/>, label:'Tests Done', value:stats?.stats?.tests_attempted },
    { icon:<RiTrophyLine/>,   label:'Total Score',  value:stats?.stats?.total_score },
  ];

  const quickPractice = [
    { label:'DSA Coding',    href:'/student/coding/practice',    icon:<RiCodeLine className="w-5 h-5"/>,    desc:'Algorithms & DS',      color:'bg-card-lavender',text:'text-[#4F7CF3]' },
    { label:'Aptitude',      href:'/student/aptitude/practice',  icon:<RiBrainLine className="w-5 h-5"/>,   desc:'Quant, Logical',       color:'bg-card-pink',    text:'text-pink-600' },
    { label:'Technical',     href:'/student/technical/practice', icon:<RiSettings3Line className="w-5 h-5"/>,desc:'OS, DBMS, CN',        color:'bg-card-mint',    text:'text-emerald-600' },
  ];
  const compete = [
    { label:'Code Contest',   href:'/student/coding/competitor',    icon:<EmojiEventsRoundedIcon sx={{ fontSize: 24 }}/>, color:'border-[#4F7CF3] bg-blue-50' },
    { label:'Aptitude Test',  href:'/student/aptitude/competitor',  icon:<FlagRoundedIcon sx={{ fontSize: 24 }}/>, color:'border-pink-300 bg-pink-50' },
    { label:'Tech Challenge', href:'/student/technical/competitor', icon:<FlashOnRoundedIcon sx={{ fontSize: 24 }}/>, color:'border-emerald-300 bg-emerald-50' },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <StudentNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-7">
        {/* Hero */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
          className="rounded-3xl overflow-hidden relative p-7 bg-gradient-to-br from-[#0b1020] via-[#101a3d] to-[#22306d]">
          <div className="absolute inset-0"><div className="absolute -top-8 right-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"/></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-300 text-sm mb-1 font-medium inline-flex items-center gap-1"><WavingHandRoundedIcon sx={{ fontSize: 16 }}/> Welcome back</p>
              <h1 className="text-white text-2xl md:text-3xl font-bold">{user?.name?.split(' ')[0]||'Student'}</h1>
              <p className="text-blue-300/80 text-sm mt-0.5">{user?.department} · {user?.course} · Year {user?.year}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/student/coding/practice" className="btn btn-sm bg-white text-primary hover:bg-surface-lighter">Start Coding <RiArrowRightLine className="w-4 h-4" /></Link>
              <Link to="/student/leaderboard"     className="btn btn-sm bg-white/10 text-white border border-white/20 hover:bg-white/20">Leaderboard</Link>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s,i)=>(
            <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
              className={`${CARD_COLORS[i].bg} rounded-2xl p-5`}>
              <div className={`w-10 h-10 rounded-xl ${CARD_COLORS[i].iconBg} flex items-center justify-center ${CARD_COLORS[i].icon} text-lg mb-3`}>{s.icon}</div>
              <p className={`text-2xl font-bold ${CARD_COLORS[i].icon}`} style={{fontFamily:'Plus Jakarta Sans'}}>{s.value??0}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Learning Hubs */}
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2"><AutoStoriesRoundedIcon sx={{ fontSize: 20 }} /> Learning Hubs</h2>
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-[#1F2A78]">Practice Sections</p>
                <span className="text-xs font-semibold text-blue-600">Hands-on</span>
              </div>
              <div className="space-y-3">
                {practiceConcepts.length === 0 && <p className="text-sm text-gray-400 px-2 py-4">No practice sections yet.</p>}
                {practiceConcepts.map((c) => (
                  <Link key={`${c.stream}-${c.id}`} to={c.href} className="block bg-white rounded-2xl border border-blue-100 overflow-hidden hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      {c.banner_url ? <img src={c.banner_url} alt="" className="w-20 h-20 object-cover" loading="lazy" /> : <div className="w-20 h-20 bg-blue-100" />}
                      <div className="pr-3 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-blue-600 mt-0.5">{c.stream} • Practice</p>
                        {c.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-[#7A1F4D]">Competitor Sections</p>
                <span className="text-xs font-semibold text-pink-600">Scored</span>
              </div>
              <div className="space-y-3">
                {competitorConcepts.length === 0 && <p className="text-sm text-gray-400 px-2 py-4">No competitor sections yet.</p>}
                {competitorConcepts.map((c) => (
                  <Link key={`${c.stream}-${c.id}`} to={c.href} className="block bg-white rounded-2xl border border-pink-100 overflow-hidden hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      {c.banner_url ? <img src={c.banner_url} alt="" className="w-20 h-20 object-cover" loading="lazy" /> : <div className="w-20 h-20 bg-pink-100" />}
                      <div className="pr-3 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-pink-600 mt-0.5">{c.stream} • Competitor</p>
                        {c.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Test Boards */}
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2"><QuizRoundedIcon sx={{ fontSize: 20 }} /> Test Boards</h2>
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-800">Practice Tests</p>
                <span className="text-xs text-gray-500">{practiceTests.length}</span>
              </div>
              <div className="space-y-2.5">
                {practiceTests.length === 0 && <p className="text-sm text-gray-400 px-2 py-2">No practice tests uploaded.</p>}
                {practiceTests.map((t) => {
                  const attempt = testAttemptMap.get(t.id);
                  const maxAttempts = getAttemptCap(t.max_attempts);
                  const attemptsRemaining = maxAttempts === null ? null : Math.max(0, maxAttempts - (attempt?.attempts || 0));
                  const writtenCount = attempt?.attempts || 0;
                  const isLocked = attemptsRemaining === 0;

                  return isLocked ? (
                    <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 bg-gray-50/80 opacity-75">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{t.section_type || 'test'}</p>
                        <p className="text-xs text-red-600 mt-1">Written {writtenCount} time{writtenCount === 1 ? '' : 's'} · Attempts exhausted</p>
                      </div>
                      <span className="text-xs text-red-500 font-medium shrink-0">Locked</span>
                    </div>
                  ) : (
                    <Link key={t.id} to={`/test/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{t.section_type || 'test'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Written {writtenCount} time{writtenCount === 1 ? '' : 's'} · {maxAttempts === null ? 'Unlimited attempts' : `${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 shrink-0"><TimerOutlinedIcon sx={{ fontSize: 14 }} /> {t.time_limit_minutes || 0}m</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-800">Competitor Tests</p>
                <span className="text-xs text-gray-500">{competitorTests.length}</span>
              </div>
              <div className="space-y-2.5">
                {competitorTests.length === 0 && <p className="text-sm text-gray-400 px-2 py-2">No competitor tests uploaded.</p>}
                {competitorTests.map((t) => {
                  const attempt = testAttemptMap.get(t.id);
                  const maxAttempts = getAttemptCap(t.max_attempts);
                  const attemptsRemaining = maxAttempts === null ? null : Math.max(0, maxAttempts - (attempt?.attempts || 0));
                  const writtenCount = attempt?.attempts || 0;
                  const isLocked = attemptsRemaining === 0;

                  return isLocked ? (
                    <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 bg-gray-50/80 opacity-75">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{t.section_type || 'test'}</p>
                        <p className="text-xs text-red-600 mt-1">Written {writtenCount} time{writtenCount === 1 ? '' : 's'} · Attempts exhausted</p>
                      </div>
                      <span className="text-xs text-red-500 font-medium shrink-0">Locked</span>
                    </div>
                  ) : (
                    <Link key={t.id} to={`/test/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{t.section_type || 'test'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Written {writtenCount} time{writtenCount === 1 ? '' : 's'} · {maxAttempts === null ? 'Unlimited attempts' : `${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1 shrink-0"><TimerOutlinedIcon sx={{ fontSize: 14 }} /> {t.time_limit_minutes || 0}m</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* My Performance */}
            <div>
              <h2 className="section-title mb-4 flex items-center gap-2"><RiBarChartLine className="w-5 h-5"/> My Performance</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <motion.div whileHover={{y:-4,boxShadow:'0 12px 32px rgba(79,124,243,0.12)'}}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 cursor-pointer hover:border-blue-200 transition-all">
                  <Link to="/student/results" className="block">
                    <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-blue-600 mb-4"><RiBarChartLine className="w-5 h-5"/></div>
                    <p className="font-bold text-gray-800 text-sm">My Results</p>
                    <p className="text-xs text-gray-500 mt-0.5">View submission history & feedback</p>
                    <div className="flex items-center gap-1 mt-4 text-xs font-bold text-blue-600">View <RiArrowRightLine className="w-3.5 h-3.5"/></div>
                  </Link>
                </motion.div>
                <motion.div whileHover={{y:-4,boxShadow:'0 12px 32px rgba(79,124,243,0.12)'}}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100 cursor-pointer hover:border-purple-200 transition-all">
                  <Link to="/student/analytics" className="block">
                    <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-purple-600 mb-4"><RiLineChartLine className="w-5 h-5"/></div>
                    <p className="font-bold text-gray-800 text-sm">Analytics</p>
                    <p className="text-xs text-gray-500 mt-0.5">Detailed insights & progress</p>
                    <div className="flex items-center gap-1 mt-4 text-xs font-bold text-purple-600">Explore <RiArrowRightLine className="w-3.5 h-3.5"/></div>
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* Practice */}
            <div>
              <h2 className="section-title mb-4 flex items-center gap-2"><MenuBookRoundedIcon sx={{ fontSize: 20 }}/> Quick Practice</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {quickPractice.map((a,i)=>(
                  <motion.div key={i} whileHover={{y:-4,boxShadow:'0 12px 32px rgba(79,124,243,0.12)'}}
                    className={`${a.color} rounded-2xl p-5 cursor-pointer border border-transparent hover:border-blue-100 transition-all duration-300`}>
                    <Link to={a.href} className="block">
                      <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center ${a.text} mb-4`}>{a.icon}</div>
                      <p className="font-bold text-gray-800 text-sm">{a.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
                      <div className={`flex items-center gap-1 mt-4 text-xs font-bold ${a.text}`}>Start <RiArrowRightLine className="w-3.5 h-3.5"/></div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
            {/* Compete */}
            <div>
              <h2 className="section-title mb-4 flex items-center gap-2"><EmojiEventsRoundedIcon sx={{ fontSize: 20 }}/> Compete & Rank</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {compete.map((a,i)=>(
                  <Link key={i} to={a.href}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${a.color} hover:shadow-md transition-all`}>
                    <span className="text-2xl">{a.icon}</span>
                    <div><p className="font-bold text-gray-800 text-sm">{a.label}</p><p className="text-xs text-gray-400">Scored · Leaderboard</p></div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Grow Your Skills */}
          <div className="lg:col-span-2 space-y-5">
            <h2 className="section-title mb-4 flex items-center gap-2">⭐ Grow Your Skills</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <motion.div whileHover={{y:-4,boxShadow:'0 12px 32px rgba(79,124,243,0.12)'}}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100 cursor-pointer hover:border-amber-200 transition-all">
                <Link to="/student/bookmarks" className="block">
                  <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-amber-600 mb-4"><RiBookmarkLine className="w-5 h-5"/></div>
                  <p className="font-bold text-gray-800 text-sm">My Bookmarks</p>
                  <p className="text-xs text-gray-500 mt-0.5">Saved problems, tests & resources</p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-bold text-amber-600">Explore <RiArrowRightLine className="w-3.5 h-3.5"/></div>
                </Link>
              </motion.div>
              <motion.div whileHover={{y:-4,boxShadow:'0 12px 32px rgba(79,124,243,0.12)'}}
                className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-5 border border-yellow-100 cursor-pointer hover:border-yellow-200 transition-all">
                <Link to="/student/achievements" className="block">
                  <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-yellow-600 mb-4"><RiTrophyLine className="w-5 h-5"/></div>
                  <p className="font-bold text-gray-800 text-sm">Achievements</p>
                  <p className="text-xs text-gray-500 mt-0.5">Earn badges & unlock milestones</p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-bold text-yellow-600">View Badges <RiArrowRightLine className="w-3.5 h-3.5"/></div>
                </Link>
              </motion.div>
              <motion.div whileHover={{y:-4,boxShadow:'0 12px 32px rgba(79,124,243,0.12)'}}
                className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-5 border border-sky-100 cursor-pointer hover:border-sky-200 transition-all">
                <Link to="/student/courses" className="block">
                  <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-sky-600 mb-4"><RiGlobalLine className="w-5 h-5"/></div>
                  <p className="font-bold text-gray-800 text-sm">Courses</p>
                  <p className="text-xs text-gray-500 mt-0.5">Structured learning paths &amp; blogs</p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-bold text-sky-600">Browse <RiArrowRightLine className="w-3.5 h-3.5"/></div>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Active Competitions */}
          <div>
            <h2 className="section-title mb-4 flex items-center gap-2"><LocalFireDepartmentRoundedIcon sx={{ fontSize: 20 }}/> Live Competitions</h2>
            <div className="space-y-3">
              {activeComps.length===0&&(
                <div className="card p-8 text-center">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><RiTrophyLine className="w-7 h-7 text-[#4F7CF3]"/></div>
                  <p className="text-gray-500 text-sm font-medium">No active competitions</p>
                  <p className="text-gray-400 text-xs mt-1">Check back later!</p>
                </div>
              )}
              {activeComps.map((c,i)=>(
                <motion.div key={c.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}
                  className="card p-0 border-l-4 border-l-emerald-500 overflow-hidden">
                  <div className="h-28 bg-gradient-to-br from-[#ecf5ff] to-[#f7fbff]">
                    {c.banner_url ? <img src={c.banner_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" /> : null}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-gray-800 text-sm leading-tight">{c.name}</p>
                      <span className="badge badge-live shrink-0 ml-2">LIVE</span>
                    </div>
                    {c.description&&<p className="text-xs text-gray-400 line-clamp-2 mb-2">{c.description}</p>}
                    <p className="text-xs text-gray-400 mb-3">Ends: {c.end_time?new Date(c.end_time).toLocaleString():'—'}</p>
                    <Link to={`/student/competitions/${c.id}`} className="btn btn-primary w-full text-xs py-2">Open Competition →</Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
