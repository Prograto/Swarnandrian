import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

function CountdownTimer({ endTime, onExpire }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(endTime) - Date.now());
      setRemaining(diff);
      if (diff === 0) onExpire();
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [endTime, onExpire]);

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const isLow = remaining < 300000;

  return (
    <div className={`font-mono text-xl font-bold ${isLow ? 'text-red-400 animate-pulse' : 'text-white'}`}>
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </div>
  );
}

export default function TestInterface() {
  const { id: testId } = useParams();
  const location = useLocation();
  const navigate   = useNavigate();
  const sectionTypeHint = new URLSearchParams(location.search).get('section_type');
  const [answers, setAnswers]     = useState({});
  const [currentQ, setCurrentQ]   = useState(0);
  const [tabWarnings, setTabWarn] = useState(0);
  const [showWarning, setShowWarn]= useState(false);
  const [fullscreenLost, setFSLost] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [endTime, setEndTime]     = useState(null);
  const startedAtRef = useRef(Date.now());
  const timerRef = useRef(null);
  const answersRef = useRef({});
  const submittedRef = useRef(false);
  const autoSubmitLockRef = useRef(false);
  const violationCountRef = useRef(0);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const fetchTest = useCallback(async () => {
    const sectionTypes = sectionTypeHint ? [sectionTypeHint] : ['aptitude', 'technical'];

    for (const sectionType of sectionTypes) {
      try {
        const response = await api.get(`/${sectionType}/tests/${testId}`);
        return { ...response.data, section_type: response.data.section_type || sectionType };
      } catch (error) {
        if (error?.response?.status !== 404 || sectionType === sectionTypes[sectionTypes.length - 1]) {
          throw error;
        }
      }
    }

    throw new Error('Test not found');
  }, [sectionTypeHint, testId]);

  const { data: test, isLoading, isFetching: isTestFetching, refetch: refetchTest } = useQuery(
    ['test', testId, sectionTypeHint || 'auto'],
    fetchTest,
    {
      onSuccess: (d) => {
        if (d.time_limit_minutes) {
          const end = new Date(Date.now() + d.time_limit_minutes * 60000);
          setEndTime(end.toISOString());
        }
      },
    }
  );

  const attemptsRemaining = test?.attempts_remaining;
  const hasAttemptLimit = attemptsRemaining !== null && attemptsRemaining !== undefined;
  const attemptLimitReached = hasAttemptLimit && Number(attemptsRemaining) <= 0;
  const maxViolations = Math.max(1, Number(test?.max_violations) || 3);

  const submitMut = useMutation(
    ({ currentAnswers, timeTakenMs }) => api.post(`/submissions/aptitude`, currentAnswers, { params: { test_id: testId, time_taken_ms: timeTakenMs } }),
    {
      onSuccess: (data) => {
        submittedRef.current = true;
        exitFullscreen();
        setSubmitted(true);
        toast.success(`Test submitted! Score: ${data.data.score}`);
      },
      onError: (error) => {
        if (error?.response?.status === 429) {
          void refetchTest();
          exitFullscreen();
          toast.error('You have used all allowed attempts for this test.');
          return;
        }

        toast.error(getApiErrorMessage(error, 'Submission failed'));
      },
      onSettled: () => {
        autoSubmitLockRef.current = false;
      },
    }
  );

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    submittedRef.current = submitted;
    if (!submitted) {
      autoSubmitLockRef.current = false;
    }
  }, [submitted]);

  useEffect(() => {
    if (!submitted) return;
    exitFullscreen();
  }, [exitFullscreen, submitted]);

  useEffect(() => {
    if (attemptLimitReached) {
      exitFullscreen();
    }
  }, [attemptLimitReached, exitFullscreen]);

  const handleAutoSubmit = useCallback(async () => {
    if (attemptLimitReached || submittedRef.current || autoSubmitLockRef.current) return;
    autoSubmitLockRef.current = true;

    if (hasAttemptLimit) {
      try {
        const latestTest = await refetchTest();
        const latestAttemptsRemaining = latestTest.data?.attempts_remaining;
        const latestAttemptLimitReached = latestAttemptsRemaining !== null && latestAttemptsRemaining !== undefined && Number(latestAttemptsRemaining) <= 0;

        if (latestAttemptLimitReached) {
          exitFullscreen();
          toast.error('You have used all allowed attempts for this test.');
          autoSubmitLockRef.current = false;
          return;
        }
      } catch (error) {
        autoSubmitLockRef.current = false;
        toast.error(getApiErrorMessage(error, 'Unable to verify remaining attempts'));
        return;
      }
    }

    submitMut.mutate({
      currentAnswers: answersRef.current,
      timeTakenMs: Math.max(0, Date.now() - startedAtRef.current),
    });
  }, [attemptLimitReached, exitFullscreen, hasAttemptLimit, refetchTest, submitMut]);

  const registerViolation = useCallback((reason) => {
    const next = violationCountRef.current + 1;
    violationCountRef.current = next;
    setTabWarn(next);

    if (next >= maxViolations) {
      setShowWarn(false);
      toast.error(`Maximum ${reason.toLowerCase()} violations reached (${next}/${maxViolations}). Auto-submitting!`);
      void handleAutoSubmit();
    } else {
      setShowWarn(true);
      toast.error(`${reason} detected. Warning ${next}/${maxViolations}`);
    }

    return next;
  }, [handleAutoSubmit, maxViolations]);

  // ── Anti-cheat: Fullscreen enforcement ──────────────────────────
  useEffect(() => {
    const requestFS = () => {
      if (submittedRef.current || attemptLimitReached) return;
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    requestFS();

    const onFSChange = () => {
      if (submittedRef.current || attemptLimitReached) {
        setFSLost(false);
        return;
      }
      if (!document.fullscreenElement) {
        setFSLost(true);
        const next = registerViolation('Fullscreen exit');
        if (next < maxViolations) {
          setTimeout(requestFS, 1000);
        }
      } else {
        setFSLost(false);
      }
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      exitFullscreen();
    };
  }, [attemptLimitReached, exitFullscreen]);

  // ── Anti-cheat: Tab switch detection ───────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !submitted) {
        registerViolation('Tab switch');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [registerViolation, submitted]);

  // ── Anti-cheat: Right click + copy disabled ──────────────────────
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
    };
  }, []);

  const questions = test?.questions || [];
  const q = questions[currentQ];

  const handleAnswer = (qId, value, type) => {
    setAnswers(prev => {
      if (type === 'msq') {
        const current = prev[qId] || [];
        return {
          ...prev,
          [qId]: current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value],
        };
      }
      return { ...prev, [qId]: value };
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-secondary animate-pulse">Loading test…</p>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-surface p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-secondary uppercase tracking-wider">Submission complete</p>
              <h2 className="text-2xl font-display font-bold text-primary mt-1">Test Results</h2>
              <p className="text-secondary mt-2">Your answers have been recorded and scored.</p>
            </div>
            <p className="text-5xl inline-flex text-emerald-500"><CheckCircleRoundedIcon sx={{ fontSize: 42 }} /></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <div className="rounded-2xl border border-theme bg-surface p-4">
              <p className="text-xs text-secondary">Score</p>
              <p className="text-3xl font-bold text-primary mt-1">{submitMut.data?.data?.score ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-theme bg-surface p-4">
              <p className="text-xs text-secondary">Answered</p>
              <p className="text-3xl font-bold text-primary mt-1">{Object.keys(answers).length}/{questions.length}</p>
            </div>
            <div className="rounded-2xl border border-theme bg-surface p-4">
              <p className="text-xs text-secondary">Time Taken</p>
              <p className="text-3xl font-bold text-primary mt-1">{Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))}s</p>
            </div>
          </div>

          {submitMut.data?.data?.detail?.length ? (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-primary">Answer breakdown</h3>
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-theme divide-y divide-theme bg-surface">
                {submitMut.data.data.detail.map((item, idx) => (
                  <div key={item.question_id || idx} className="flex items-center justify-between gap-4 p-4 text-sm">
                    <div>
                      <p className="font-medium text-primary">Question {idx + 1}</p>
                      <p className="text-xs text-secondary">{item.correct ? 'Correct' : 'Incorrect'}</p>
                    </div>
                    <span className={`badge ${item.correct ? 'badge-mint' : 'badge-medium'}`}>{item.marks_earned >= 0 ? `+${item.marks_earned}` : item.marks_earned}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 mt-6">
            <button onClick={() => navigate('/student')} className="btn-secondary">Back to Dashboard</button>
          </div>
        </motion.div>
      </div>
    </div>
  );

  if (attemptLimitReached) return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-2xl p-6 sm:p-8 space-y-5 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 mx-auto">
          Attempts exhausted
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary">{test?.name}</h1>
          <p className="text-secondary">You have used all allowed attempts for this test. Writing is disabled.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-theme bg-surface-lighter/40 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-secondary">Attempts used</p>
            <p className="mt-2 text-2xl font-bold text-primary">{test?.attempts_used ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-theme bg-surface-lighter/40 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-secondary">Allowed attempts</p>
            <p className="mt-2 text-2xl font-bold text-primary">{test?.max_attempts ?? 'Unlimited'}</p>
          </div>
          <div className="rounded-2xl border border-theme bg-surface-lighter/40 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-secondary">Attempts left</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">0</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary text-sm">Go Back</button>
          <button type="button" onClick={() => navigate('/student')} className="btn-primary text-sm">Student Dashboard</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col select-none">
      {/* ── Warning overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          >
            <div className="card p-8 max-w-sm text-center border-red-500/40">
              <p className="text-4xl mb-3 inline-flex text-red-500"><WarningAmberRoundedIcon sx={{ fontSize: 34 }} /></p>
              <h3 className="font-display font-bold text-red-400 text-xl">Violation Detected!</h3>
              <p className="text-secondary mt-2 text-sm">Violations: {tabWarnings}/{maxViolations}. After {maxViolations}, test auto-submits.</p>
              <button onClick={() => setShowWarn(false)} className="btn-primary mt-4 w-full">Resume Test</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ───────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-theme bg-surface-light sticky top-0 z-10">
        <div>
          <p className="font-display font-semibold text-primary">{test?.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-secondary">{questions.length} questions</span>
            {hasAttemptLimit && (
              <span className="text-xs text-secondary">
                {Math.max(0, Number(attemptsRemaining) || 0)} attempt{Math.max(0, Number(attemptsRemaining) || 0) === 1 ? '' : 's'} left
              </span>
            )}
            {tabWarnings > 0 && (
              <span className="text-xs text-red-500 inline-flex items-center gap-1"><WarningAmberRoundedIcon sx={{ fontSize: 12 }} /> {tabWarnings}/{maxViolations} violations</span>
            )}
            {fullscreenLost && <span className="text-xs text-amber-500 animate-pulse inline-flex items-center gap-1"><WarningAmberRoundedIcon sx={{ fontSize: 12 }} /> Fullscreen required</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {endTime && <CountdownTimer endTime={endTime} onExpire={handleAutoSubmit} />}
          <button
            onClick={() => {
              if (window.confirm('Submit test now?')) {
                void handleAutoSubmit();
              }
            }}
            disabled={submitMut.isLoading || attemptLimitReached || (hasAttemptLimit && isTestFetching)}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {attemptLimitReached ? 'Attempt Limit Reached' : submitMut.isLoading ? 'Submitting...' : hasAttemptLimit && isTestFetching ? 'Checking attempts...' : 'Submit Test'}
          </button>
        </div>
      </header>

      {attemptLimitReached && (
        <div className="px-4 sm:px-6 pt-4">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You have used all allowed attempts for this test. Submission is disabled.
          </div>
        </div>
      )}

      {/* ── Main Layout ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Question Panel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {q && (
            <motion.div key={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-secondary">Q{currentQ + 1}/{questions.length}</span>
                <span className={`badge-${q.difficulty?.toLowerCase()}`}>{q.difficulty}</span>
                <span className="badge bg-surface-lighter text-secondary uppercase text-xs">{q.question_type}</span>
                <span className="badge bg-amber-500/10 text-amber-600 text-xs">{q.marks}pts</span>
              </div>

              <p className="text-primary leading-relaxed">{q.question_text}</p>

              {q.image_url && (
                <img src={q.image_url} alt="question" className="rounded-xl max-h-64 object-contain" loading="lazy" />
              )}

              {/* MCQ Options */}
              {q.question_type === 'mcq' && q.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(q.id, i, 'mcq')}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    answers[q.id] === i
                      ? 'border-primary-500/60 bg-primary-500/15 text-white'
                      : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/3'
                  }`}
                >
                  <span className="font-medium text-slate-500 mr-3">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}

              {/* MSQ Options */}
              {q.question_type === 'msq' && q.options?.map((opt, i) => {
                const selected = (answers[q.id] || []).includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(q.id, i, 'msq')}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                      selected
                        ? 'border-primary-500/60 bg-primary-500/15 text-white'
                        : 'border-theme text-secondary hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? 'border-primary-500 bg-primary-500' : 'border-white/30'}`}>
                        {selected && <CheckRoundedIcon sx={{ fontSize: 12 }} className="text-white" />}
                    </div>
                    {opt}
                  </button>
                );
              })}

              {/* NAT / Fill */}
              {(q.question_type === 'nat' || q.question_type === 'fill') && (
                <input
                  className="input"
                  placeholder={q.question_type === 'nat' ? 'Enter numerical answer…' : 'Fill in the blank…'}
                  value={answers[q.id] || ''}
                  onChange={e => handleAnswer(q.id, e.target.value, q.question_type)}
                />
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                  disabled={currentQ === 0}
                  className="btn-secondary text-sm disabled:opacity-30"
                ><ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Previous</button>
                <span className="text-xs text-secondary">
                  {Object.keys(answers).length}/{questions.length} answered
                </span>
                <button
                  onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
                  disabled={currentQ === questions.length - 1}
                  className="btn-primary text-sm disabled:opacity-30"
                >Next <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Question Grid Sidebar */}
        <aside className="w-full lg:w-56 lg:border-l border-theme bg-surface-light p-4 overflow-y-auto">
          <p className="text-xs text-secondary font-medium uppercase tracking-wider mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((_, i) => {
              const answered = answers[questions[i]?.id] !== undefined;
              const isCurrent = i === currentQ;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                    isCurrent  ? 'bg-primary-600 text-white' :
                    answered   ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-surface text-secondary hover:bg-surface-lighter'
                  }`}
                >{i + 1}</button>
              );
            })}
          </div>
          <div className="mt-5 space-y-2 text-xs text-secondary">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/30" /> Answered</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-surface" /> Not answered</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-primary-600" /> Current</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
