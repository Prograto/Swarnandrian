import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/common/DashboardLayout';
import { FACULTY_NAV } from './FacultyDashboard';
import api from '../../utils/api';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';

const QTYPES = ['mcq', 'msq', 'nat', 'fill'];
const DIFFS = ['Easy', 'Medium', 'Hard'];

export default function FacultyCompetitionTestEditor() {
  const { competitionId, testId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [testImageUploading, setTestImageUploading] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showCodingForm, setShowCodingForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingCodingProblemId, setEditingCodingProblemId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    banner_url: '',
    description: '',
    section_id: '',
    test_type: 'coding',
    time_limit_minutes: 60,
    access_code: '',
    branch: '',
    is_active: true,
    question_ids: '',
    problem_ids: '',
  });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [selectedProblemIds, setSelectedProblemIds] = useState([]);
  const [qForm, setQForm] = useState({
    question_type: 'mcq',
    question_text: '',
    options: '',
    correct_options: '',
    correct_answer: '',
    explanation: '',
    marks: 1,
    negative_marks: 0,
    difficulty: 'Medium',
    image_url: '',
    branch: '',
    is_active: true,
  });
  const [codingForm, setCodingForm] = useState({
    problem_id: '',
    name: '',
    statement: '',
    constraints: '',
    sample_input_1: '',
    sample_output_1: '',
    sample_input_2: '',
    sample_output_2: '',
    difficulty: 'Medium',
    marks: 10,
    editorial: '',
    banner_url: '',
    branch: '',
    is_active: true,
  });

  const { data: test, isLoading } = useQuery(['competition-test', competitionId, testId], async () => {
    const tests = await api.get(`/competitions/${competitionId}/tests`).then((r) => r.data || []);
    return tests.find((item) => item.id === testId) || null;
  });

  React.useEffect(() => {
    if (!test) return;
    const qids = test.question_ids || [];
    const pids = test.problem_ids || [];
    setSelectedQuestionIds(qids);
    setSelectedProblemIds(pids);
    setForm({
      name: test.name || '',
      banner_url: test.banner_url || '',
      description: test.description || '',
      section_id: test.section_id || '',
      test_type: test.test_type || 'coding',
      time_limit_minutes: test.time_limit_minutes || 60,
      access_code: test.access_code || '',
      branch: test.branch || '',
      is_active: test.is_active !== false,
      question_ids: qids.join(','),
      problem_ids: pids.join(','),
    });
  }, [test]);

  const isQuestionTest = form.test_type === 'aptitude' || form.test_type === 'technical';
  const isCodingTest = form.test_type === 'coding';
  const questionApiBase = form.test_type === 'technical' ? '/technical' : '/aptitude';

  const { data: sections = [] } = useQuery(
    ['competition-test-sections', form.test_type],
    () => api.get(`${questionApiBase}/sections`, { params: { mode: 'competitor' } }).then((r) => r.data || []),
    { enabled: isQuestionTest }
  );

  const { data: questionsData } = useQuery(
    ['competition-test-questions', form.test_type, form.section_id],
    () => api.get(`${questionApiBase}/questions`, { params: { section_id: form.section_id, limit: 500 } }).then((r) => r.data),
    { enabled: isQuestionTest && !!form.section_id }
  );

  const questions = questionsData?.questions || [];

  const { data: codingSections = [] } = useQuery(
    ['competition-test-coding-sections'],
    () => api.get('/coding/sections', { params: { mode: 'competitor' } }).then((r) => r.data || []),
    { enabled: isCodingTest }
  );

  const { data: codingProblemsData } = useQuery(
    ['competition-test-coding-problems', form.section_id],
    () => api.get('/coding/problems', { params: { section_id: form.section_id, mode: 'competitor', limit: 500 } }).then((r) => r.data),
    { enabled: isCodingTest && !!form.section_id }
  );
  const codingProblems = codingProblemsData?.problems || [];
  const linkedSectionName = useMemo(() => {
    const allSections = [...sections, ...codingSections];
    return allSections.find((section) => section.id === form.section_id)?.name || form.section_id || 'No section linked';
  }, [sections, codingSections, form.section_id]);

  const payload = useMemo(() => ({
    competition_id: competitionId,
    name: form.name,
    banner_url: form.banner_url || undefined,
    description: form.description || undefined,
    section_id: form.section_id || undefined,
    test_type: form.test_type,
    time_limit_minutes: Number(form.time_limit_minutes) || 60,
    access_code: form.access_code || undefined,
    branch: form.branch || undefined,
    is_active: form.is_active !== false,
    question_ids: isQuestionTest ? selectedQuestionIds : [],
    problem_ids: isCodingTest ? selectedProblemIds : [],
    marks_per_question: 1,
  }), [competitionId, form, selectedQuestionIds, selectedProblemIds, isQuestionTest, isCodingTest]);

  const saveMut = useMutation(
    () => api.put(`/competitions/${competitionId}/tests/${testId}`, payload),
    {
      onSuccess: () => {
        toast.success('Test updated');
        navigate(`/faculty/competitions/${competitionId}`);
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update test'),
    }
  );

  const createQuestion = useMutation(
    (data) => api.post(`${questionApiBase}/questions`, data),
    {
      onSuccess: () => {
        toast.success('Question created');
        qc.invalidateQueries(['competition-test-questions', form.test_type, form.section_id]);
        setShowQuestionForm(false);
        setEditingQuestionId(null);
        setQForm({
          question_type: 'mcq',
          question_text: '',
          options: '',
          correct_options: '',
          correct_answer: '',
          explanation: '',
          marks: 1,
          negative_marks: 0,
          difficulty: 'Medium',
          image_url: '',
          branch: '',
          is_active: true,
        });
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create question'),
    }
  );

  const updateQuestion = useMutation(
    ({ qid, data }) => api.put(`${questionApiBase}/questions/${qid}`, data),
    {
      onSuccess: () => {
        toast.success('Question updated');
        qc.invalidateQueries(['competition-test-questions', form.test_type, form.section_id]);
        setShowQuestionForm(false);
        setEditingQuestionId(null);
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update question'),
    }
  );

  const deleteQuestion = useMutation(
    (qid) => api.delete(`${questionApiBase}/questions/${qid}`),
    {
      onSuccess: (_, qid) => {
        toast.success('Question deleted');
        qc.invalidateQueries(['competition-test-questions', form.test_type, form.section_id]);
        setSelectedQuestionIds((prev) => prev.filter((id) => id !== qid));
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to delete question'),
    }
  );

  const createCodingProblem = useMutation(
    (data) => api.post('/coding/problems', data),
    {
      onSuccess: () => {
        toast.success('Coding problem created');
        qc.invalidateQueries(['competition-test-coding-problems', form.section_id]);
        setShowCodingForm(false);
        setEditingCodingProblemId(null);
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create coding problem'),
    }
  );

  const updateCodingProblem = useMutation(
    ({ pid, data }) => api.put(`/coding/problems/${pid}`, data),
    {
      onSuccess: () => {
        toast.success('Coding problem updated');
        qc.invalidateQueries(['competition-test-coding-problems', form.section_id]);
        setShowCodingForm(false);
        setEditingCodingProblemId(null);
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update coding problem'),
    }
  );

  const deleteCodingProblem = useMutation(
    (pid) => api.delete(`/coding/problems/${pid}`),
    {
      onSuccess: (_, pid) => {
        toast.success('Coding problem deleted');
        qc.invalidateQueries(['competition-test-coding-problems', form.section_id]);
        setSelectedProblemIds((prev) => prev.filter((id) => id !== pid));
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to delete coding problem'),
    }
  );

  const saveQuestion = () => {
    if (!form.section_id) {
      toast.error('Choose a section first');
      return;
    }
    const opts = qForm.options ? qForm.options.split('|').map((o) => o.trim()).filter(Boolean) : null;
    const corrOpts = qForm.correct_options
      ? qForm.correct_options.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !Number.isNaN(n))
      : null;
    const qPayload = {
      section_id: form.section_id,
      section_type: form.test_type,
      question_type: qForm.question_type,
      question_text: qForm.question_text,
      image_url: qForm.image_url || null,
      options: opts,
      correct_options: corrOpts,
      correct_answer: qForm.correct_answer || null,
      explanation: qForm.explanation || null,
      marks: Number(qForm.marks) || 1,
      negative_marks: Number(qForm.negative_marks) || 0,
      difficulty: qForm.difficulty,
      branch: qForm.branch || null,
      is_active: qForm.is_active !== false,
    };
    if (editingQuestionId) {
      updateQuestion.mutate({ qid: editingQuestionId, data: qPayload });
    } else {
      createQuestion.mutate(qPayload);
    }
  };

  const editQuestion = (q) => {
    setEditingQuestionId(q.id);
    setShowQuestionForm(true);
    setQForm({
      question_type: q.question_type || 'mcq',
      question_text: q.question_text || '',
      options: Array.isArray(q.options) ? q.options.join('|') : '',
      correct_options: Array.isArray(q.correct_options) ? q.correct_options.join(',') : '',
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      marks: q.marks ?? 1,
      negative_marks: q.negative_marks ?? 0,
      difficulty: q.difficulty || 'Medium',
      image_url: q.image_url || '',
      branch: q.branch || '',
      is_active: q.is_active !== false,
    });
  };

  const editCodingProblem = (p) => {
    setEditingCodingProblemId(p.id);
    setShowCodingForm(true);
    setCodingForm({
      problem_id: p.problem_id || '',
      name: p.name || '',
      statement: p.statement || '',
      constraints: p.constraints || '',
      sample_input_1: p.sample_input_1 || '',
      sample_output_1: p.sample_output_1 || '',
      sample_input_2: p.sample_input_2 || '',
      sample_output_2: p.sample_output_2 || '',
      difficulty: p.difficulty || 'Medium',
      marks: p.marks ?? 10,
      editorial: p.editorial || '',
      banner_url: p.banner_url || '',
      branch: p.branch || '',
      is_active: p.is_active !== false,
    });
  };

  const saveCodingProblem = () => {
    if (!form.section_id) {
      toast.error('Choose a coding section first');
      return;
    }
    const data = {
      section_id: form.section_id,
      problem_id: codingForm.problem_id,
      banner_url: codingForm.banner_url || null,
      name: codingForm.name,
      statement: codingForm.statement || 'Problem statement',
      constraints: codingForm.constraints || 'N/A',
      sample_input_1: codingForm.sample_input_1 || '-',
      sample_output_1: codingForm.sample_output_1 || '-',
      sample_input_2: codingForm.sample_input_2 || '-',
      sample_output_2: codingForm.sample_output_2 || '-',
      private_test_cases: [],
      difficulty: codingForm.difficulty,
      marks: Number(codingForm.marks) || 10,
      editorial: codingForm.editorial || null,
      mode: 'competitor',
      branch: codingForm.branch || null,
      is_active: codingForm.is_active !== false,
    };
    if (editingCodingProblemId) {
      updateCodingProblem.mutate({ pid: editingCodingProblemId, data });
    } else {
      createCodingProblem.mutate(data);
    }
  };

  const bulkUploadCodingProblems = async (file) => {
    if (!file || !form.section_id) {
      toast.error('Choose a coding section first');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post(`/coding/problems/bulk-upload?section_id=${form.section_id}&mode=competitor`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${res.data.created || 0} coding problems imported`);
      qc.invalidateQueries(['competition-test-coding-problems', form.section_id]);
    } catch {
      toast.error('Bulk upload failed');
    }
  };

  const bulkUploadQuestions = async (file) => {
    if (!file || !form.section_id) {
      toast.error('Choose a section first');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post(`${questionApiBase}/questions/bulk-upload?section_id=${form.section_id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${res.data.created || 0} questions imported`);
      qc.invalidateQueries(['competition-test-questions', form.test_type, form.section_id]);
    } catch {
      toast.error('Bulk upload failed');
    }
  };

  const uploadBanner = async (file) => {
    if (!file) return;
    setTestImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/?folder=competition-test-banners', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((p) => ({ ...p, banner_url: data.url }));
      toast.success('Test banner uploaded');
    } catch {
      toast.error('Test banner upload failed');
    } finally {
      setTestImageUploading(false);
    }
  };

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="section-title">Open Competition Test</h1>
            <p className="text-sm text-secondary mt-1">Manage test settings and questions from this dedicated page</p>
          </div>
          <Link to={`/faculty/competitions/${competitionId}`} className="btn btn-secondary btn-sm">Back</Link>
        </div>

        {isLoading ? (
          <div className="card p-4 text-secondary text-sm">Loading...</div>
        ) : !test ? (
          <div className="card p-4 text-secondary text-sm">Test not found.</div>
        ) : (
          <>
            <div data-lenis-prevent className="card p-5 space-y-3 max-h-[75vh] overflow-y-auto overscroll-contain touch-pan-y" style={{ touchAction: 'pan-y' }}>
              <div>
                <label className="text-xs text-secondary font-semibold">Test Name</label>
                <input className="input mt-1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-secondary font-semibold">Test Type</label>
                <select className="input mt-1" value={form.test_type} onChange={(e) => setForm((p) => ({ ...p, test_type: e.target.value }))}>
                  <option value="coding">coding</option>
                  <option value="aptitude">aptitude</option>
                  <option value="technical">technical</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-secondary font-semibold">Banner Image URL</label>
                <input className="input mt-1" placeholder="https://..." value={form.banner_url} onChange={(e) => setForm((p) => ({ ...p, banner_url: e.target.value }))} />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-secondary">
                  <UploadFileRoundedIcon sx={{ fontSize: 14 }} /> Upload Banner
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadBanner(e.target.files?.[0])} />
                </label>
                {testImageUploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                {form.banner_url ? <img src={form.banner_url} alt="" className="mt-2 w-full h-28 object-cover rounded-xl" loading="lazy" /> : null}
              </div>
              <div>
                <label className="text-xs text-secondary font-semibold">Description</label>
                <textarea className="input mt-1 h-20 resize-none" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-secondary font-semibold">Linked Section</label>
                  <div className="input mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-primary">{linkedSectionName}</span>
                    <span className="text-[11px] text-secondary shrink-0">Fixed</span>
                  </div>
                  <p className="mt-1 text-[11px] text-secondary">This competition test keeps the section from the existing test record.</p>
                </div>
                <div>
                  <label className="text-xs text-secondary font-semibold">Time Limit (minutes)</label>
                  <input type="number" className="input mt-1" value={form.time_limit_minutes} onChange={(e) => setForm((p) => ({ ...p, time_limit_minutes: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-secondary font-semibold">Access Code</label>
                  <input className="input mt-1" value={form.access_code} onChange={(e) => setForm((p) => ({ ...p, access_code: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-secondary font-semibold">Branch Access</label>
                  <input className="input mt-1" placeholder="All branches if blank" value={form.branch} onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))} />
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-secondary font-semibold mt-6">
                  <input type="checkbox" checked={form.is_active !== false} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
                  Enabled for students
                </label>
              </div>
            </div>

            {isQuestionTest ? (
              <div className="card p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-end gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditingQuestionId(null); setShowQuestionForm((v) => !v); }}>{showQuestionForm ? 'Close Manual Form' : 'Add Question Manually'}</button>
                    <label className="btn btn-secondary btn-sm cursor-pointer">
                      Bulk Upload Excel
                      <input type="file" accept=".xlsx" className="hidden" onChange={(e) => bulkUploadQuestions(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>

                {showQuestionForm ? (
                  <div data-lenis-prevent className="rounded-xl border border-theme p-4 space-y-3 max-h-[55vh] overflow-y-auto overscroll-contain touch-pan-y" style={{ touchAction: 'pan-y' }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-secondary font-semibold">Question Type</label>
                        <select className="input mt-1" value={qForm.question_type} onChange={(e) => setQForm((p) => ({ ...p, question_type: e.target.value }))}>
                          {QTYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-secondary font-semibold">Difficulty</label>
                        <select className="input mt-1" value={qForm.difficulty} onChange={(e) => setQForm((p) => ({ ...p, difficulty: e.target.value }))}>
                          {DIFFS.map((d) => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-secondary font-semibold">Question Text</label>
                      <textarea className="input mt-1 h-20 resize-none" value={qForm.question_text} onChange={(e) => setQForm((p) => ({ ...p, question_text: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-secondary font-semibold">Image URL</label>
                      <input className="input mt-1" value={qForm.image_url} onChange={(e) => setQForm((p) => ({ ...p, image_url: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-secondary font-semibold">Branch Access</label>
                        <input className="input mt-1" placeholder="All branches if blank" value={qForm.branch} onChange={(e) => setQForm((p) => ({ ...p, branch: e.target.value }))} />
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-secondary font-semibold mt-6">
                        <input type="checkbox" checked={qForm.is_active !== false} onChange={(e) => setQForm((p) => ({ ...p, is_active: e.target.checked }))} />
                        Enabled for students
                      </label>
                    </div>
                    {qForm.question_type === 'mcq' || qForm.question_type === 'msq' ? (
                      <>
                        <div>
                          <label className="text-xs text-secondary font-semibold">Options (A|B|C|D)</label>
                          <input className="input mt-1" value={qForm.options} onChange={(e) => setQForm((p) => ({ ...p, options: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-secondary font-semibold">Correct Option Indices</label>
                          <input className="input mt-1" value={qForm.correct_options} onChange={(e) => setQForm((p) => ({ ...p, correct_options: e.target.value }))} />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="text-xs text-secondary font-semibold">Correct Answer</label>
                        <input className="input mt-1" value={qForm.correct_answer} onChange={(e) => setQForm((p) => ({ ...p, correct_answer: e.target.value }))} />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-secondary font-semibold">Explanation</label>
                      <input className="input mt-1" value={qForm.explanation} onChange={(e) => setQForm((p) => ({ ...p, explanation: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-secondary font-semibold">Marks</label>
                        <input type="number" className="input mt-1" value={qForm.marks} onChange={(e) => setQForm((p) => ({ ...p, marks: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-secondary font-semibold">Negative Marks</label>
                        <input type="number" step="0.25" className="input mt-1" value={qForm.negative_marks} onChange={(e) => setQForm((p) => ({ ...p, negative_marks: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button className="btn btn-primary btn-sm" disabled={createQuestion.isLoading || updateQuestion.isLoading} onClick={saveQuestion}>{(createQuestion.isLoading || updateQuestion.isLoading) ? 'Saving...' : (editingQuestionId ? 'Update Question' : 'Save Question')}</button>
                    </div>
                  </div>
                ) : null}

                <div data-lenis-prevent className="max-h-[50vh] overflow-y-auto rounded-xl border border-theme p-3 space-y-2 overscroll-contain touch-pan-y" style={{ touchAction: 'pan-y' }}>
                  {!questions.length ? (
                    <p className="text-xs text-secondary p-2">No questions in selected section.</p>
                  ) : questions.map((q) => (
                    <div key={q.id} className="p-2 rounded-lg hover:bg-surface-lighter">
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-start gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(q.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestionIds((prev) => [...prev, q.id]);
                              } else {
                                setSelectedQuestionIds((prev) => prev.filter((id) => id !== q.id));
                              }
                            }}
                            className="mt-0.5"
                          />
                          <span className="text-xs text-secondary line-clamp-2">{q.question_text}</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-600" onClick={() => editQuestion(q)}>Edit</button>
                          <button
                            className="text-[11px] px-2 py-1 rounded bg-red-50 text-red-600"
                            onClick={() => {
                              if (window.confirm('Delete this question?')) {
                                deleteQuestion.mutate(q.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-secondary">Coding test: add coding problems manually or via bulk upload, then select for this test.</p>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditingCodingProblemId(null); setShowCodingForm((v) => !v); }}>{showCodingForm ? 'Close Manual Form' : 'Add Coding Problem'}</button>
                    <label className="btn btn-secondary btn-sm cursor-pointer">
                      Bulk Upload Excel
                      <input type="file" accept=".xlsx" className="hidden" onChange={(e) => bulkUploadCodingProblems(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
                {showCodingForm ? (
                  <div className="rounded-xl border border-theme p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-secondary font-semibold">Problem ID</label>
                        <input className="input mt-1" value={codingForm.problem_id} onChange={(e) => setCodingForm((p) => ({ ...p, problem_id: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-secondary font-semibold">Name</label>
                        <input className="input mt-1" value={codingForm.name} onChange={(e) => setCodingForm((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-secondary font-semibold">Statement</label>
                      <textarea className="input mt-1 h-20 resize-none" value={codingForm.statement} onChange={(e) => setCodingForm((p) => ({ ...p, statement: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-secondary font-semibold">Difficulty</label>
                        <select className="input mt-1" value={codingForm.difficulty} onChange={(e) => setCodingForm((p) => ({ ...p, difficulty: e.target.value }))}>
                          {DIFFS.map((d) => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-secondary font-semibold">Marks</label>
                        <input type="number" className="input mt-1" value={codingForm.marks} onChange={(e) => setCodingForm((p) => ({ ...p, marks: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-secondary font-semibold">Branch Access</label>
                        <input className="input mt-1" placeholder="All branches if blank" value={codingForm.branch} onChange={(e) => setCodingForm((p) => ({ ...p, branch: e.target.value }))} />
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-secondary font-semibold mt-6">
                        <input type="checkbox" checked={codingForm.is_active !== false} onChange={(e) => setCodingForm((p) => ({ ...p, is_active: e.target.checked }))} />
                        Enabled for students
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button className="btn btn-primary btn-sm" onClick={saveCodingProblem}>{editingCodingProblemId ? 'Update Coding Problem' : 'Save Coding Problem'}</button>
                    </div>
                  </div>
                ) : null}

                <div data-lenis-prevent className="max-h-[50vh] overflow-y-auto rounded-xl border border-theme p-3 space-y-2 overscroll-contain touch-pan-y" style={{ touchAction: 'pan-y' }}>
                  {!codingProblems.length ? (
                    <p className="text-xs text-secondary p-2">No coding problems in selected section.</p>
                  ) : codingProblems.map((p) => (
                    <div key={p.id} className="p-2 rounded-lg hover:bg-surface-lighter">
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-start gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={selectedProblemIds.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProblemIds((prev) => [...prev, p.id]);
                              } else {
                                setSelectedProblemIds((prev) => prev.filter((id) => id !== p.id));
                              }
                            }}
                            className="mt-0.5"
                          />
                          <span className="text-xs text-secondary line-clamp-2">{p.name} ({p.problem_id})</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-600" onClick={() => editCodingProblem(p)}>Edit</button>
                          <button
                            className="text-[11px] px-2 py-1 rounded bg-red-50 text-red-600"
                            onClick={() => {
                              if (window.confirm('Delete this coding problem?')) {
                                deleteCodingProblem.mutate(p.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {p.banner_url ? <img src={p.banner_url} alt="" className="mt-2 h-20 w-full rounded-lg object-contain bg-slate-50" loading="lazy" /> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button className="btn btn-primary" disabled={saveMut.isLoading} onClick={() => saveMut.mutate()}>
                {saveMut.isLoading ? 'Saving...' : 'Save Test'}
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
