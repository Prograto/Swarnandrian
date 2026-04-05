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

export default function FacultySectionTestEditorPage() {
  const { sectionType, testId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isTechnical = sectionType === 'technical';
  const apiBase = isTechnical ? '/technical' : '/aptitude';

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [testImageUploading, setTestImageUploading] = useState(false);
  const [testForm, setTestForm] = useState({
    name: '',
    banner_url: '',
    description: '',
    time_limit_minutes: 60,
    max_attempts: 1,
    access_code: '',
    branch: '',
    is_active: true,
  });
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
  const [selectedQIds, setSelectedQIds] = useState([]);

  const { data: test, isLoading } = useQuery(['section-test', sectionType, testId], () =>
    api.get(`${apiBase}/tests/${testId}`).then((r) => r.data)
  );

  React.useEffect(() => {
    if (!test) return;
    setTestForm({
      name: test.name || '',
      banner_url: test.banner_url || '',
      description: test.description || '',
      time_limit_minutes: test.time_limit_minutes || 60,
      max_attempts: test.max_attempts || 1,
      access_code: test.access_code || '',
      branch: test.branch || '',
      is_active: test.is_active !== false,
    });
    setSelectedQIds(test.question_ids || []);
  }, [test]);

  const { data: questionsData } = useQuery(
    ['section-questions', sectionType, test?.section_id],
    () => api.get(`${apiBase}/questions`, { params: { section_id: test?.section_id, limit: 500 } }).then((r) => r.data),
    { enabled: !!test?.section_id }
  );

  const questions = questionsData?.questions || [];

  const payload = useMemo(() => {
    if (!test) return null;
    return {
      section_id: test.section_id,
      section_type: sectionType,
      name: testForm.name,
      banner_url: testForm.banner_url || null,
      description: testForm.description || null,
      mode: test.mode,
      question_ids: selectedQIds,
      time_limit_minutes: Number(testForm.time_limit_minutes) || 60,
      max_attempts: test.mode === 'competitor' ? Number(testForm.max_attempts) || 1 : null,
      access_code: testForm.access_code || null,
      branch: testForm.branch || null,
      is_active: testForm.is_active !== false,
    };
  }, [test, sectionType, testForm, selectedQIds]);

  const saveTest = useMutation(
    () => api.put(`${apiBase}/tests/${testId}`, payload),
    {
      onSuccess: () => {
        toast.success('Test updated');
        qc.invalidateQueries(['section-test', sectionType, testId]);
        if (isTechnical) {
          navigate(`/faculty/technical/${test?.mode || 'practice'}`);
        } else {
          navigate(`/faculty/aptitude/${test?.mode || 'practice'}`);
        }
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update test'),
    }
  );

  const createQuestion = useMutation(
    (data) => api.post(`${apiBase}/questions`, data),
    {
      onSuccess: () => {
        toast.success('Question created');
        qc.invalidateQueries(['section-questions', sectionType, test?.section_id]);
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
    ({ qid, data }) => api.put(`${apiBase}/questions/${qid}`, data),
    {
      onSuccess: () => {
        toast.success('Question updated');
        qc.invalidateQueries(['section-questions', sectionType, test?.section_id]);
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
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update question'),
    }
  );

  const deleteQuestion = useMutation(
    (qid) => api.delete(`${apiBase}/questions/${qid}`),
    {
      onSuccess: (_, qid) => {
        toast.success('Question deleted');
        qc.invalidateQueries(['section-questions', sectionType, test?.section_id]);
        setSelectedQIds((prev) => prev.filter((id) => id !== qid));
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to delete question'),
    }
  );

  const bulkUploadQuestions = async (file) => {
    if (!file || !test?.section_id) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post(`${apiBase}/questions/bulk-upload?section_id=${test.section_id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${res.data.created || 0} questions imported`);
      qc.invalidateQueries(['section-questions', sectionType, test?.section_id]);
    } catch {
      toast.error('Bulk upload failed');
    }
  };

  const uploadTestBanner = async (file) => {
    if (!file) return;
    setTestImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/upload/?folder=${sectionType}-tests`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTestForm((p) => ({ ...p, banner_url: data.url }));
      toast.success('Banner uploaded');
    } catch {
      toast.error('Banner upload failed');
    } finally {
      setTestImageUploading(false);
    }
  };

  const saveQuestion = () => {
    if (!test?.section_id) return;
    const opts = qForm.options ? qForm.options.split('|').map((o) => o.trim()).filter(Boolean) : null;
    const corrOpts = qForm.correct_options
      ? qForm.correct_options.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !Number.isNaN(n))
      : null;
    const qPayload = {
      section_id: test.section_id,
      section_type: sectionType,
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

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="section-title">Open Test</h1>
            <p className="text-sm text-secondary mt-1 capitalize">{sectionType} test editor with manual and bulk question management</p>
          </div>
          <Link to={isTechnical ? `/faculty/technical/${test?.mode || 'practice'}` : `/faculty/aptitude/${test?.mode || 'practice'}`} className="btn btn-secondary btn-sm">Back</Link>
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
                <input className="input mt-1" value={testForm.name} onChange={(e) => setTestForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-secondary font-semibold">Test Image URL</label>
                <input className="input mt-1" placeholder="https://..." value={testForm.banner_url} onChange={(e) => setTestForm((p) => ({ ...p, banner_url: e.target.value }))} />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-secondary">
                  <UploadFileRoundedIcon sx={{ fontSize: 14 }} /> Upload Banner
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadTestBanner(e.target.files?.[0])} />
                </label>
                {testImageUploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                {testForm.banner_url ? <img src={testForm.banner_url} alt="" className="mt-2 w-full h-28 object-cover rounded-xl" loading="lazy" /> : null}
              </div>
              <div>
                <label className="text-xs text-secondary font-semibold">Description</label>
                <textarea className="input mt-1 h-20 resize-none" value={testForm.description} onChange={(e) => setTestForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-secondary font-semibold">Time Limit (minutes)</label>
                  <input type="number" className="input mt-1" value={testForm.time_limit_minutes} onChange={(e) => setTestForm((p) => ({ ...p, time_limit_minutes: e.target.value }))} />
                </div>
                {test.mode === 'competitor' ? (
                  <div>
                    <label className="text-xs text-secondary font-semibold">Max Attempts</label>
                    <input type="number" className="input mt-1" value={testForm.max_attempts} onChange={(e) => setTestForm((p) => ({ ...p, max_attempts: e.target.value }))} />
                  </div>
                ) : null}
                <div>
                  <label className="text-xs text-secondary font-semibold">Access Code (optional)</label>
                  <input className="input mt-1" value={testForm.access_code} onChange={(e) => setTestForm((p) => ({ ...p, access_code: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-secondary font-semibold">Branch Access</label>
                  <input className="input mt-1" placeholder="All branches if blank" value={testForm.branch} onChange={(e) => setTestForm((p) => ({ ...p, branch: e.target.value }))} />
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-secondary font-semibold md:col-span-3">
                  <input type="checkbox" checked={testForm.is_active !== false} onChange={(e) => setTestForm((p) => ({ ...p, is_active: e.target.checked }))} />
                  Enabled for students
                </label>
              </div>
            </div>

            <div className="card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-primary">Questions In This Test ({selectedQIds.length})</h2>
                <div className="flex gap-2">
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
                  <p className="text-xs text-secondary p-2">No questions yet in this section.</p>
                ) : questions.map((q) => (
                  <div key={q.id} className="p-2 rounded-lg hover:bg-surface-lighter">
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={selectedQIds.includes(q.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQIds((prev) => [...prev, q.id]);
                            } else {
                              setSelectedQIds((prev) => prev.filter((id) => id !== q.id));
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
                    {q.image_url ? <img src={q.image_url} alt="" className="mt-2 h-20 w-full rounded-lg object-contain bg-slate-50" loading="lazy" /> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button className="btn btn-primary" disabled={saveTest.isLoading} onClick={() => saveTest.mutate()}>
                {saveTest.isLoading ? 'Saving...' : 'Save Test'}
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
