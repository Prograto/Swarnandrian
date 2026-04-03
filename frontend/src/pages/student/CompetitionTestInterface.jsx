import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

export default function CompetitionTestInterface() {
  const { competitionId, testId } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const startedAtRef = useRef(Date.now());

  const { data: test, isLoading } = useQuery(
    ['competition-attempt', competitionId, testId],
    () => api.get(`/competitions/${competitionId}/tests/${testId}/attempt`).then((r) => r.data)
  );

  const submitMutation = useMutation(
    () => api.post(`/competitions/${competitionId}/tests/${testId}/submit`, answers, { params: { time_taken_ms: Date.now() - startedAtRef.current } }),
    {
      onSuccess: (response) => {
        setSubmitted(true);
        setScore(response.data?.score || 0);
        toast.success('Submitted successfully');
      },
      onError: (error) => toast.error(error.response?.data?.detail || 'Submission failed'),
    }
  );

  useEffect(() => {
    const requestFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    requestFullscreen();

    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!submitted) return;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [submitted]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">{test?.name}</h1>
          <p className="text-sm text-secondary mt-1">Competition mode · score-only result</p>
        </div>
        <button type="button" onClick={() => navigate(`/student/competitions/${competitionId}`)} className="btn-secondary text-sm">Back</button>
      </div>

      {q ? (
        <div className="card p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
            <span>Q{current + 1}/{questions.length}</span>
            <span className="badge bg-surface-lighter text-secondary uppercase">{q.question_type}</span>
            <span className="badge bg-amber-500/10 text-amber-600">{q.marks} pts</span>
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
            <button type="button" onClick={() => submitMutation.mutate()} disabled={submitMutation.isLoading} className="btn-primary text-sm">
              {submitMutation.isLoading ? 'Submitting...' : 'Submit Test'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center text-secondary">No questions found in this competition test.</div>
      )}
    </div>
  );
}
