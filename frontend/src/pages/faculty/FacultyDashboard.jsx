import React from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import {
  RiCodeLine, RiBrainLine, RiSettings3Line, RiTrophyLine,
  RiBarChartLine, RiArrowRightLine, RiGroupLine, RiFileListLine,
} from 'react-icons/ri';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import CollectionsBookmarkRoundedIcon from '@mui/icons-material/CollectionsBookmarkRounded';
import WavingHandRoundedIcon from '@mui/icons-material/WavingHandRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

const STATUS_COLORS = {
  accepted: '#22c55e',
  wrong_answer: '#ef4444',
  tle: '#f59e0b',
  compilation_error: '#f97316',
};

export const FACULTY_NAV = [
  { label:'Evaluation',  href:'/faculty/evaluation', icon:<AnalyticsRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Coding', href:'#', icon:<RiCodeLine className="w-4 h-4"/>, children:[
    { label:'Practice Mode',   href:'/faculty/coding/practice',   icon:<MenuBookRoundedIcon sx={{ fontSize: 18 }}/> },
    { label:'Competitor Mode', href:'/faculty/coding/competitor',  icon:<EmojiEventsRoundedIcon sx={{ fontSize: 18 }}/> },
  ]},
  { label:'Aptitude', href:'#', icon:<RiBrainLine className="w-4 h-4"/>, children:[
    { label:'Practice Mode',   href:'/faculty/aptitude/practice',  icon:<MenuBookRoundedIcon sx={{ fontSize: 18 }}/> },
    { label:'Competitor Mode', href:'/faculty/aptitude/competitor', icon:<EmojiEventsRoundedIcon sx={{ fontSize: 18 }}/> },
  ]},
  { label:'Technical', href:'#', icon:<RiSettings3Line className="w-4 h-4"/>, children:[
    { label:'Practice Mode',   href:'/faculty/technical/practice',  icon:<MenuBookRoundedIcon sx={{ fontSize: 18 }}/> },
    { label:'Competitor Mode', href:'/faculty/technical/competitor', icon:<EmojiEventsRoundedIcon sx={{ fontSize: 18 }}/> },
  ]},
  { label:'Competitions', href:'/faculty/competitions', icon:<FlagRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Media', href:'/faculty/media', icon:<CollectionsBookmarkRoundedIcon sx={{ fontSize: 18 }}/> },
];

const QUICK = [
  { label:'Coding Practice',   href:'/faculty/coding/practice',    icon:<RiCodeLine/>,     color:'bg-card-lavender', accent:'text-[#4F7CF3]', desc:'Add DSA problems' },
  { label:'Coding Competitor', href:'/faculty/coding/competitor',   icon:<RiCodeLine/>,     color:'bg-card-mint',     accent:'text-emerald-600', desc:'Scored problems' },
  { label:'Aptitude Practice', href:'/faculty/aptitude/practice',   icon:<RiBrainLine/>,    color:'bg-card-pink',     accent:'text-pink-600',  desc:'MCQ/MSQ quizzes' },
  { label:'Aptitude Competitor',href:'/faculty/aptitude/competitor', icon:<RiBrainLine/>,   color:'bg-card-yellow',   accent:'text-amber-600', desc:'Scored tests' },
  { label:'Technical Practice', href:'/faculty/technical/practice', icon:<RiSettings3Line/>,color:'bg-card-lavender', accent:'text-[#7C8CFF]', desc:'OS, DBMS, CN…' },
  { label:'Competitions',       href:'/faculty/competitions',        icon:<RiTrophyLine/>,   color:'bg-card-mint',     accent:'text-emerald-600', desc:'Host contests' },
];

const STATUS_COLOR = { accepted:'badge-mint', wrong_answer:'bg-red-100 text-red-700', tle:'badge-medium', compilation_error:'bg-orange-100 text-orange-700' };

