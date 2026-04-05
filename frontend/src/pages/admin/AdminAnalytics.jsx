import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6'];

function StatCard({ label, value, icon: Icon, color, delta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-card rounded-2xl border border-theme p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-secondary uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-primary mt-1">{value ?? '—'}</p>
          {delta !== undefined && (
            <p className={`text-xs mt-1 font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {delta >= 0 ? '+' : ''}{delta} this month
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon sx={{ fontSize: 22 }} />
        </div>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-theme rounded-xl shadow-xl px-3 py-2 text-xs">
      <p className="font-semibold text-primary mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function AdminAnalytics() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: 'all', department: 'all', search: '', startDate: '', endDate: '' });
  const [loginData, setLoginData] = useState(null);
  const [loginLoading, setLoginLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoginLoading(true);
    api.get('/admin/login-history', { params: { ...filters, page, limit: 12 } })
      .then(r => setLoginData(r.data))
      .catch(() => toast.error('Failed to load login history'))
      .finally(() => setLoginLoading(false));
  }, [filters, page]);

  const exportLogins = async () => {
    try {
      const res = await api.get('/export/login-history', { params: filters, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'login_history.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const deptData = (data?.department_breakdown || []).map(d => ({
    name: d._id || 'Unknown',
    count: d.count,
  }));

  const loginTrend = (loginData?.daily_breakdown || []).map(item => ({
    day: item._id,
    logins: item.count,
  }));

  const roleBreakdown = (loginData?.role_breakdown || []).map(item => ({
    name: item._id,
    value: item.count,
  }));

  const totalLogins = loginData?.total || data?.total_logins || 0;
  const recentRows = loginData?.items || [];
  const summaryCards = useMemo(() => ([
    { label: 'Total logins', value: totalLogins, icon: LoginRoundedIcon, color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
    { label: 'Unique users', value: loginData?.unique_users || 0, icon: PeopleAltOutlinedIcon, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    { label: 'Active competitions', value: data?.active_competitions, icon: EmojiEventsOutlinedIcon, color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
    { label: 'Total submissions', value: data?.total_submissions, icon: AssignmentOutlinedIcon, color: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' },
  ]), [data, loginData, totalLogins]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin" className="inline-flex items-center gap-2 rounded-xl border border-theme bg-surface px-3 py-2 text-sm text-primary hover:bg-surface-lighter transition-colors">
            <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
            Back to Admin
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-secondary">
              <Link to="/admin" className="hover:text-primary transition-colors">Home</Link>
              <span>/</span>
              <span className="text-primary font-semibold">Analytics</span>
            </div>
            <h1 className="text-2xl font-bold text-primary mt-1">Platform Analytics</h1>
            <p className="text-sm text-secondary mt-0.5">Real usage, login activity, and exportable audit records</p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportLogins}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:brightness-110 text-white text-sm font-medium transition-colors"
        >
          <DownloadOutlinedIcon sx={{ fontSize: 16 }} />
          Export login data
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon, color }) => (
          <StatCard key={label} label={label} value={value} icon={icon} color={color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Login trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-surface-card border border-theme rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-primary mb-4">Login trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={loginTrend}>
              <defs>
                <linearGradient id="gStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-color))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(var(--text-secondary))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--text-secondary))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="logins" name="Logins" stroke="#6366f1" fill="url(#gStudents)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Login role pie */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-surface-card border border-theme rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-primary mb-4">Logins by role</h2>
          {roleBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-secondary text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roleBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="name"
                >
                  {roleBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Department and logins */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface-card border border-theme rounded-2xl p-5"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-primary">Advanced login filters</h2>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <FilterAltRoundedIcon sx={{ fontSize: 16 }} />
            {loginLoading ? 'Refreshing...' : `${loginData?.total || 0} matched records`}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mb-5">
          <div className="relative md:col-span-2">
            <SearchRoundedIcon sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              className="input pl-9"
              placeholder="Search name, ID, or user code"
              value={filters.search}
              onChange={(e) => { setFilters((prev) => ({ ...prev, search: e.target.value })); setPage(1); }}
            />
          </div>
          <select className="input" value={filters.role} onChange={(e) => { setFilters((prev) => ({ ...prev, role: e.target.value })); setPage(1); }}>
            <option value="all">All roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>
          <select className="input" value={filters.department} onChange={(e) => { setFilters((prev) => ({ ...prev, department: e.target.value })); setPage(1); }}>
            <option value="all">All departments</option>
            {deptData.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
          <div>
            <input
              className="input"
              type="date"
              value={filters.startDate}
              onChange={(e) => { setFilters((prev) => ({ ...prev, startDate: e.target.value })); setPage(1); }}
            />
          </div>
          <div>
            <input
              className="input"
              type="date"
              value={filters.endDate}
              onChange={(e) => { setFilters((prev) => ({ ...prev, endDate: e.target.value })); setPage(1); }}
            />
          </div>
          <button
            type="button"
            onClick={() => { setFilters({ role: 'all', department: 'all', search: '', startDate: '', endDate: '' }); setPage(1); }}
            className="rounded-xl border border-theme bg-surface px-3 py-2 text-sm text-secondary hover:bg-surface-lighter transition-colors md:col-span-2 xl:col-span-1"
          >
            Reset filters
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-theme">
          <table className="w-full">
            <thead className="bg-surface-lighter/70">
              <tr>
                {['User','Role','Department','Login Time','Status'].map((heading) => (
                  <th key={heading} className="tbl-th">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loginLoading ? (
                <tr><td colSpan={5} className="py-10 text-center text-secondary">Loading login records...</td></tr>
              ) : recentRows.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-secondary">No login history matches the current filters.</td></tr>
              ) : recentRows.map((row) => (
                <tr key={row.id} className="tbl-row">
                  <td className="tbl-td">
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary">{row.user_name || 'Unknown user'}</span>
                      <span className="text-xs text-secondary">{row.identifier || row.user_id}</span>
                    </div>
                  </td>
                  <td className="tbl-td capitalize text-secondary">{row.role}</td>
                  <td className="tbl-td text-secondary">{row.department || 'Unknown'}</td>
                  <td className="tbl-td text-secondary">
                    <div className="inline-flex items-center gap-1.5">
                      <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
                      {row.login_at ? new Date(row.login_at).toLocaleString() : '—'}
                    </div>
                  </td>
                  <td className="tbl-td">
                    <span className={`badge ${row.is_active ? 'badge-mint' : 'bg-red-100 text-red-600'}`}>
                      {row.is_active ? 'Active account' : 'Disabled account'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="text-xs text-secondary inline-flex items-center gap-2">
            <EventAvailableRoundedIcon sx={{ fontSize: 16 }} />
            {loginData?.total || 0} total filtered logins
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn btn-ghost btn-sm disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-sm text-secondary">Page {page}</span>
            <button
              type="button"
              disabled={!loginData?.items?.length || loginData.items.length < 12}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-ghost btn-sm disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active competitions', value: data?.active_competitions ?? 0, icon: EmojiEventsOutlinedIcon, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
          { label: 'Total tests', value: data?.total_tests ?? 0, icon: AssignmentOutlinedIcon, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
          { label: 'Problems created', value: data?.total_problems ?? 0, icon: CodeOutlinedIcon, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon sx={{ fontSize: 24 }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
