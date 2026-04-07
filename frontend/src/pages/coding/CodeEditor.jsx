import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import api from '../../utils/api';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useCodeRunnerWarmup } from '../../hooks/useCodeRunnerWarmup';

const LANGUAGES = [
  { id: 'python',     label: 'Python',     monaco: 'python',     default: '# Write your Python solution here\n\ndef solution():\n    pass\n' },
  { id: 'cpp',        label: 'C++',        monaco: 'cpp',        default: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your C++ solution here\n    return 0;\n}\n' },
  { id: 'java',       label: 'Java',       monaco: 'java',       default: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your Java solution here\n    }\n}\n' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript', default: '// Write your JavaScript solution here\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\n' },
  { id: 'c',          label: 'C',          monaco: 'c',          default: '#include <stdio.h>\n\nint main() {\n    // Write your C solution here\n    return 0;\n}\n' },
];

const THEMES = [
  { id: 'vs-dark', label: 'Dark' },
  { id: 'light',   label: 'Light' },
];

function TestCaseResult({ tc }) {
  const statusColor = tc.status === 'passed'
    ? 'border-emerald-500/30 bg-emerald-500/5'
    : tc.status === 'tle' ? 'border-amber-500/30 bg-amber-500/5'
    : 'border-red-500/30 bg-red-500/5';

  const statusBadge = tc.status === 'passed'
    ? 'bg-emerald-500/20 text-emerald-400'
    : tc.status === 'tle' ? 'bg-amber-500/20 text-amber-400'
    : 'bg-red-500/20 text-red-400';

  return (
    <div className={`rounded-lg border p-3 ${statusColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">
          {tc.is_private ? `Private Test Case ${tc.case_number}` : `Test Case ${tc.case_number}`}
        </span>
        <span className={`badge ${statusBadge}`}>{tc.status.toUpperCase()}</span>
      </div>
      {!tc.is_private && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <p className="text-xs text-slate-500 mb-1">Expected Output</p>
            <pre className="text-xs font-mono text-slate-300 bg-surface p-2 rounded whitespace-pre-wrap">{tc.expected}</pre>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Your Output</p>
            <pre className="text-xs font-mono text-rose-300 bg-surface p-2 rounded whitespace-pre-wrap">{tc.actual || '(empty)'}</pre>
          </div>
        </div>
      )}
      {tc.time_ms && <p className="text-xs text-slate-500 mt-1">Runtime: {tc.time_ms.toFixed(0)}ms</p>}
    </div>
  );
}

export default function CodeEditor() {
  const { id: problemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  useCodeRunnerWarmup();

  const editorRef = useRef(null);
  const [lang, setLang]       = useState(LANGUAGES[0]);
  const [theme, setTheme]     = useState('vs-dark');
  const [code, setCode]       = useState(LANGUAGES[0].default);
  const [tab, setTab]         = useState('problem'); // problem | results
  const [result, setResult]   = useState(null);
  const [running, setRunning] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [fullscreenLost, setFullscreenLost] = useState(false);
  const submitLockRef = useRef(false);
  const submittedRef = useRef(false);
  const violationCountRef = useRef(0);
  const competitionDraftsRef = useRef(new Map());
  const activeProblemIdRef = useRef(problemId);
  const competitionSubmitRef = useRef(null);

  const searchParams = new URLSearchParams(location.search);
  const competitionId = searchParams.get('competitionId');
  const competitionTestId = searchParams.get('competitionTestId');
  const competitionMode = searchParams.get('source') === 'competition' || !!competitionId || !!competitionTestId;
  const competitionSearch = competitionMode && competitionId && competitionTestId
    ? `?competitionId=${encodeURIComponent(competitionId)}&competitionTestId=${encodeURIComponent(competitionTestId)}&source=competition`
    : location.search;

  const { data: competitionTest } = useQuery(
    ['competition-coding-test', competitionId, competitionTestId],
    async () => {
      const response = await api.get(`/competitions/${competitionId}/tests`);
      const tests = Array.isArray(response.data) ? response.data : [];
      return tests.find((test) => test.id === competitionTestId) || null;
    },
    { enabled: competitionMode && !!competitionId && !!competitionTestId, staleTime: 60_000, retry: false }
  );

  const competitionProblemIds = Array.isArray(competitionTest?.problem_ids)
    ? competitionTest.problem_ids.filter(Boolean)
    : [];
  const activeCompetitionProblemIndex = competitionProblemIds.findIndex((candidateId) => candidateId === problemId);
  const competitionProblemPosition = activeCompetitionProblemIndex >= 0 ? activeCompetitionProblemIndex : 0;
  const competitionProblemTotal = competitionProblemIds.length;
  const hasCompetitionQueue = competitionProblemTotal > 0;

  const goToCompetitionProblem = useCallback((targetProblemId) => {
    if (!targetProblemId) return;
    if (competitionMode && problemId) {
      competitionDraftsRef.current.set(problemId, { code, langId: lang.id });
    }
    navigate(`/code/${targetProblemId}${competitionSearch}`);
  }, [competitionMode, competitionSearch, code, lang.id, navigate, problemId]);

  const requestFullscreen = useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        setFullscreenLost(true);
      });
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const { data: problem, isLoading } = useQuery(
    ['problem', problemId],
    () => api.get(`/coding/problems/${problemId}`).then(r => r.data)
  );

  const submitMut = useMutation(
    ({ mode }) => api.post('/submissions/code', { problem_id: problemId, language: lang.id, code, mode }),
    {
      onMutate: () => setRunning(true),
      onSettled: () => setRunning(false),
      onSuccess: (data, variables) => {
        setResult(data.data);
        setTab('results');
        if (data.data.status === 'accepted') toast.success('Accepted');
        else toast.error(`${data.data.status?.replace(/_/g,' ')}`);
        if (competitionMode && variables?.mode === 'submit') {
          submittedRef.current = true;
          submitLockRef.current = false;
          exitFullscreen();
        }
      },
      onError: (err) => toast.error(err.response?.data?.detail || 'Submission failed'),
    }
  );

  const handleSubmit = useCallback((mode) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    submitMut.mutate(
      { mode },
      {
        onSettled: () => {
          submitLockRef.current = false;

  useEffect(() => {
    competitionSubmitRef.current = handleSubmit;
  }, [handleSubmit]);
        },
      }
    );
  }, [submitMut]);

  const registerViolation = useCallback((reason) => {
    if (!competitionMode || submittedRef.current) return violationCountRef.current;

    const next = violationCountRef.current + 1;
    violationCountRef.current = next;
    setTabWarnings(next);

    if (next >= 3) {
      setShowWarning(false);
      toast.error(`Maximum ${reason.toLowerCase()} violations reached. Auto-submitting!`);
      competitionSubmitRef.current?.('submit');
    } else {
      setShowWarning(true);
      toast.error(`${reason} detected. Warning ${next}/3`);
    }

    return next;
  }, [competitionMode]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    setCode(newLang.default);
    if (competitionMode && problemId) {
      competitionDraftsRef.current.set(problemId, { code: newLang.default, langId: newLang.id });
    }
  };

  const handleEditorMount = (editor) => { editorRef.current = editor; };

  useEffect(() => {
    if (!competitionMode) return undefined;

    const requestFS = () => {
      if (submittedRef.current) return;
      requestFullscreen();
    };

    requestFS();

    const onVisibility = () => {
      if (document.hidden && !submittedRef.current) {
        registerViolation('Tab switch');
      }
    };

    const onFullscreenChange = () => {
      if (submittedRef.current) {
        setFullscreenLost(false);
        setShowWarning(false);
        return;
      }

      if (!document.fullscreenElement) {
        setFullscreenLost(true);
        const next = registerViolation('Fullscreen exit');
        if (next < 3) {
          setTimeout(requestFS, 1000);
        }
      } else {
        setFullscreenLost(false);
        setShowWarning(false);
      }
    };

    const prevent = (event) => event.preventDefault();

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
    };
  }, [competitionMode, exitFullscreen, registerViolation, requestFullscreen]);

  useEffect(() => {
    if (competitionMode && problemId && activeProblemIdRef.current === problemId) {
      competitionDraftsRef.current.set(problemId, { code, langId: lang.id });
    }
  }, [code, competitionMode, lang.id, problemId]);

  useEffect(() => {
    activeProblemIdRef.current = problemId;
    submittedRef.current = false;
    submitLockRef.current = false;
    violationCountRef.current = 0;
    setTabWarnings(0);
    setShowWarning(false);
    setFullscreenLost(false);
    setResult(null);
    setTab('problem');
    const savedDraft = competitionMode && problemId ? competitionDraftsRef.current.get(problemId) : null;
    if (savedDraft) {
      const savedLanguage = LANGUAGES.find((candidate) => candidate.id === savedDraft.langId) || LANGUAGES[0];
      setLang(savedLanguage);
      setCode(savedDraft.code || savedLanguage.default);
    } else {
      setCode(lang.default);
    }
    setRunning(false);
  }, [problemId]);

  if (isLoading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-secondary animate-pulse">Loading problem…</div>
    </div>
  );

  const backTarget = competitionMode && competitionId ? `/student/competitions/${competitionId}` : '/student/coding/practice';

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <AnimatePresence>
        {competitionMode && showWarning ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <div className="card max-w-sm border-red-500/40 p-8 text-center">
              <p className="mb-3 inline-flex text-4xl text-red-500"><WarningAmberRoundedIcon sx={{ fontSize: 34 }} /></p>
              <h3 className="font-display text-xl font-bold text-red-400">Fullscreen required!</h3>
              <p className="mt-2 text-sm text-secondary">Violations: {tabWarnings}/3. Keep the editor in fullscreen while solving the problem.</p>
              <button type="button" onClick={() => { requestFullscreen(); }} className="btn-primary mt-4 w-full">Resume</button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Top Bar */}
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-theme bg-surface-light">
        <Link
          to={backTarget}
          onClick={() => {
            if (competitionMode) {
              exitFullscreen();
            }
          }}
          className="inline-flex items-center gap-1.5 text-secondary hover:text-primary transition-colors text-sm"
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Back
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-primary truncate">{problem?.name}</p>
          <div className="flex gap-2 mt-0.5">
            <span className={`badge-${problem?.difficulty?.toLowerCase()}`}>{problem?.difficulty}</span>
            {problem?.marks && <span className="badge bg-amber-500/10 text-amber-600">{problem?.marks}pts</span>}
            <span className="badge bg-surface-lighter text-secondary font-mono text-xs">{problem?.problem_id}</span>
            {competitionMode ? <span className="badge bg-primary/10 text-primary text-xs">Competition mode</span> : null}
            {competitionMode && fullscreenLost ? <span className="badge bg-amber-500/10 text-amber-600 text-xs">Fullscreen required</span> : null}
            {competitionMode && hasCompetitionQueue ? (
              <span className="badge bg-surface-lighter text-secondary text-xs">
                Question {competitionProblemPosition + 1} of {competitionProblemTotal}
              </span>
            ) : null}
          </div>
        </div>

        {competitionMode && hasCompetitionQueue ? (
          <div className="flex items-center gap-2 rounded-2xl border border-theme bg-surface px-3 py-2">
            <button
              type="button"
              onClick={() => goToCompetitionProblem(competitionProblemIds[competitionProblemPosition - 1])}
              disabled={competitionProblemPosition <= 0}
              className="btn-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 14 }} /> Prev
            </button>
            <span className="text-[11px] text-secondary whitespace-nowrap">
              {competitionProblemPosition + 1}/{competitionProblemTotal}
            </span>
            <button
              type="button"
              onClick={() => goToCompetitionProblem(competitionProblemIds[competitionProblemPosition + 1])}
              disabled={competitionProblemPosition >= competitionProblemTotal - 1}
              className="btn-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
            </button>
          </div>
        ) : null}

        {/* Language selector */}
        <select
          value={lang.id}
          onChange={e => handleLangChange(LANGUAGES.find(l => l.id === e.target.value))}
          className="bg-surface border border-theme rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-primary-500"
        >
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>

        {/* Theme */}
        <select
          value={theme}
          onChange={e => setTheme(e.target.value)}
          className="bg-surface border border-theme rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-primary-500"
        >
          {THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        {/* Actions */}
        <button
          onClick={() => handleSubmit('run')}
          disabled={running}
          className="btn-secondary text-sm"
        >
          <PlayArrowRoundedIcon sx={{ fontSize: 16 }} /> Run
        </button>
        <button
          onClick={() => handleSubmit('submit')}
          disabled={running}
          className="btn-primary text-sm"
        >
          {running ? <><AutorenewRoundedIcon sx={{ fontSize: 16 }} className="animate-spin" /> Judging…</> : <><CloudUploadRoundedIcon sx={{ fontSize: 16 }} /> Submit</>}
        </button>
      </header>

      {/* Main Split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel – Problem + Results */}
        <div className="w-full lg:w-2/5 flex flex-col lg:border-r border-theme min-w-0">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {[['problem',<span className="inline-flex items-center gap-1"><DescriptionOutlinedIcon sx={{fontSize:14}}/> Problem</span>],['results',<span className="inline-flex items-center gap-1"><AssessmentOutlinedIcon sx={{fontSize:14}}/> Results</span>]].map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab===id ? 'text-white border-b-2 border-primary-500' : 'text-slate-500 hover:text-white'}`}
              >{label}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {tab === 'problem' ? (
              <>
                {problem?.banner_url && <img src={problem.banner_url} alt="" className="w-full h-36 object-cover rounded-xl" loading="lazy" />}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{problem?.statement || ''}</ReactMarkdown>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">Constraints</p>
                  <p className="text-sm font-mono text-primary bg-surface rounded-lg p-3">{problem?.constraints}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label:'Sample Input 1',  val: problem?.sample_input_1  },
                    { label:'Sample Output 1', val: problem?.sample_output_1 },
                    { label:'Sample Input 2',  val: problem?.sample_input_2  },
                    { label:'Sample Output 2', val: problem?.sample_output_2 },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-xs text-secondary mb-1">{label}</p>
                      <pre className="text-xs font-mono text-primary bg-surface rounded-lg p-3 whitespace-pre-wrap">{val}</pre>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {!result && <p className="text-secondary text-sm text-center py-8">Submit your code to see results.</p>}
                {result && (
                  <>
                    <div className={`rounded-xl p-4 border ${
                      result.status === 'accepted' ? 'border-emerald-500/30 bg-emerald-500/10' :
                      result.status === 'compilation_error' ? 'border-red-500/30 bg-red-500/10' :
                      'border-amber-500/30 bg-amber-500/10'
                    }`}>
                      <p className="font-display font-semibold text-lg">
                        {result.status === 'accepted' ? 'Accepted' :
                         result.status === 'compilation_error' ? 'Compilation Error' :
                         result.status === 'wrong_answer' ? 'Wrong Answer' :
                         result.status === 'tle' ? 'Time Limit Exceeded' :
                         result.status === 'runtime_error' ? 'Runtime Error' :
                         result.status}
                      </p>
                      {result.score > 0 && <p className="text-amber-400 mt-1">+{result.score} points</p>}
                    </div>

                    {result.compilation_error && (
                      <div>
                        <p className="text-xs text-red-500 mb-1 font-medium">Compilation Error:</p>
                        <pre className="text-xs font-mono text-red-300 bg-surface rounded-lg p-3 overflow-x-auto">{result.compilation_error}</pre>
                      </div>
                    )}

                    {result.test_results?.map(tc => (
                      <TestCaseResult key={tc.case_number} tc={tc} />
                    ))}

                    {/* Editorial (practice mode) */}
                    {problem?.editorial && result.status === 'accepted' && (
                      <div className="card p-4">
                        <p className="font-medium text-primary mb-2 inline-flex items-center gap-1"><MenuBookRoundedIcon sx={{fontSize:16}}/> Editorial</p>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{problem.editorial}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel – Monaco Editor */}
        <div className="flex-1 flex flex-col min-w-0 min-h-[50vh] lg:min-h-0">
          <Editor
            height="100%"
            language={lang.monaco}
            theme={theme}
            value={code}
            onChange={val => setCode(val || '')}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              glyphMargin: false,
              wordWrap: 'on',
              tabSize: 4,
              automaticLayout: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              formatOnType: true,
              formatOnPaste: true,
              bracketPairColorization: { enabled: true },
            }}
          />
        </div>
      </div>
    </div>
  );
}
