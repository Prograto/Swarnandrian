import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import DashboardLayout from '../../components/common/DashboardLayout';
import { FACULTY_NAV } from './FacultyDashboard';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

const TOOLTIP_STYLE = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 };
const PIE_COLORS = ['#4F7CF3', '#7C8CFF', '#22c55e', '#f59e0b'];

export default function FacultyEvaluation() {
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    studentName: '',
    regNo: '',
    search: '',
    branch: 'all',
    examType: 'all',
    section: 'all',
    testId: '',
    test: '',
    minScore: '',
    maxScore: '',
  });

  const { data } = useQuery('faculty-eval', () => api.get('/faculty/evaluation/overview').then(r => r.data));
  const { data: results, isLoading } = useQuery(
    ['faculty-evaluation-results', page, filters],
    () => api.get('/faculty/evaluation/results', {
      params: {
        page,
        limit: 20,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        student: filters.search || undefined,
        student_name: filters.studentName || undefined,
        reg_no: filters.regNo || undefined,
        branch: filters.branch,
        exam_type: filters.examType,
        section: filters.section,
        test_id: filters.testId || undefined,
        test: filters.test || undefined,
        min_score: filters.minScore === '' ? undefined : Number(filters.minScore),
        max_score: filters.maxScore === '' ? undefined : Number(filters.maxScore),
      },
    }).then(r => r.data),
    { keepPreviousData: true }
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const test = params.get('test');
    const testId = params.get('test_id');
    const section = params.get('section');
    if (!test && !section && !testId) return;
    setFilters((prev) => ({
      ...prev,
      test: test || prev.test,
      testId: testId || prev.testId,
      section: section || prev.section,
    }));
    setPage(1);
  }, [location.search]);

  const statusData = [
    { name: 'Accepted',     count: data?.recent_submissions?.filter(s => s.status === 'accepted').length || 0 },
    { name: 'Wrong Answer', count: data?.recent_submissions?.filter(s => s.status === 'wrong_answer').length || 0 },
    { name: 'TLE',          count: data?.recent_submissions?.filter(s => s.status === 'tle').length || 0 },
    { name: 'CE',           count: data?.recent_submissions?.filter(s => s.status === 'compilation_error').length || 0 },
  ];

  const overviewPie = [
    { name: 'Students', value: data?.total_students || 0 },
    { name: 'Tests', value: data?.total_tests || 0 },
    { name: 'Problems', value: data?.total_problems || 0 },
    { name: 'Competitions', value: data?.total_competitions || 0 },
  ];

  const branches = useMemo(() => results?.branches || [], [results]);
  const sections = useMemo(() => results?.sections || [], [results]);
  const tests = useMemo(() => results?.tests || [], [results]);

  const exportResults = async (format) => {
    const res = await api.get('/faculty/evaluation/results/export', {
      params: {
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        student: filters.search || undefined,
        student_name: filters.studentName || undefined,
        reg_no: filters.regNo || undefined,
        branch: filters.branch,
        exam_type: filters.examType,
        section: filters.section,
        test_id: filters.testId || undefined,
        test: filters.test || undefined,
        min_score: filters.minScore === '' ? undefined : Number(filters.minScore),
        max_score: filters.maxScore === '' ? undefined : Number(filters.maxScore),
        format,
      },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation_results.${format === 'csv' ? 'csv' : 'xlsx'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="section-title">Evaluation Dashboard</h1>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => exportResults('xlsx')}><FileDownloadRoundedIcon sx={{ fontSize: 14 }} /> Export Excel</button>
            <button className="btn btn-secondary btn-sm" onClick={() => exportResults('csv')}><FileDownloadRoundedIcon sx={{ fontSize: 14 }} /> Export CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Students',    value: data?.total_students,   icon:<SchoolRoundedIcon sx={{ fontSize: 24 }} /> },
            { label:'Tests',       value: data?.total_tests,       icon:<QuizRoundedIcon sx={{ fontSize: 24 }} /> },
            { label:'Problems',    value: data?.total_problems,    icon:<CodeRoundedIcon sx={{ fontSize: 24 }} /> },
            { label:'Competitions',value: data?.total_competitions,icon:<EmojiEventsRoundedIcon sx={{ fontSize: 24 }} /> },
          ].map(s => (
            <div key={s.label} className="card p-5 text-center">
              <div className="text-2xl mb-2 inline-flex">{s.icon}</div>
              <p className="text-2xl font-display font-bold text-primary">{s.value ?? '—'}</p>
              <p className="text-xs text-secondary">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-display font-semibold mb-4 text-primary">Recent Submission Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="font-display font-semibold mb-4 text-primary">Platform Split</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={overviewPie} dataKey="value" nameKey="name" outerRadius={80} innerRadius={46}>
                  {overviewPie.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-primary font-semibold mb-3"><FilterAltRoundedIcon sx={{ fontSize: 16 }} /> Advanced Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
            <input className="input" placeholder="Search student/test" value={filters.search} onChange={(e) => { setFilters((p) => ({ ...p, search: e.target.value })); setPage(1); }} />
            <input className="input" placeholder="Student name" value={filters.studentName} onChange={(e) => { setFilters((p) => ({ ...p, studentName: e.target.value })); setPage(1); }} />
            <input className="input" placeholder="Register number" value={filters.regNo} onChange={(e) => { setFilters((p) => ({ ...p, regNo: e.target.value })); setPage(1); }} />
            <select className="input" value={filters.branch} onChange={(e) => { setFilters((p) => ({ ...p, branch: e.target.value })); setPage(1); }}>
              <option value="all">All branches</option>
              {branches.map((b) => <option key={b}>{b}</option>)}
            </select>
            <select className="input" value={filters.examType} onChange={(e) => { setFilters((p) => ({ ...p, examType: e.target.value })); setPage(1); }}>
              <option value="all">All exam types</option>
              <option value="practice">Practice</option>
              <option value="competitor">Competition</option>
            </select>
            <select className="input" value={filters.section} onChange={(e) => { setFilters((p) => ({ ...p, section: e.target.value })); setPage(1); }}>
              <option value="all">All sections</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" type="number" placeholder="Min score" value={filters.minScore} onChange={(e) => { setFilters((p) => ({ ...p, minScore: e.target.value })); setPage(1); }} />
            <input className="input" type="number" placeholder="Max score" value={filters.maxScore} onChange={(e) => { setFilters((p) => ({ ...p, maxScore: e.target.value })); setPage(1); }} />
            <input list="tests-list" className="input" placeholder="Specific test" value={filters.test} onChange={(e) => { setFilters((p) => ({ ...p, test: e.target.value })); setPage(1); }} />
            <datalist id="tests-list">{tests.map((t) => <option key={t} value={t} />)}</datalist>
            <input type="date" className="input" value={filters.startDate} onChange={(e) => { setFilters((p) => ({ ...p, startDate: e.target.value })); setPage(1); }} />
            <input type="date" className="input" value={filters.endDate} onChange={(e) => { setFilters((p) => ({ ...p, endDate: e.target.value })); setPage(1); }} />
          </div>
          {filters.testId && <p className="text-xs text-secondary mt-3">Showing exact results for selected test ID: {filters.testId}</p>}
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-lighter/70 border-b border-theme">
                <tr>
                  {['Student','Branch','Exam Type','Section','Test','Marks','Accuracy','Time Taken','Status','Submitted'].map((h) => <th key={h} className="tbl-th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="tbl-td text-secondary">Loading...</td></tr>
                ) : !(results?.items || []).length ? (
                  <tr><td colSpan={10} className="tbl-td text-secondary">No matching results.</td></tr>
                ) : (results.items || []).map((row) => (
                  <tr key={row.id} className="tbl-row">
                    <td className="tbl-td">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-primary truncate">{row.student_name}</span>
                        <span className="text-xs text-secondary font-mono">{row.student_reg_no || 'No reg no'}</span>
                        <span className="text-[10px] text-muted font-mono">UID {row.student_user_id || row.student_id}</span>
                      </div>
                    </td>
                    <td className="tbl-td text-secondary text-xs">{row.branch}</td>
                    <td className="tbl-td"><span className="badge badge-purple capitalize">{row.exam_type}</span></td>
                    <td className="tbl-td text-secondary text-xs">{row.section_name || row.section_id || '—'}</td>
                    <td className="tbl-td text-secondary text-xs">{row.test_name}</td>
                    <td className="tbl-td text-secondary text-xs">{row.marks}</td>
                    <td className="tbl-td text-secondary text-xs">{row.accuracy}%</td>
                    <td className="tbl-td text-secondary text-xs">{row.time_taken_ms} ms</td>
                    <td className="tbl-td"><span className="badge badge-mint">{(row.status || '').replace(/_/g, ' ')}</span></td>
                    <td className="tbl-td text-secondary text-xs inline-flex items-center gap-1"><AccessTimeRoundedIcon sx={{ fontSize: 12 }} />{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-theme flex items-center justify-between">
            <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={() => setPage((p) => Math.max(1, p-1))}>Prev</button>
            <span className="text-xs text-secondary">Page {page} • {results?.total || 0} records</span>
            <button className="btn btn-ghost btn-sm" disabled={(results?.items?.length || 0) < 20} onClick={() => setPage((p) => p+1)}>Next</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
