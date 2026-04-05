import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/common/DashboardLayout';
import { FACULTY_NAV } from './FacultyDashboard';
import api from '../../utils/api';

export default function FacultyCompetitionTestsPage() {
  const { competitionId } = useParams();
  const qc = useQueryClient();

  const { data: competition } = useQuery(['competition', competitionId], () =>
    api.get(`/competitions/${competitionId}`).then((r) => r.data)
  );
  const { data: tests = [], isLoading } = useQuery(['competition-tests', competitionId], () =>
    api.get(`/competitions/${competitionId}/tests`).then((r) => r.data)
  );

  const deleteTest = useMutation(
    (testId) => api.delete(`/competitions/${competitionId}/tests/${testId}`),
    {
      onSuccess: () => {
        qc.invalidateQueries(['competition-tests', competitionId]);
        toast.success('Test deleted');
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to delete test'),
    }
  );

  const toggleTest = useMutation(
    (testId) => api.patch(`/competitions/${competitionId}/tests/${testId}/toggle`),
    {
      onSuccess: () => {
        qc.invalidateQueries(['competition-tests', competitionId]);
        toast.success('Test status updated');
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update test status'),
    }
  );

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="section-title">Competition Tests</h1>
            <p className="text-sm text-secondary mt-1">{competition?.name || competitionId}</p>
          </div>
          <Link to="/faculty/competitions" className="btn btn-secondary btn-sm">Back</Link>
        </div>

        <div className="card p-4">
          <div className="text-sm text-secondary">Hierarchy: Competition {'->'} Tests {'->'} Questions {'->'} Results</div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="card p-4 text-secondary text-sm">Loading tests...</div>
          ) : tests.length === 0 ? (
            <div className="card p-6 text-secondary text-sm">No tests found in this competition.</div>
          ) : tests.map((t) => (
            <div key={t.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-primary truncate">{t.name}</p>
                <p className="text-xs text-secondary capitalize">{t.test_type} • {t.time_limit_minutes} min</p>
                <p className="text-[11px] text-secondary mt-1">{t.is_active === false ? 'Disabled' : 'Enabled'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/faculty/competitions/${competitionId}/tests/${t.id}/edit`} className="btn btn-secondary btn-xs">Open Test</Link>
                <Link to={`/faculty/competitions/${competitionId}/tests/${t.id}/results`} className="btn btn-secondary btn-xs">Results</Link>
                <button className="btn btn-secondary btn-xs" onClick={() => toggleTest.mutate(t.id)}>{t.is_active === false ? 'Enable' : 'Disable'}</button>
                <button className="btn btn-danger btn-xs" onClick={() => {
                  if (window.confirm('Delete this test from competition?')) {
                    deleteTest.mutate(t.id);
                  }
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
