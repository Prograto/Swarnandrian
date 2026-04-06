import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../utils/api';
import PaginationControls from '../../components/student/PaginationControls';

const PAGE_SIZE = 8;

function getAttemptCap(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function StudentCompetitionTests() {
  const { competitionId } = useParams();
  const [accessCode, setAccessCode] = useState('');
  const [submittedCode, setSubmittedCode] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: competition } = useQuery(
    ['student-competition', competitionId],
    () => api.get(`/competitions/${competitionId}`).then((r) => r.data),
    { staleTime: 60000 }
  );

  const { data: competitionHistory = [] } = useQuery(
    ['student-competition-history', competitionId],
    () => api.get('/submissions/competitions/history', { params: { competition_id: competitionId, limit: 500 } }).then((r) => r.data?.submissions || []),
    { staleTime: 60000 }
  );

  const attemptMap = useMemo(() => {
    const grouped = new Map();
    competitionHistory.forEach((submission) => {
      if (submission.competition_id !== competitionId) return;
      const key = submission.test_id;
      if (!key) return;
      const current = grouped.get(key) || { attempts: 0, bestScore: 0, latestScore: 0, latestAt: null };
      const score = Number(submission.score || 0);
      current.attempts += 1;
      current.bestScore = Math.max(current.bestScore, score);
      current.latestScore = score;
      if (!current.latestAt || new Date(submission.submitted_at) > new Date(current.latestAt)) {
        current.latestAt = submission.submitted_at;
      }
      grouped.set(key, current);
    });
    return grouped;
  }, [competitionHistory, competitionId]);

  const testsQuery = useQuery(
    ['student-competition-tests', competitionId, submittedCode, page, search],
    () =>
      api
        .get(`/competitions/${competitionId}/tests`, {
          params: {
            paginate: true,
            access_code: submittedCode || undefined,
            page,
            limit: PAGE_SIZE,
            search,
          },
        })
        .then((r) => r.data),
    { enabled: !!competitionId, retry: false }
  );

  const onLoadTests = () => {
    setPage(1);
    setSubmittedCode(accessCode.trim());
  };

  const items = testsQuery.data?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="section-title">{competition?.name || 'Competition'}</h1>
          <p className="text-sm text-secondary mt-1">Enter an access code if this competition is locked. Previously attempted tests stay available for retakes.</p>
        </div>
        <Link to="/student/competitions" className="btn-secondary text-sm">Back</Link>
      </div>

      <div className="card p-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Enter competition access code"
          className="input"
        />
        <button type="button" onClick={onLoadTests} className="btn-primary text-sm">Load Tests</button>
      </div>

      <div className="space-y-4">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search tests"
          className="input"
        />

        {testsQuery.isLoading ? (
          <div className="card p-8 text-center text-secondary">Loading tests...</div>
        ) : testsQuery.isError ? (
          <div className="card p-8 text-center text-red-500">{testsQuery.error?.response?.data?.detail || 'Unable to load tests'}</div>
        ) : items.length === 0 ? (
          <div className="card p-8 text-center text-secondary">No tests available in this competition.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((test) => {
              const canWrite = test.test_type === 'aptitude' || test.test_type === 'technical';
              const attempt = attemptMap.get(test.id);
              const maxAttempts = getAttemptCap(competition?.max_attempts);
              const attemptsRemaining = maxAttempts === null ? null : Math.max(0, maxAttempts - (attempt?.attempts || 0));
              const isLocked = canWrite && attemptsRemaining === 0;
              const writtenCount = attempt?.attempts || 0;
              const actionLabel = attempt ? 'Retake Test' : 'Write Test';
              return (
                <div key={test.id} className="rounded-3xl border border-theme bg-surface-card overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-[#edf2ff] to-[#f8faff]">
                    {test.banner_url ? <img src={test.banner_url} alt={test.name} className="h-full w-full object-cover" loading="lazy" /> : null}
                  </div>
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-primary line-clamp-1">{test.name}</h3>
                    <p className="text-xs text-secondary line-clamp-2">{test.description || 'Competition test'}</p>
                    {canWrite ? (
                      <div className={`rounded-2xl px-3 py-2 text-xs ${attemptsRemaining === null ? 'border border-theme bg-surface text-secondary' : isLocked ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        Written {writtenCount} time{writtenCount === 1 ? '' : 's'} · {attemptsRemaining === null
                          ? 'Unlimited attempts'
                          : `${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left`}
                      </div>
                    ) : null}
                    {attempt ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Best score {attempt.bestScore}
                      </div>
                    ) : null}
                    <div className="text-xs text-secondary">Type: {test.test_type} · {test.time_limit_minutes} min</div>
                    {canWrite ? (
                      isLocked ? (
                        <div className="btn-primary text-xs w-full justify-center opacity-50 cursor-not-allowed select-none pointer-events-none">
                          Attempts Exhausted
                        </div>
                      ) : (
                        <Link to={`/student/competitions/${competitionId}/tests/${test.id}`} className="btn-primary text-xs w-full justify-center">{actionLabel}</Link>
                      )
                    ) : (
                      <div className="rounded-xl border border-dashed border-theme px-3 py-2 text-xs text-secondary text-center">
                        Coding competition tests are currently view-only in this portal.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <PaginationControls
          page={page}
          total={testsQuery.data?.total || 0}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