export default function FacultyDashboard() {
  const { user } = useAuthStore();
  const { data } = useQuery('faculty-overview', ()=>api.get('/faculty/evaluation/overview').then(r=>r.data));
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState({ startDate: '', endDate: '', test: '', type: 'all' });

  const { data: submissionView, isLoading: submissionsLoading } = useQuery(
    ['faculty-submissions', page, filters],
    () => api.get('/faculty/evaluation/results', {
      params: {
        page,
        limit: 10,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        test: filters.test || undefined,
        exam_type: filters.type,
      },
    }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const recentSubmissions = submissionView?.items || [];
  const trendData = (data?.submission_trends || []).map((x) => ({ day: x._id, count: x.count }));
  const pieData = [
    { name: 'Students', value: data?.total_students || 0 },
    { name: 'Tests', value: data?.total_tests || 0 },
    { name: 'Problems', value: data?.total_problems || 0 },
    { name: 'Competitions', value: data?.total_competitions || 0 },
  ];
  const pieColors = ['#4F7CF3', '#7C8CFF', '#22c55e', '#f59e0b'];

  const stats = [
    { label:'Students',    value:data?.total_students,    icon:<RiGroupLine/>,    color:'bg-card-lavender', text:'text-[#4F7CF3]' },
    { label:'Tests',       value:data?.total_tests,       icon:<RiFileListLine/>, color:'bg-card-mint',     text:'text-emerald-600' },
    { label:'Problems',    value:data?.total_problems,    icon:<RiCodeLine/>,     color:'bg-card-pink',     text:'text-pink-600' },
    { label:'Competitions',value:data?.total_competitions,icon:<RiTrophyLine/>,   color:'bg-card-yellow',   text:'text-amber-600' },
    { label:'Active users (7d)', value:data?.active_users, icon:<RiBarChartLine/>, color:'bg-card-lavender', text:'text-[#4F7CF3]' },
    { label:'Average score', value:data?.average_score, icon:<RiFileListLine/>, color:'bg-card-mint', text:'text-emerald-600' },
  ];

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <div className="space-y-7">
        {/* Welcome Banner */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
          className="rounded-3xl overflow-hidden relative bg-gradient-to-br from-[#0b1020] via-[#101a3d] to-[#22306d]">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white/5"/>
            <div className="absolute bottom-0 right-24 w-48 h-48 rounded-full bg-blue-500/10"/>
          </div>
          <div className="relative z-10 p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-300 text-sm font-medium mb-1 inline-flex items-center gap-1"><WavingHandRoundedIcon sx={{ fontSize: 16 }}/> Welcome back</p>
              <h1 className="text-white text-2xl font-bold">{user?.name}</h1>
              <p className="text-blue-300/80 text-sm mt-0.5">{user?.designation} · {user?.department}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link to="/faculty/notifications" className="btn btn-sm bg-white text-primary hover:bg-surface-lighter shrink-0">
                <CampaignOutlinedIcon sx={{ fontSize: 16 }} /> Send Notification
              </Link>
              <Link to="/faculty/evaluation" className="btn btn-sm bg-white text-primary hover:bg-surface-lighter shrink-0">
                <RiBarChartLine className="w-4 h-4"/> View Analytics <RiArrowRightLine className="w-3.5 h-3.5"/>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s,i)=>(
            <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}
              className="bg-surface-card border border-theme rounded-2xl p-5 shadow-soft hover:shadow-lift transition-all">
              <div className={`w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center ${s.text} text-lg mb-3`}>{s.icon}</div>
              <p className={`text-2xl font-bold ${s.text}`} style={{fontFamily:'Plus Jakarta Sans'}}>{s.value??'—'}</p>
              <p className="text-xs text-secondary font-medium mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card p-5">
            <h2 className="section-title text-base mb-4">Submission Trend (Last 14 days)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="facultyTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F7CF3" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4F7CF3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-color))" />
                <XAxis dataKey="day" tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#4F7CF3" fill="url(#facultyTrend)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <h2 className="section-title text-base mb-4">Overview Split</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={82}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={pieColors[idx % pieColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK.map((a,i)=>(
              <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
                whileHover={{y:-4,boxShadow:'0 12px 32px rgba(79,124,243,0.12)'}}
                className={`${a.color} rounded-2xl p-5 cursor-pointer border border-transparent hover:border-blue-100 transition-all duration-300`}>
                <Link to={a.href} className="block">
                  <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center ${a.accent} text-lg mb-3`}>{a.icon}</div>
                  <p className={`font-bold text-primary text-sm`}>{a.label}</p>
                  <p className="text-xs text-secondary mt-0.5">{a.desc}</p>
                  <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${a.accent}`}>Go <RiArrowRightLine className="w-3.5 h-3.5"/></div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Submissions */}
        <div>
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="section-title">Recent Submissions</h2>
              <div className="inline-flex items-center gap-2 text-xs text-secondary">
                <FilterAltRoundedIcon sx={{ fontSize: 14 }} />
                Real-time filters
              </div>
            </div>

            <div className="card p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input className="input" placeholder="Search test" value={filters.test} onChange={(e) => { setFilters((p) => ({ ...p, test: e.target.value })); setPage(1); }} />
                <select className="input" value={filters.type} onChange={(e) => { setFilters((p) => ({ ...p, type: e.target.value })); setPage(1); }}>
                  <option value="all">All types</option>
                  <option value="practice">Practice</option>
                  <option value="competitor">Competition</option>
                </select>
                <input className="input" type="date" value={filters.startDate} onChange={(e) => { setFilters((p) => ({ ...p, startDate: e.target.value })); setPage(1); }} />
                <input className="input" type="date" value={filters.endDate} onChange={(e) => { setFilters((p) => ({ ...p, endDate: e.target.value })); setPage(1); }} />
                <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ startDate: '', endDate: '', test: '', type: 'all' }); setPage(1); }}>Reset</button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-lighter/70 border-b border-theme">
                    <tr>
                      {['Student','Test','Type','Status','Marks','Time'].map(h=><th key={h} className="tbl-th">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {submissionsLoading ? (
                      <tr><td colSpan={6} className="tbl-td text-secondary">Loading...</td></tr>
                    ) : recentSubmissions.length === 0 ? (
                      <tr><td colSpan={6} className="tbl-td text-secondary">No submissions found</td></tr>
                    ) : recentSubmissions.map((s,i)=>(
                      <tr key={i} className="tbl-row">
                        <td className="tbl-td">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-primary truncate">{s.student_name || 'Unknown student'}</span>
                            <span className="text-[11px] text-secondary font-mono">{s.student_reg_no || 'No reg no'}</span>
                            <span className="text-[10px] text-muted font-mono">UID {s.student_user_id || s.student_id}</span>
                          </div>
                        </td>
                        <td className="tbl-td text-secondary text-xs">{s.test_name || 'Coding Problem'}</td>
                        <td className="tbl-td"><span className="badge badge-purple capitalize">{s.exam_type}</span></td>
                        <td className="tbl-td">
                          <span className="badge" style={{ background: `${STATUS_COLORS[s.status] || '#f59e0b'}22`, color: STATUS_COLORS[s.status] || '#f59e0b' }}>
                            {(s.status || '').replace(/_/g,' ')}
                          </span>
                        </td>
                        <td className="tbl-td text-secondary text-xs">{s.marks ?? 0}</td>
                        <td className="tbl-td text-secondary text-xs inline-flex items-center gap-1"><AccessTimeRoundedIcon sx={{ fontSize: 12 }} />{s.submitted_at?new Date(s.submitted_at).toLocaleString():'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-theme flex items-center justify-between">
                <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={() => setPage((p) => Math.max(1, p-1))}>Prev</button>
                <span className="text-xs text-secondary">Page {page}</span>
                <button className="btn btn-ghost btn-sm" disabled={(submissionView?.items?.length || 0) < 10} onClick={() => setPage((p) => p+1)}>Next</button>
              </div>
            </div>
        </div>

        <div>
          <h2 className="section-title mb-4">Recent Activity</h2>
          <div className="card p-4 space-y-2">
            {(data?.recent_activity || []).length === 0 ? (
              <p className="text-sm text-secondary">No recent activity available.</p>
            ) : (data?.recent_activity || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-theme bg-surface p-3">
                <div>
                  <p className="text-sm text-primary font-medium">{item.label}</p>
                  <p className="text-xs text-secondary capitalize">{(item.status || '').replace(/_/g, ' ')}</p>
                </div>
                <span className="text-xs text-secondary">{item.time ? new Date(item.time).toLocaleString() : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
