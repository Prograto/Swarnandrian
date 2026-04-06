import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/common/DashboardLayout';
import BulkUploadTemplateCard from '../../components/common/BulkUploadTemplateCard';
import { FACULTY_NAV } from './FacultyDashboard';
import api from '../../utils/api';
import { QUESTION_TEMPLATE_COLUMNS, QUESTION_TEMPLATE_NOTES, downloadExcelTemplate } from '../../utils/bulkUploadTemplates';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import BuildCircleRoundedIcon from '@mui/icons-material/BuildCircleRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';

const TOPICS = ['Operating Systems','DBMS','Computer Networks','OOP','System Design','Data Structures','Algorithms','Software Engineering'];
const QTYPES = ['mcq','msq','nat','fill'];
const DIFFS  = ['Easy','Medium','Hard'];
const COURSES = ['BTech', 'MTech'];
const YEARS = [1, 2, 3, 4];
const SECTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];

const createTestFormDefaults = (currentMode) => ({
  name: '',
  banner_url: '',
  description: '',
  time_limit_minutes: 60,
  max_attempts: currentMode === 'competitor' ? 1 : '',
  max_violations: 3,
  access_code: '',
  branch: '',
  is_active: true,
});

export default function FacultyTechnical() {
  const { mode } = useParams();
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState(null);
  const [activeTab, setActiveTab] = useState('tests'); // tests focused
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showQModal, setShowQModal]   = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [sectionForm, setSectionForm] = useState({ name: '', banner_url: '', description: '', branch: '', course: '', year: '', section: '', is_active: true });
  const [sectionImageUploading, setSectionImageUploading] = useState(false);
  const [qForm, setQForm] = useState({ question_type:'mcq', question_text:'', options:'', correct_options:'', correct_answer:'', explanation:'', marks:1, negative_marks:0, difficulty:'Medium', image_url:'', branch:'', is_active:true });
  const [testForm, setTestForm] = useState(() => createTestFormDefaults(mode));
  const [testImageUploading, setTestImageUploading] = useState(false);
  const [selectedQIds, setSelectedQIds] = useState([]);

  const uploadImageToS3 = async (file, folder = 'technical-images') => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post(`/upload/?folder=${folder}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  };

  const handleSectionImageUpload = async (file) => {
    if (!file) return;
    setSectionImageUploading(true);
    try {
      const url = await uploadImageToS3(file, 'technical-sections');
      setSectionForm((prev) => ({ ...prev, banner_url: url }));
      toast.success('Section image uploaded');
    } catch {
      toast.error('Section image upload failed');
    } finally {
      setSectionImageUploading(false);
    }
  };

  const handleTestImageUpload = async (file) => {
    if (!file) return;
    setTestImageUploading(true);
    try {
      const url = await uploadImageToS3(file, 'technical-tests');
      setTestForm((prev) => ({ ...prev, banner_url: url }));
      toast.success('Test image uploaded');
    } catch {
      toast.error('Test image upload failed');
    } finally {
      setTestImageUploading(false);
    }
  };

  const downloadQuestionTemplate = async () => {
    try {
      await downloadExcelTemplate(api, '/technical/questions/bulk-upload/template', 'technical_questions_template.xlsx');
    } catch {
      toast.error('Template download failed');
    }
  };

  const { data: sections, isError: sectionsError, refetch: refetchSections } = useQuery('tech-sections', () => api.get('/technical/sections', { params: { mode } }).then(r => r.data));
  const { data: questions, isError: questionsError, refetch: refetchQuestions } = useQuery(['tech-questions', selectedSection],
    () => api.get('/technical/questions', { params: { section_id: selectedSection } }).then(r => r.data),
    { enabled: !!selectedSection }
  );
  const { data: tests, isError: testsError, refetch: refetchTests } = useQuery(['tech-tests', selectedSection, mode],
    () => api.get('/technical/tests', { params: { section_id: selectedSection, mode } }).then(r => r.data),
    { enabled: !!selectedSection }
  );

  const createSection = useMutation(
    (data) => api.post(`/technical/sections?mode=${mode}`, data),
    {
      onSuccess: () => {
        qc.invalidateQueries('tech-sections');
        setShowSectionModal(false);
        setSectionForm({ name: '', banner_url: '', description: '', branch: '', course: '', year: '', section: '', is_active: true });
        toast.success('Section created!');
      },
    }
  );
  const createQ = useMutation(
    data => api.post('/technical/questions', data),
    { onSuccess: () => { qc.invalidateQueries(['tech-questions', selectedSection]); setShowQModal(false); toast.success('Question added!'); } }
  );
  const deleteQ = useMutation(
    id => api.delete(`/technical/questions/${id}`),
    { onSuccess: () => { qc.invalidateQueries(['tech-questions', selectedSection]); toast.success('Deleted'); } }
  );
  const updateQ = useMutation(
    ({ id, payload }) => api.put(`/technical/questions/${id}`, payload),
    { onSuccess: () => { qc.invalidateQueries(['tech-questions', selectedSection]); toast.success('Question updated'); } }
  );

  const updateSection = useMutation(
    ({ id, payload }) => api.put(`/technical/sections/${id}`, payload),
    { onSuccess: () => { qc.invalidateQueries('tech-sections'); toast.success('Section updated'); } }
  );

  const deleteSection = useMutation(
    (id) => api.delete(`/technical/sections/${id}`),
    {
      onSuccess: () => {
        qc.invalidateQueries('tech-sections');
        setSelectedSection(null);
        toast.success('Section deleted');
      },
    }
  );
  const createTest = useMutation(
    data => api.post('/technical/tests', data),
    { onSuccess: () => { qc.invalidateQueries(['tech-tests', selectedSection, mode]); setShowTestModal(false); toast.success('Test created!'); } }
  );
  const updateTest = useMutation(
    ({ id, payload }) => api.put(`/technical/tests/${id}`, payload),
    { onSuccess: () => { qc.invalidateQueries(['tech-tests', selectedSection, mode]); toast.success('Test updated'); } }
  );
  const deleteTest = useMutation(
    (id) => api.delete(`/technical/tests/${id}`),
    { onSuccess: () => { qc.invalidateQueries(['tech-tests', selectedSection, mode]); toast.success('Test deleted'); } }
  );
  const toggleTest = useMutation(
    (id) => api.patch(`/technical/tests/${id}/toggle`),
    { onSuccess: () => { qc.invalidateQueries(['tech-tests', selectedSection, mode]); toast.success('Test updated'); } }
  );
  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedSection) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await api.post(`/technical/questions/bulk-upload?section_id=${selectedSection}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${r.data.created} questions imported`);
      qc.invalidateQueries(['tech-questions', selectedSection]);
    } catch { toast.error('Bulk upload failed'); }
    e.target.value = '';
  };

  const handleEditSection = (section) => {
    setEditingSection(section);
    setSectionForm({ name: section.name || '', banner_url: section.banner_url || '', description: section.description || '', branch: section.branch || '', course: section.course || '', year: section.year ?? '', section: section.section || '', is_active: section.is_active !== false });
    setShowSectionModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setBulkMode(false);
    setQForm({
      question_type: question.question_type || 'mcq',
      question_text: question.question_text || '',
      options: Array.isArray(question.options) ? question.options.join(' | ') : '',
      correct_options: Array.isArray(question.correct_options) ? question.correct_options.map((index) => index + 1).join(',') : '',
      correct_answer: question.correct_answer || '',
      explanation: question.explanation || '',
      marks: question.marks ?? 1,
      negative_marks: question.negative_marks ?? 0,
      difficulty: question.difficulty || 'Medium',
      image_url: question.image_url || '',
      branch: question.branch || '',
      is_active: question.is_active !== false,
    });
    setShowQModal(true);
  };

  const handleEditTest = (test) => {
    setEditingTest(test);
    setSelectedQIds(test.question_ids || []);
    setTestForm({
      name: test.name || '',
      banner_url: test.banner_url || '',
      description: test.description || '',
      time_limit_minutes: test.time_limit_minutes ?? 60,
      max_attempts: test.max_attempts ?? (mode === 'competitor' ? 1 : ''),
      max_violations: test.max_violations ?? 3,
      access_code: test.access_code || '',
      branch: test.branch || '',
      is_active: test.is_active !== false,
    });
    setShowTestModal(true);
  };

  const handleSaveSection = () => {
    const payload = {
      type: 'technical',
      name: sectionForm.name,
      banner_url: sectionForm.banner_url || null,
      description: sectionForm.description || null,
      branch: sectionForm.branch || null,
      course: sectionForm.course || null,
      year: sectionForm.year === '' ? null : Number(sectionForm.year),
      section: sectionForm.section || null,
      is_active: sectionForm.is_active !== false,
    };

    if (editingSection) {
      updateSection.mutate({ id: editingSection.id, payload }, {
        onSuccess: () => {
          setShowSectionModal(false);
          setEditingSection(null);
          setSectionForm({ name: '', banner_url: '', description: '', branch: '', course: '', year: '', section: '', is_active: true });
        },
      });
      return;
    }

    createSection.mutate(payload, {
      onSuccess: () => {
        setShowSectionModal(false);
        setEditingSection(null);
        setSectionForm({ name: '', banner_url: '', description: '', branch: '', course: '', year: '', section: '', is_active: true });
      },
    });
  };

  const handleSaveQuestion = () => {
    const opts = qForm.options ? qForm.options.split('|').map(o=>o.trim()).filter(Boolean) : null;
    const corrOpts = qForm.correct_options ? qForm.correct_options.split(',').map(x=>parseInt(x.trim())).filter(n=>!isNaN(n)) : null;
    const payload = {
      section_id: selectedSection,
      section_type: 'technical',
      question_type: qForm.question_type,
      question_text: qForm.question_text,
      image_url: qForm.image_url || null,
      options: opts,
      correct_options: corrOpts,
      correct_answer: qForm.correct_answer || null,
      explanation: qForm.explanation || null,
      marks: +qForm.marks,
      negative_marks: +qForm.negative_marks,
      difficulty: qForm.difficulty,
      branch: qForm.branch || null,
      is_active: qForm.is_active !== false,
    };

    if (editingQuestion) {
      updateQ.mutate({ id: editingQuestion.id, payload }, {
        onSuccess: () => {
          setShowQModal(false);
          setEditingQuestion(null);
          setBulkMode(false);
          setQForm({ question_type:'mcq', question_text:'', options:'', correct_options:'', correct_answer:'', explanation:'', marks:1, negative_marks:0, difficulty:'Medium', image_url:'', branch:'', is_active:true });
        },
      });
      return;
    }

    createQ.mutate(payload, {
      onSuccess: () => {
        setShowQModal(false);
        setEditingQuestion(null);
        setBulkMode(false);
        setQForm({ question_type:'mcq', question_text:'', options:'', correct_options:'', correct_answer:'', explanation:'', marks:1, negative_marks:0, difficulty:'Medium', image_url:'', branch:'', is_active:true });
      },
    });
  };

  const handleSaveTest = () => {
    const payload = {
      section_id: selectedSection,
      section_type: 'technical',
      name: testForm.name,
      banner_url: testForm.banner_url || null,
      description: testForm.description || null,
      mode,
      question_ids: selectedQIds,
      time_limit_minutes: +testForm.time_limit_minutes,
      max_attempts: testForm.max_attempts === '' ? null : Number(testForm.max_attempts),
      max_violations: Number(testForm.max_violations) || 3,
      access_code: testForm.access_code || null,
      branch: testForm.branch || null,
      is_active: testForm.is_active !== false,
    };

    if (editingTest) {
      updateTest.mutate({ id: editingTest.id, payload }, {
        onSuccess: () => {
          setShowTestModal(false);
          setEditingTest(null);
          setSelectedQIds([]);
          setTestForm(createTestFormDefaults(mode));
        },
      });
      return;
    }

    createTest.mutate(payload, {
      onSuccess: () => {
        setShowTestModal(false);
        setEditingTest(null);
        setSelectedQIds([]);
        setTestForm(createTestFormDefaults(mode));
      },
    });
  };

  const qs = questions?.questions || [];

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      {/* Section Modal */}
      <AnimatePresence>
        {showSectionModal && (
          <div data-lenis-prevent className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center">
            <motion.div data-lenis-prevent initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain my-4" style={{ touchAction: 'pan-y' }}>
              <h3 className="font-bold text-gray-800 text-lg mb-4">{editingSection ? 'Edit Technical Section' : 'New Technical Section'}</h3>
              <p className="text-xs text-gray-400 mb-3">Suggested: {TOPICS.map(t => <button key={t} onClick={()=>setSectionForm(f=>({...f,name:t}))} className="mr-1 mb-1 px-2 py-0.5 rounded-md bg-gray-100 hover:bg-purple-100 hover:text-purple-600 text-xs transition-colors">{t}</button>)}</p>
              <div className="space-y-3 mb-4">
                <input className="input" placeholder="Section name" value={sectionForm.name} onChange={e=>setSectionForm(f=>({...f,name:e.target.value}))} />
                <input className="input" placeholder="Section image URL (optional)" value={sectionForm.banner_url} onChange={e=>setSectionForm(f=>({...f,banner_url:e.target.value}))} />
                <label className="block text-xs text-gray-500 font-medium">
                  Upload Section Image (optional)
                  <input type="file" accept="image/*" className="input mt-1" onChange={(e)=>handleSectionImageUpload(e.target.files?.[0])} />
                </label>
                {sectionImageUploading && <p className="text-xs text-blue-500">Uploading image...</p>}
                {sectionForm.banner_url && <img src={sectionForm.banner_url} alt="Section" className="w-full h-24 object-cover rounded-xl" loading="lazy" />}
                <textarea className="input h-20 resize-none" placeholder="Section description (optional)" value={sectionForm.description} onChange={e=>setSectionForm(f=>({...f,description:e.target.value}))} />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block font-medium">Branch Access</label><input className="input" placeholder="All branches if blank" value={sectionForm.branch} onChange={e=>setSectionForm(f=>({...f,branch:e.target.value}))} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block font-medium">Course Access</label><select className="input" value={sectionForm.course} onChange={e=>setSectionForm(f=>({...f,course:e.target.value}))}><option value="">All courses</option>{COURSES.map((course)=><option key={course} value={course}>{course}</option>)}</select></div>
                  <div><label className="text-xs text-gray-500 mb-1 block font-medium">Year Access</label><select className="input" value={sectionForm.year} onChange={e=>setSectionForm(f=>({...f,year:e.target.value}))}><option value="">All years</option>{YEARS.map((year)=><option key={year} value={year}>{year}</option>)}</select></div>
                  <div><label className="text-xs text-gray-500 mb-1 block font-medium">Student Section Access</label><select className="input" value={sectionForm.section} onChange={e=>setSectionForm(f=>({...f,section:e.target.value}))}><option value="">All sections</option>{SECTION_CODES.map((code)=><option key={code} value={code}>{code}</option>)}</select></div>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium mt-6"><input type="checkbox" checked={sectionForm.is_active !== false} onChange={e=>setSectionForm(f=>({...f,is_active:e.target.checked}))} />Enabled for students</label>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={()=>{setShowSectionModal(false);setEditingSection(null);setSectionForm({ name: '', banner_url: '', description: '', branch: '', course: '', year: '', section: '', is_active: true });setSectionImageUploading(false);}} className="btn-ghost">Cancel</button>
                <button onClick={handleSaveSection} className="btn-primary">{editingSection ? 'Save Changes' : 'Create'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Question Modal */}
      <AnimatePresence>
        {showQModal && (
          <div data-lenis-prevent className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center">
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain my-4" style={{ touchAction: 'pan-y' }}>
              <div className="sticky top-0 z-10 -mx-6 px-6 pt-1 pb-4 bg-white/95 backdrop-blur flex items-center justify-between border-b border-gray-100 mb-4">
                <h3 className="font-bold text-gray-800 text-lg">{editingQuestion ? 'Edit Question' : 'Add Question'}</h3>
                <div className="flex gap-2">
                  <button onClick={()=>{setBulkMode(false);setEditingQuestion(null);setQForm({ question_type:'mcq', question_text:'', options:'', correct_options:'', correct_answer:'', explanation:'', marks:1, negative_marks:0, difficulty:'Medium', image_url:'', branch:'', is_active:true });}} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${!bulkMode?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-500'}`}>Single</button>
                  <button onClick={()=>{setBulkMode(true);setEditingQuestion(null);setQForm({ question_type:'mcq', question_text:'', options:'', correct_options:'', correct_answer:'', explanation:'', marks:1, negative_marks:0, difficulty:'Medium', image_url:'', branch:'', is_active:true });}} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${bulkMode?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-500'}`}>Bulk Upload</button>
                </div>
              </div>

              {bulkMode ? (
                <div className="space-y-4">
                  <BulkUploadTemplateCard
                    title="Question Bulk Upload Format"
                    description="Upload one question per row using the downloadable Excel template below."
                    columns={QUESTION_TEMPLATE_COLUMNS}
                    notes={QUESTION_TEMPLATE_NOTES}
                    onDownload={downloadQuestionTemplate}
                  />
                  <div className="border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center">
                    <p className="text-3xl mb-2 inline-flex"><FolderOpenRoundedIcon sx={{fontSize:30}}/></p>
                    <p className="text-sm text-gray-500 mb-3">Upload Excel file with questions</p>
                    <label className="btn-primary cursor-pointer">
                      Choose File
                      <input type="file" accept=".xlsx" className="hidden" onChange={(e)=>{ handleBulkUpload(e); setShowQModal(false); }} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium">Question Type</label>
                      <select className="input" value={qForm.question_type} onChange={e=>setQForm(f=>({...f,question_type:e.target.value}))}>
                        {QTYPES.map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium">Difficulty</label>
                      <select className="input" value={qForm.difficulty} onChange={e=>setQForm(f=>({...f,difficulty:e.target.value}))}>
                        {DIFFS.map(d=><option key={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Question Text *</label>
                    <textarea className="input h-20 resize-none" placeholder="Enter your question..." value={qForm.question_text} onChange={e=>setQForm(f=>({...f,question_text:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Image URL (optional)</label>
                    <input className="input" placeholder="https://..." value={qForm.image_url} onChange={e=>setQForm(f=>({...f,image_url:e.target.value}))} />
                  </div>
                  {['mcq','msq'].includes(qForm.question_type) && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Options (pipe-separated: A|B|C|D)</label>
                        <input className="input" placeholder="Option A|Option B|Option C|Option D" value={qForm.options} onChange={e=>setQForm(f=>({...f,options:e.target.value}))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Correct option indices (1-based, comma-separated)</label>
                        <input className="input" placeholder="e.g. 1 or 1,3 for MSQ" value={qForm.correct_options} onChange={e=>setQForm(f=>({...f,correct_options:e.target.value}))} />
                      </div>
                    </>
                  )}
                  {['nat','fill'].includes(qForm.question_type) && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium">Correct Answer</label>
                      <input className="input" placeholder="Exact answer" value={qForm.correct_answer} onChange={e=>setQForm(f=>({...f,correct_answer:e.target.value}))} />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Explanation (shown after submission)</label>
                    <input className="input" placeholder="Why is this the answer?" value={qForm.explanation} onChange={e=>setQForm(f=>({...f,explanation:e.target.value}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium">Branch Access</label>
                      <input className="input" placeholder="All branches if blank" value={qForm.branch} onChange={e=>setQForm(f=>({...f,branch:e.target.value}))} />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium mt-6"><input type="checkbox" checked={qForm.is_active !== false} onChange={e=>setQForm(f=>({...f,is_active:e.target.checked}))} />Enabled for students</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium">Marks</label>
                      <input className="input" type="number" value={qForm.marks} onChange={e=>setQForm(f=>({...f,marks:e.target.value}))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium">Negative Marks</label>
                      <input className="input" type="number" step="0.25" value={qForm.negative_marks} onChange={e=>setQForm(f=>({...f,negative_marks:e.target.value}))} />
                    </div>
                  </div>
                </div>
              )}
              {!bulkMode && (
                <div className="sticky bottom-0 z-10 -mx-6 px-6 pt-4 pb-1 bg-white/95 backdrop-blur flex gap-3 justify-end mt-4 border-t border-gray-100">
                  <button onClick={()=>{setShowQModal(false);setEditingQuestion(null);setBulkMode(false);setQForm({ question_type:'mcq', question_text:'', options:'', correct_options:'', correct_answer:'', explanation:'', marks:1, negative_marks:0, difficulty:'Medium', image_url:'', branch:'', is_active:true });}} className="btn-ghost">Cancel</button>
                  <button onClick={handleSaveQuestion} disabled={createQ.isLoading || updateQ.isLoading} className="btn-primary">{editingQuestion ? 'Save Changes' : 'Add Question'}</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Test Modal */}
      <AnimatePresence>
        {showTestModal && (
          <div data-lenis-prevent className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center">
            <motion.div data-lenis-prevent initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain my-4" style={{ touchAction: 'pan-y' }}>
              <h3 className="font-bold text-gray-800 text-lg mb-4">{editingTest ? 'Edit Test' : 'Create Test'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Test Name *</label>
                  <input className="input" placeholder="e.g. OS Mock Test 1" value={testForm.name} onChange={e=>setTestForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Test Image URL (optional)</label>
                  <input className="input" placeholder="https://..." value={testForm.banner_url} onChange={e=>setTestForm(f=>({...f,banner_url:e.target.value}))} />
                </div>
                <label className="block text-xs text-gray-500 font-medium">
                  Upload Test Image (optional)
                  <input type="file" accept="image/*" className="input mt-1" onChange={(e)=>handleTestImageUpload(e.target.files?.[0])} />
                </label>
                {testImageUploading && <p className="text-xs text-blue-500">Uploading image...</p>}
                {testForm.banner_url && <img src={testForm.banner_url} alt="Test" className="w-full h-24 object-cover rounded-xl" loading="lazy" />}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Description (optional)</label>
                  <textarea className="input h-20 resize-none" placeholder="Test notes or instructions" value={testForm.description} onChange={e=>setTestForm(f=>({...f,description:e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Select Questions ({selectedQIds.length} selected)</label>
                  <div data-lenis-prevent-wheel data-lenis-prevent-touch className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                    {qs.map(q=>(
                      <label key={q.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedQIds.includes(q.id)} onChange={e=>setSelectedQIds(prev=>e.target.checked?[...prev,q.id]:prev.filter(id=>id!==q.id))} className="mt-0.5" />
                        <span className="text-xs text-gray-700 line-clamp-2">{q.question_text}</span>
                      </label>
                    ))}
                    {qs.length===0 && <p className="text-xs text-gray-400 p-2">Add questions to this section first.</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Time Limit (minutes)</label>
                    <input className="input" type="number" value={testForm.time_limit_minutes} onChange={e=>setTestForm(f=>({...f,time_limit_minutes:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Max Attempts (leave blank for unlimited)</label>
                    <input className="input" type="number" min="1" placeholder="Unlimited" value={testForm.max_attempts} onChange={e=>setTestForm(f=>({...f,max_attempts:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Max Violations Before Auto Submit</label>
                    <input className="input" type="number" min="1" value={testForm.max_violations} onChange={e=>setTestForm(f=>({...f,max_violations:e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Access Code (optional)</label>
                  <input className="input" placeholder="Leave blank for open access" value={testForm.access_code} onChange={e=>setTestForm(f=>({...f,access_code:e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Branch Access</label>
                    <input className="input" placeholder="All branches if blank" value={testForm.branch} onChange={e=>setTestForm(f=>({...f,branch:e.target.value}))} />
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium mt-6"><input type="checkbox" checked={testForm.is_active !== false} onChange={e=>setTestForm(f=>({...f,is_active:e.target.checked}))} />Enabled for students</label>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button onClick={()=>{setShowTestModal(false);setEditingTest(null);setSelectedQIds([]);setTestForm(createTestFormDefaults(mode));setTestImageUploading(false);}} className="btn-ghost">Cancel</button>
                <button onClick={handleSaveTest} disabled={createTest.isLoading || updateTest.isLoading} className="btn-primary">{editingTest ? 'Save Changes' : 'Create Test'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="section-title inline-flex items-center gap-2">Technical — {mode==='practice'?<><MenuBookRoundedIcon sx={{fontSize:20}}/> Practice</>:<><EmojiEventsRoundedIcon sx={{fontSize:20}}/> Competitor</>}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{mode==='practice'?'Unlimited attempts, solutions visible after submission':'Scored tests that appear on the leaderboard'}</p>
          </div>
          <button onClick={()=>{setEditingSection(null);setSectionForm({ name:'', banner_url:'', description:'', branch:'', course:'', year:'', section:'', is_active:true });setShowSectionModal(true);}} className="btn-primary text-sm">+ New Section</button>
        </div>

        <div className="grid lg:grid-cols-4 gap-5">
          {/* Sections */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Sections</p>
            {sectionsError ? (
              <div className="card p-4 text-center text-sm text-red-600">
                Failed to load sections.
                <button type="button" onClick={() => refetchSections()} className="mt-2 btn-secondary text-xs">Retry</button>
              </div>
            ) : (
              <>
                {sections?.map(s=>(
                  <button key={s.id} onClick={()=>{ setSelectedSection(s.id); setActiveTab('tests'); }}
                    className={`w-full text-left rounded-xl border overflow-hidden transition-all text-sm ${selectedSection===s.id?'border-purple-300 shadow-md':'border-gray-100 hover:border-purple-200 bg-white'}`}>
                    {s.banner_url && <img src={s.banner_url} alt="" className="w-full h-20 object-contain bg-slate-50" loading="lazy" />}
                    <div className={`px-4 py-3 ${selectedSection===s.id?'bg-purple-50':'bg-white'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${selectedSection===s.id?'text-[#6C63FF]':'text-gray-600'}`}>{s.name}<span className="text-xs text-gray-400 font-normal ml-1">({s.question_count})</span></p>
                        <div className="flex gap-1">
                          <button type="button" onClick={(e)=>{e.stopPropagation(); handleEditSection(s);}} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Edit</button>
                          <button type="button" onClick={(e)=>{e.stopPropagation(); if(window.confirm('Delete this section and all its tests/questions?')) deleteSection.mutate(s.id);}} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">Delete</button>
                        </div>
                      </div>
                      {s.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.description}</p>}
                    </div>
                  </button>
                ))}
                {!sections?.length && <p className="text-xs text-gray-400 px-1">No sections yet.</p>}
              </>
            )}
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-4">
            {selectedSection ? (
              <>
                {/* Tabs */}
                <div className="flex items-center justify-between">
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    <button className="mode-tab px-4 py-2 text-sm active">Tests</button>
                  </div>
                  <button onClick={()=>{setEditingTest(null);setSelectedQIds([]);setTestForm(createTestFormDefaults(mode));setShowTestModal(true);}} className="btn-primary text-sm">+ Create Test</button>
                </div>

                {activeTab==='questions' && (questionsError ? (
                  <div className="card p-10 text-center text-red-600">
                    Failed to load questions.
                    <button type="button" onClick={() => refetchQuestions()} className="mt-2 btn-secondary text-xs">Retry</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {qs.map((q,i)=>(
                      <motion.div key={q.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                        className="card p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex gap-1.5 shrink-0 flex-wrap">
                            <span className={`badge-${q.difficulty?.toLowerCase()}`}>{q.difficulty}</span>
                            <span className="badge bg-purple-100 text-purple-700 uppercase">{q.question_type}</span>
                            <span className="badge bg-amber-100 text-amber-700">{q.marks}pt</span>
                          </div>
                          <button onClick={()=>handleEditQuestion(q)} className="ml-auto text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors shrink-0">Edit</button>
                          <button onClick={()=>deleteQ.mutate(q.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0">Delete</button>
                        </div>
                        <p className="text-sm text-gray-700 mt-2 line-clamp-3">{q.question_text}</p>
                        {q.image_url && <img src={q.image_url} alt="" className="mt-2 h-20 object-contain rounded-lg" loading="lazy"/>}
                        {q.options && (
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {q.options.map((o,j)=><span key={j} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-gray-600">{j + 1}. {o}</span>)}
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {qs.length===0&&<div className="card p-12 text-center"><p className="text-4xl mb-2 inline-flex"><QuizRoundedIcon sx={{fontSize:34}}/></p><p className="text-gray-400">No questions yet. Add one above!</p></div>}
                  </div>
                ))}

                {activeTab==='tests' && (testsError ? (
                  <div className="card p-10 text-center text-red-600">
                    Failed to load tests.
                    <button type="button" onClick={() => refetchTests()} className="mt-2 btn-secondary text-xs">Retry</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tests?.map((t,i)=>(
                      <div key={t.id} className="card p-5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          {t.banner_url && <img src={t.banner_url} alt="" className="mb-2 w-full max-w-[320px] h-24 object-contain bg-slate-50 rounded-lg" loading="lazy" />}
                          <p className="font-semibold text-gray-800">{t.name}</p>
                          {t.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>}
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            <span className="badge bg-gray-100 text-gray-600">{t.question_ids?.length||0} questions</span>
                            <span className="badge bg-gray-100 text-gray-600 inline-flex items-center gap-1"><TimerOutlinedIcon sx={{fontSize:14}}/> {t.time_limit_minutes}min</span>
                            {t.max_attempts&&<span className="badge bg-amber-100 text-amber-700">Max {t.max_attempts} attempts</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`badge ${t.is_active === false ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.is_active === false ? 'Disabled' : 'Enabled'}</span>
                          <span className="badge bg-emerald-100 text-emerald-700 capitalize">{t.mode}</span>
                          <div className="flex gap-1.5">
                            <Link to={`/test/${t.id}?section_type=technical`} className="text-[11px] px-2 py-1 rounded bg-indigo-50 text-indigo-600">Preview</Link>
                            <Link to={`/faculty/tests/${t.id}/results`} className="text-[11px] px-2 py-1 rounded bg-amber-50 text-amber-600">Results</Link>
                            <Link to={`/faculty/technical/tests/${t.id}/edit`} className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-600">Open Test</Link>
                            <button onClick={()=>toggleTest.mutate(t.id)} className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-700">{t.is_active === false ? 'Enable' : 'Disable'}</button>
                            <button onClick={()=>{if(window.confirm('Delete this test?')) deleteTest.mutate(t.id);}} className="text-[11px] px-2 py-1 rounded bg-red-50 text-red-600">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!tests?.length&&<div className="card p-12 text-center"><p className="text-4xl mb-2 inline-flex"><QuizRoundedIcon sx={{fontSize:34}}/></p><p className="text-gray-400">No tests yet. Create one above!</p></div>}
                  </div>
                ))}
              </>
            ) : (
              <div className="card p-16 text-center">
                <p className="text-5xl mb-3 inline-flex"><BuildCircleRoundedIcon sx={{fontSize:40}}/></p>
                <p className="text-gray-500 font-medium">Select a section to manage questions and tests</p>
                <button onClick={()=>{setEditingSection(null);setSectionForm({ name:'', banner_url:'', description:'', branch:'', course:'', year:'', section:'', is_active:true });setShowSectionModal(true);}} className="btn-primary mt-4 text-sm">Create First Section</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
