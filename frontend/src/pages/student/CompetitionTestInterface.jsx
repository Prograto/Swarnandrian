import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export default function CompetitionTestInterface() {
  const { competitionId, testId } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [fullscreenLost, setFullscreenLost] = useState(false);
  const startedAtRef = useRef(Date.now());
  const submitLockRef = useRef(false);
  const submittedRef = useRef(false);
  const violationCountRef = useRef(0);

  const requestFullscreen = useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const { data: test, isLoading, isFetching: isTestFetching, refetch: refetchTest } = useQuery(
    ['competition-attempt', competitionId, testId],
    () => api.get(`/competitions/${competitionId}/tests/${testId}/attempt`).then((r) => r.data)
  );

  const attemptsRemaining = test?.attempts_remaining;
  const hasAttemptLimit = attemptsRemaining !== null && attemptsRemaining !== undefined;
  const attemptLimitReached = hasAttemptLimit && Number(attemptsRemaining) <= 0;
  const maxViolations = Math.max(1, Number(test?.max_violations) || 3);

  const submitMutation = useMutation(
    () => api.post(`/competitions/${competitionId}/tests/${testId}/submit`, answers, { params: { time_taken_ms: Date.now() - startedAtRef.current } }),
    {
      onSuccess: (response) => {
        exitFullscreen();
        submittedRef.current = true;
        submitLockRef.current = false;
        setSubmitted(true);
        setScore(response.data?.score || 0);
        toast.success('Submitted successfully');
      },
      onError: (error) => {
        if (error?.response?.status === 429) {
          void refetchTest();
          exitFullscreen();
          toast.error('You have used all allowed attempts for this competition test.');
          submitLockRef.current = false;
          return;
        }

        submitLockRef.current = false;
        toast.error(getApiErrorMessage(error, 'Submission failed'));
      },
      onSettled: () => {
        submitLockRef.current = false;
      },
    }
  );

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    requestFullscreen();

    return () => {
      exitFullscreen();
    };
  }, [exitFullscreen, requestFullscreen]);

  useEffect(() => {
    if (!submitted) return;
    exitFullscreen();
  }, [exitFullscreen, submitted]);

  const handleSubmitAttempt = useCallback(async () => {
    if (submittedRef.current || submitLockRef.current) return;
    submitLockRef.current = true;

    if (hasAttemptLimit) {
      try {
        const latestTest = await refetchTest();
        const latestAttemptsRemaining = latestTest.data?.attempts_remaining;
        const latestAttemptLimitReached = latestAttemptsRemaining !== null && latestAttemptsRemaining !== undefined && Number(latestAttemptsRemaining) <= 0;

        if (latestAttemptLimitReached) {
          exitFullscreen();
          toast.error('You have used all allowed attempts for this competition test.');
          submitLockRef.current = false;
          return;
        }
      } catch (error) {
        submitLockRef.current = false;
        toast.error(getApiErrorMessage(error, 'Unable to verify remaining attempts'));
        return;
      }
    }

    setShowWarning(false);
    submitMutation.mutate();
  }, [attemptLimitReached, exitFullscreen, hasAttemptLimit, refetchTest, submitMutation]);

  const registerViolation = useCallback((reason) => {
    if (submittedRef.current || attemptLimitReached) return violationCountRef.current;

    const next = violationCountRef.current + 1;
    violationCountRef.current = next;
    setTabWarnings(next);

    if (next >= maxViolations) {
      setShowWarning(false);
      toast.error(`Maximum ${reason.toLowerCase()} violations reached (${next}/${maxViolations}). Auto-submitting!`);
      void handleSubmitAttempt();
    } else {
      setShowWarning(true);
      toast.error(`${reason} detected. Warning ${next}/${maxViolations}`);
    }

    return next;
  }, [attemptLimitReached, handleSubmitAttempt, maxViolations]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !submittedRef.current) {
        registerViolation('Tab switch');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [registerViolation]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (submittedRef.current || attemptLimitReached) {
        setFullscreenLost(false);
        return;
      }

      if (!document.fullscreenElement) {
        setFullscreenLost(true);
        const next = registerViolation('Fullscreen exit');
        if (next < maxViolations) {
          setTimeout(requestFullscreen, 1000);
        }
      } else {
        setFullscreenLost(false);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [attemptLimitReached, maxViolations, registerViolation, requestFullscreen]);

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-secondary">Loading competition test...</div>;
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="card p-8 text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.18em] text-secondary">Competition Submission Complete</p>
          <h1 className="text-2xl font-bold text-primary">Your Score: {score}</h1>
          <p className="text-sm text-secondary">Competitor mode reveals score only after submit.</p>
          <button type="button" onClick={() => navigate(`/student/competitions/${competitionId}`)} className="btn-primary text-sm">
            Back to Competition Tests
          </button>
        </div>
      </div>
    );
  }

  if (attemptLimitReached) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
        <div className="card w-full max-w-2xl p-6 sm:p-8 space-y-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 mx-auto">
            Attempts exhausted
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">{test?.name}</h1>
            <p className="text-secondary">You have used all allowed attempts for this competition test. Writing is disabled.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-theme bg-surface-lighter/40 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-secondary">Attempts used</p>
              <p className="mt-2 text-2xl font-bold text-primary">{test?.attempts_used ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-theme bg-surface-lighter/40 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-secondary">Allowed attempts</p>
              <p className="mt-2 text-2xl font-bold text-primary">{test?.max_attempts ?? 1}</p>
            </div>
            <div className="rounded-2xl border border-theme bg-surface-lighter/40 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-secondary">Attempts left</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">0</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button type="button" onClick={() => navigate(`/student/competitions/${competitionId}`)} className="btn-secondary text-sm">Back to Competition</button>
            <button type="button" onClick={() => navigate('/student')} className="btn-primary text-sm">Student Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const questions = test?.questions || [];
  const q = questions[current];

  const onAnswer = (qid, value, questionType) => {
    setAnswers((prev) => {
      if (questionType === 'msq') {
        const selected = prev[qid] || [];
        return {
          ...prev,
          [qid]: selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
        };
      }
      return { ...prev, [qid]: value };
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <div className="card max-w-sm border-red-500/40 p-8 text-center">
              <p className="mb-3 inline-flex text-4xl text-red-500"><WarningAmberRoundedIcon sx={{ fontSize: 34 }} /></p>
              <h3 className="font-display text-xl font-bold text-red-400">Violation Detected!</h3>
              <p className="mt-2 text-sm text-secondary">Violations: {tabWarnings}/{maxViolations}. After {maxViolations}, the test auto-submits.</p>
              <button type="button" onClick={() => setShowWarning(false)} className="btn-primary mt-4 w-full">Resume Test</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">{test?.name}</h1>
          <p className="text-sm text-secondary mt-1">Competition mode · score-only result{hasAttemptLimit ? ` · ${Math.max(0, Number(attemptsRemaining) || 0)} attempt${Math.max(0, Number(attemptsRemaining) || 0) === 1 ? '' : 's'} left` : ''}{tabWarnings > 0 ? ` · ${tabWarnings}/${maxViolations} violations` : ''}</p>
        </div>
        <button type="button" onClick={() => navigate(`/student/competitions/${competitionId}`)} className="btn-secondary text-sm">Back</button>
      </div>

      {fullscreenLost ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Fullscreen is required. The exam will continue auto-recovering unless violations keep accumulating.
        </div>
      ) : null}

      {q ? (
        <div className="card p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
            <span>Q{current + 1}/{questions.length}</span>
            <span className="badge bg-surface-lighter text-secondary uppercase">{q.question_type}</span>
            <span className="badge bg-amber-500/10 text-amber-600">{q.marks} pts</span>
            {tabWarnings > 0 ? <span className="badge bg-red-500/10 text-red-600 inline-flex items-center gap-1"><WarningAmberRoundedIcon sx={{ fontSize: 12 }} /> {tabWarnings}/{maxViolations} violations</span> : null}
          </div>

          <p className="text-primary leading-relaxed">{q.question_text}</p>

          {q.image_url ? <img src={q.image_url} alt="question" className="rounded-xl max-h-64 object-contain" loading="lazy" /> : null}

          {q.question_type === 'mcq' && (q.options || []).map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer(q.id, i, 'mcq')}
              className={`w-full text-left p-3 rounded-xl border ${answers[q.id] === i ? 'border-primary/40 bg-primary/10 text-primary' : 'border-theme text-secondary hover:bg-surface-lighter'}`}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          ))}

          {q.question_type === 'msq' && (q.options || []).map((opt, i) => {
            const selected = (answers[q.id] || []).includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onAnswer(q.id, i, 'msq')}
                className={`w-full text-left p-3 rounded-xl border ${selected ? 'border-primary/40 bg-primary/10 text-primary' : 'border-theme text-secondary hover:bg-surface-lighter'}`}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            );
          })}

          {(q.question_type === 'nat' || q.question_type === 'fill') ? (
            <input
              value={answers[q.id] || ''}
              onChange={(e) => onAnswer(q.id, e.target.value, q.question_type)}
              className="input"
              placeholder="Enter your answer"
            />
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={() => setCurrent((v) => Math.max(0, v - 1))} disabled={current === 0} className="btn-secondary text-sm disabled:opacity-40">
              <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Previous
            </button>
            <span className="text-xs text-secondary">Answered: {Object.keys(answers).length}/{questions.length}</span>
            <button type="button" onClick={() => setCurrent((v) => Math.min(questions.length - 1, v + 1))} disabled={current === questions.length - 1} className="btn-primary text-sm disabled:opacity-40">
              Next <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          </div>

          <div className="border-t border-theme pt-4 flex justify-end">
            <button type="button" onClick={() => void handleSubmitAttempt()} disabled={submitMutation.isLoading || attemptLimitReached || (hasAttemptLimit && isTestFetching)} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {attemptLimitReached ? 'Attempt Limit Reached' : submitMutation.isLoading ? 'Submitting...' : hasAttemptLimit && isTestFetching ? 'Checking attempts...' : 'Submit Test'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center text-secondary">No questions found in this competition test.</div>
      )}
    </div>
  );
}
