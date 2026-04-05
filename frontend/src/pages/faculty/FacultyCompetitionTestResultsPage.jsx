import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import DashboardLayout from '../../components/common/DashboardLayout';
import { FACULTY_NAV } from './FacultyDashboard';
import api from '../../utils/api';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

export default function FacultyCompetitionTestResultsPage() {
  const { competitionId, testId } = useParams();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    studentName: '',
    regNo: '',
    search: '',
    branch: 'all',
    minScore: '',
    maxScore: '',
  });

  const { data: results, isLoading } = useQuery(
    ['faculty-competition-test-results', competitionId, testId, page, filters],
    () => api.get(`/faculty/evaluation/competition/${competitionId}/test/${testId}/results`, {
      params: {
        page,
        limit: 20,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        student: filters.search || undefined,
        student_name: filters.studentName || undefined,
        reg_no: filters.regNo || undefined,
        branch: filters.branch,
        min_score: filters.minScore === '' ? undefined : Number(filters.minScore),
        max_score: filters.maxScore === '' ? undefined : Number(filters.maxScore),
      },
    }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const branches = useMemo(() => {
    const all = (results?.items || []).map((x) => x.branch).filter(Boolean);
    return Array.from(new Set(all)).sort();
  }, [results]);

  const exportResults = async (format) => {
    const res = await api.get(`/faculty/evaluation/competition/${competitionId}/test/${testId}/results/export`, {
      params: {
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        student: filters.search || undefined,
        student_name: filters.studentName || undefined,
        reg_no: filters.regNo || undefined,
        branch: filters.branch,
        min_score: filters.minScore === '' ? undefined : Number(filters.minScore),
        max_score: filters.maxScore === '' ? undefined : Number(filters.maxScore),
        format,
      },
      responseType: 'blob',
    });

    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competition_test_results_${testId}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="section-title">Competition Test Results</h1>
            <p className="text-sm text-secondary mt-1">
              {results?.test?.competition_name || competitionId} • {results?.test?.name || testId}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => exportResults('xlsx')}><FileDownloadRoundedIcon sx={{ fontSize: 14 }} /> Export Excel</button>
            <button className="btn btn-secondary btn-sm" onClick={() => exportResults('csv')}><FileDownloadRoundedIcon sx={{ fontSize: 14 }} /> Export CSV</button>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-primary font-semibold mb-3"><FilterAltRoundedIcon sx={{ fontSize: 16 }} /> Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <input className="input" placeholder="Search student" value={filters.search} onChange={(e) => { setFilters((p) => ({ ...p, search: e.target.value })); setPage(1); }} />
            <input className="input" placeholder="Student name" value={filters.studentName} onChange={(e) => { setFilters((p) => ({ ...p, studentName: e.target.value })); setPage(1); }} />
            <input className="input" placeholder="Register number" value={filters.regNo} onChange={(e) => { setFilters((p) => ({ ...p, regNo: e.target.value })); setPage(1); }} />
            <select className="input" value={filters.branch} onChange={(e) => { setFilters((p) => ({ ...p, branch: e.target.value })); setPage(1); }}>
              <option value="all">All branches</option>
              {branches.map((b) => <option key={b}>{b}</option>)}
            </select>
            <input className="input" type="number" placeholder="Min score" value={filters.minScore} onChange={(e) => { setFilters((p) => ({ ...p, minScore: e.target.value })); setPage(1); }} />
            <input className="input" type="number" placeholder="Max score" value={filters.maxScore} onChange={(e) => { setFilters((p) => ({ ...p, maxScore: e.target.value })); setPage(1); }} />
            <input type="date" className="input" value={filters.startDate} onChange={(e) => { setFilters((p) => ({ ...p, startDate: e.target.value })); setPage(1); }} />
            <input type="date" className="input" value={filters.endDate} onChange={(e) => { setFilters((p) => ({ ...p, endDate: e.target.value })); setPage(1); }} />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-lighter/70 border-b border-theme">
                <tr>
                  {['Student', 'Branch', 'Exam Type', 'Score', 'Accuracy', 'Time Taken', 'Status', 'Submitted'].map((h) => <th key={h} className="tbl-th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="tbl-td text-secondary">Loading...</td></tr>
                ) : !(results?.items || []).length ? (
                  <tr><td colSpan={8} className="tbl-td text-secondary">No results found for this competition test.</td></tr>
                ) : (results.items || []).map((row) => (
                  <tr key={row.id} className="tbl-row">
                    <td className="tbl-td">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-primary truncate">{row.student_name}</span>
                        <span className="text-xs text-secondary font-mono">{row.student_reg_no || 'No reg no'}</span>
                      </div>
                    </td>
                    <td className="tbl-td text-secondary text-xs">{row.branch}</td>
                    <td className="tbl-td"><span className="badge badge-purple capitalize">{row.exam_type}</span></td>
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
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span className="text-xs text-secondary">Page {page} • {results?.total || 0} records</span>
            <button className="btn btn-ghost btn-sm" disabled={(results?.items?.length || 0) < 20} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
