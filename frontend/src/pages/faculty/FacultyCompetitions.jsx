import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/common/DashboardLayout';
import { FACULTY_NAV } from './FacultyDashboard';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import {
  RiAddLine, RiTrophyLine, RiTimeLine, RiKeyLine, RiCodeLine,
  RiQuestionLine, RiCloseLine, RiEditLine, RiDeleteBinLine,
  RiArrowRightLine, RiLeafLine, RiBarChartLine, RiToggleLine,
} from 'react-icons/ri';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';

const STATUS_STYLE = {
  upcoming:{ border:'border-l-amber-400',  badge:'badge-medium',     dot:'bg-amber-400' },
  active:  { border:'border-l-emerald-500',badge:'badge-live',       dot:'bg-emerald-500' },
  ended:   { border:'border-l-gray-300',   badge:'bg-gray-100 text-gray-400', dot:'bg-gray-300' },
};

const COURSES = ['BTech', 'MTech'];
const YEARS = [1, 2, 3, 4];
const SECTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F'];

const ADMIN_NAV = [
  { label:'Dashboard',   href:'/admin',             icon:<DashboardRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Users',       href:'/admin/users',       icon:<GroupRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Analytics',   href:'/admin/analytics',   icon:<InsightsRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Competitions',href:'/admin/competitions',icon:<RiTrophyLine className="w-4 h-4"/> },
];

// ── Test type config ─────────────────────────────────────────────────────────
const TEST_TYPES = [
  { value:'coding',   label:'Coding Problems', icon:<RiCodeLine/>,     color:'bg-blue-50 text-blue-700 border-blue-200' },
  { value:'aptitude', label:'Aptitude MCQ',    icon:<RiQuestionLine/>, color:'bg-pink-50 text-pink-700 border-pink-200' },
  { value:'technical',label:'Technical MCQ',   icon:<RiLeafLine/>,     color:'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const parseTags = (value = '') => value.split(',').map((tag) => tag.trim()).filter(Boolean);

// ── Section modal (create competition) ──────────────────────────────────────
function CompetitionModal({ open, onClose, onSave, loading, initialData }) {
  const [form, setForm] = useState({
    name:'', description:'', banner_url:'',
    start_time:'', end_time:'', access_code:'', max_attempts:1,
    course:'', year:'', section:'',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        banner_url: initialData.banner_url || '',
        start_time: initialData.start_time ? new Date(initialData.start_time).toISOString().slice(0, 16) : '',
        end_time: initialData.end_time ? new Date(initialData.end_time).toISOString().slice(0, 16) : '',
        access_code: initialData.access_code || '',
        max_attempts: initialData.max_attempts || 1,
        course: initialData.course || '',
        year: initialData.year ?? '',
        section: initialData.section || '',
      });
    } else {
      setForm({ name:'', description:'', banner_url:'', start_time:'', end_time:'', access_code:'', max_attempts:1, course:'', year:'', section:'' });
    }
  }, [open, initialData]);

  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const uploadBanner = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/?folder=competition-banners', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      f('banner_url', data.url);
      toast.success('Banner uploaded');
    } catch {
      toast.error('Banner upload failed');
    } finally {
      setUploading(false);
    }
  };
  if (!open) return null;
  return (
    <div data-lenis-prevent className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center">
      <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
        className="bg-white rounded-3xl w-full max-w-lg shadow-modal my-4 overflow-hidden max-h-[90vh]"
        style={{ touchAction: 'pan-y' }}>
        <div className="bg-gradient-to-r from-[#4F7CF3] to-[#7C8CFF] px-6 py-5">
          <div className="flex items-center justify-between">
            <div><h3 className="font-bold text-white text-lg">{initialData ? 'Edit Competition' : 'Create Competition'}</h3>
              <p className="text-blue-100 text-xs mt-0.5">Set up a new timed contest</p></div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"><RiCloseLine className="w-5 h-5"/></button>
          </div>
        </div>
        <div data-lenis-prevent className="p-6 space-y-4 max-h-[65vh] overflow-y-auto overscroll-contain touch-pan-y">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Competition Name *</label>
            <input className="input" placeholder="e.g. Hack the Code 2024" value={form.name} onChange={e=>f('name',e.target.value)}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Banner Image URL <span className="text-gray-300 font-normal">(optional)</span></label>
            <input className="input" placeholder="https://..." value={form.banner_url} onChange={e=>f('banner_url',e.target.value)}/>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-secondary">
              <UploadFileRoundedIcon sx={{ fontSize: 14 }} /> Upload Banner
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadBanner(e.target.files?.[0])} />
            </label>
            {uploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
            {form.banner_url && <img src={form.banner_url} alt="" className="mt-2 w-full h-28 object-cover rounded-xl" loading="lazy"/>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
            <textarea className="input h-20 resize-none" placeholder="Brief description…" value={form.description} onChange={e=>f('description',e.target.value)}/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Start Date & Time *</label>
              <input className="input" type="datetime-local" value={form.start_time} onChange={e=>f('start_time',e.target.value)}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">End Date & Time *</label>
              <input className="input" type="datetime-local" value={form.end_time} onChange={e=>f('end_time',e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Access Code * <span className="text-gray-300 font-normal">(students use this to join)</span></label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="e.g. HACK2024" value={form.access_code} onChange={e=>f('access_code',e.target.value.toUpperCase())}/>
              <button onClick={()=>f('access_code',Math.random().toString(36).slice(2,8).toUpperCase())}
                className="btn btn-secondary btn-sm shrink-0">Generate</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Max Attempts per Student</label>
            <input className="input" type="number" min="1" value={form.max_attempts} onChange={e=>f('max_attempts',e.target.value)}/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Course Access</label>
              <select className="input" value={form.course} onChange={e=>f('course',e.target.value)}>
                <option value="">All courses</option>
                {COURSES.map((course) => <option key={course} value={course}>{course}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Year Access</label>
              <select className="input" value={form.year} onChange={e=>f('year',e.target.value)}>
                <option value="">All years</option>
                {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Student Section Access</label>
              <select className="input" value={form.section} onChange={e=>f('section',e.target.value)}>
                <option value="">All sections</option>
                {SECTION_CODES.map((sectionCode) => <option key={sectionCode} value={sectionCode}>{sectionCode}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end border-t border-gray-100 pt-4">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={()=>onSave(form)} disabled={loading} className="btn btn-primary">
            <RiTrophyLine className="w-4 h-4"/>
            {loading ? (initialData ? 'Saving…' : 'Creating…') : (initialData ? 'Save Changes' : 'Create Competition')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Test modal (add test to competition) ─────────────────────────────────────
function TestModal({ open, onClose, onSave, loading, initialData }) {
  const [form, setForm] = useState({
    name:'', test_type:'coding', section_id:'', tags:'', time_limit_minutes:60,
    access_code:'', banner_url:'', description:'', question_ids:[], problem_ids:[],
  });
  const [questionIdsText, setQuestionIdsText] = useState('');
  const [problemIdsText, setProblemIdsText] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        name: initialData.name || '',
        test_type: initialData.test_type || 'coding',
        section_id: initialData.section_id || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '',
        time_limit_minutes: initialData.time_limit_minutes || 60,
        access_code: initialData.access_code || '',
        banner_url: initialData.banner_url || '',
        description: initialData.description || '',
        question_ids: initialData.question_ids || [],
        problem_ids: initialData.problem_ids || [],
      });
      setQuestionIdsText((initialData.question_ids || []).join(','));
      setProblemIdsText((initialData.problem_ids || []).join(','));
    } else {
      setForm({ name:'', test_type:'coding', section_id:'', tags:'', time_limit_minutes:60, access_code:'', banner_url:'', description:'', question_ids:[], problem_ids:[] });
      setQuestionIdsText('');
      setProblemIdsText('');
      setBulkFile(null);
    }
  }, [open, initialData]);

  const isCodingTest = form.test_type === 'coding';
  const sectionApiBase = isCodingTest ? '/coding' : `/${form.test_type}`;
  const { data: availableSections = [] } = useQuery(
    ['competition-test-modal-sections', form.test_type],
    () => api.get(`${sectionApiBase}/sections`, { params: { mode: 'competitor' } }).then((r) => r.data || []),
    { enabled: open }
  );

  const setTestType = (value) => {
    setForm((prev) => ({
      ...prev,
      test_type: value,
      section_id: '',
      tags: '',
      question_ids: [],
      problem_ids: [],
    }));
    setQuestionIdsText('');
    setProblemIdsText('');
  };

  if (!open) return null;

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file.name);
    toast.success(`${file.name} ready — will be uploaded with test`);
  };

  const uploadBanner = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload/?folder=competition-test-banners', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      f('banner_url', data.url);
      toast.success('Test banner uploaded');
    } catch {
      toast.error('Test banner upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div data-lenis-prevent className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center">
      <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
        className="bg-white rounded-3xl w-full max-w-xl shadow-modal my-4 overflow-hidden max-h-[90vh]"
        style={{ touchAction: 'pan-y' }}>
        <div className="bg-gradient-to-r from-[#7C8CFF] to-[#9B8FFF] px-6 py-5">
          <div className="flex items-center justify-between">
            <div><h3 className="font-bold text-white text-lg">Add Test to Competition</h3>
              <p className="text-blue-100 text-xs mt-0.5">Configure test settings and content</p></div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"><RiCloseLine className="w-5 h-5"/></button>
          </div>
        </div>
        <div data-lenis-prevent className="p-6 space-y-5 max-h-[70vh] overflow-y-auto overscroll-contain touch-pan-y">
          {/* Test name */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Test Name *</label>
            <input className="input" placeholder="e.g. Round 1 – Coding" value={form.name} onChange={e=>f('name',e.target.value)}/>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Banner Image URL <span className="text-gray-300 font-normal">(optional)</span></label>
            <input className="input" placeholder="https://..." value={form.banner_url} onChange={e=>f('banner_url',e.target.value)}/>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-secondary">
              <UploadFileRoundedIcon sx={{ fontSize: 14 }} /> Upload Banner
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadBanner(e.target.files?.[0])} />
            </label>
            {uploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
            {form.banner_url && <img src={form.banner_url} alt="" className="mt-2 w-full h-28 object-cover rounded-xl" loading="lazy"/>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description <span className="text-gray-300 font-normal">(optional)</span></label>
            <textarea className="input h-20 resize-none" placeholder="What this test covers" value={form.description} onChange={e=>f('description',e.target.value)}/>
          </div>

          {/* Test type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Test Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TEST_TYPES.map(t=>(
                <button key={t.value} onClick={()=>setTestType(t.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-semibold transition-all ${form.test_type===t.value?'border-[#4F7CF3] bg-blue-50 text-[#4F7CF3]':'border-gray-100 text-gray-500 hover:border-blue-200'}`}>
                  <span className="text-lg">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Content Section <span className="text-gray-300 font-normal">(optional)</span></label>
            <select className="input" value={form.section_id} onChange={(e) => f('section_id', e.target.value)}>
              <option value="">Choose a section</option>
              {availableSections.map((section) => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-secondary">Leave it blank to keep the test generic, or choose a section if you want a fixed question bank source.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tags <span className="text-gray-300 font-normal">(optional)</span></label>
            <input className="input" placeholder="round 1, elimination, beginner-friendly" value={form.tags} onChange={(e) => f('tags', e.target.value)} />
            <p className="mt-1 text-[11px] text-secondary">Use tags to label the competition test without tying it to a specific section.</p>
          </div>

          {/* Time + access code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Time Limit (minutes)</label>
              <input className="input" type="number" value={form.time_limit_minutes} onChange={e=>f('time_limit_minutes',+e.target.value)}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Access Code <span className="text-gray-300 font-normal">(optional)</span></label>
              <input className="input" placeholder="Leave blank = open" value={form.access_code} onChange={e=>f('access_code',e.target.value)}/>
            </div>
          </div>

          {/* Content section */}
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">Question management moved to Open Test page</p>
              <p>Create this test first, then use Open Test to add questions manually or via bulk upload.</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end border-t border-gray-100 pt-4">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={()=>onSave(form)} disabled={loading} className="btn btn-primary">
            <RiAddLine className="w-4 h-4"/>
            {loading ? 'Saving…' : (initialData ? 'Save Test' : 'Add Test')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function FacultyCompetitions() {
  const role = useAuthStore((state) => state.role);
  const isAdmin = role === 'admin';
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [showTest,   setShowTest]   = useState(null); // comp id
  const [editingTest, setEditingTest] = useState(null);
  const [expanded,   setExpanded]   = useState(null); // comp id for detail view

  const { data: competitions, isLoading } = useQuery('competitions',
    () => api.get('/competitions/').then(r=>r.data),
    { onError:()=>toast.error('Failed to load competitions') }
  );

  const { data: competitionTests = [] } = useQuery(
    ['competition-tests', expanded],
    () => api.get(`/competitions/${expanded}/tests`).then((r) => r.data),
    {
      enabled: !!expanded,
      onError: () => toast.error('Failed to load tests for competition'),
    }
  );

  const createComp = useMutation(
    data => api.post('/competitions/', {
      ...data,
      start_time: new Date(data.start_time).toISOString(),
      end_time:   new Date(data.end_time).toISOString(),
      max_attempts: parseInt(data.max_attempts)||1,
    }),
    {
      onSuccess:()=>{ qc.invalidateQueries('competitions'); setShowCreate(false); toast.success('Competition created!'); },
      onError: err => toast.error(err?.response?.data?.detail||'Failed to create'),
    }
  );

  const addTest = useMutation(
    ({compId,data})=>api.post(`/competitions/${compId}/tests`,{...data,competition_id:compId,tags:parseTags(data.tags)}),
    { onSuccess:()=>{ qc.invalidateQueries('competitions'); setShowTest(null); toast.success('Test added!'); },
      onError:err=>toast.error(err?.response?.data?.detail||'Failed to add test') }
  );

  const updateTest = useMutation(
    ({ compId, testId, data }) => api.put(`/competitions/${compId}/tests/${testId}`, { ...data, competition_id: compId, tags: parseTags(data.tags) }),
    {
      onSuccess: () => {
        qc.invalidateQueries(['competition-tests', expanded]);
        setEditingTest(null);
        toast.success('Competition test updated');
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update test'),
    }
  );

  const deleteTest = useMutation(
    ({ compId, testId }) => api.delete(`/competitions/${compId}/tests/${testId}`),
    {
      onSuccess: () => {
        qc.invalidateQueries(['competition-tests', expanded]);
        qc.invalidateQueries('competitions');
        toast.success('Competition test deleted');
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to delete test'),
    }
  );

  const toggleTest = useMutation(
    ({ compId, testId }) => api.patch(`/competitions/${compId}/tests/${testId}/toggle`),
    {
      onSuccess: () => {
        qc.invalidateQueries(['competition-tests', expanded]);
        qc.invalidateQueries('competitions');
        toast.success('Competition test updated');
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update competition test'),
    }
  );

  const toggleComp = useMutation(
    id=>api.patch(`/competitions/${id}/toggle`),
    { onSuccess:()=>{ qc.invalidateQueries('competitions'); toast.success('Updated!'); },
      onError:()=>toast.error('Failed') }
  );

  const updateComp = useMutation(
    ({ compId, data }) => api.put(`/competitions/${compId}`, {
      ...data,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      max_attempts: parseInt(data.max_attempts) || 1,
    }),
    {
      onSuccess: () => {
        qc.invalidateQueries('competitions');
        setEditingComp(null);
        toast.success('Competition updated');
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Update failed'),
    }
  );

  const deleteComp = useMutation(
    (compId) => api.delete(`/competitions/${compId}`),
    {
      onSuccess: () => {
        qc.invalidateQueries('competitions');
        toast.success('Competition deleted');
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Delete failed'),
    }
  );

  const stats = [
    { label:'Total',    value:competitions?.length||0,                                color:'card-lavender' },
    { label:'Active',   value:competitions?.filter(c=>c.status==='active').length||0,  color:'card-mint' },
    { label:'Upcoming', value:competitions?.filter(c=>c.status==='upcoming').length||0, color:'card-yellow' },
    { label:'Ended',    value:competitions?.filter(c=>c.status==='ended').length||0,    color:'bg-gray-50 border border-gray-200 rounded-2xl' },
  ];

  return (
    <DashboardLayout navItems={isAdmin ? ADMIN_NAV : FACULTY_NAV} role={isAdmin ? 'admin' : 'faculty'}>
      <AnimatePresence>
        {showCreate && <CompetitionModal open onClose={()=>setShowCreate(false)} onSave={d=>createComp.mutate(d)} loading={createComp.isLoading}/>}
        {editingComp && <CompetitionModal open initialData={editingComp} onClose={()=>setEditingComp(null)} onSave={d=>updateComp.mutate({ compId: editingComp.id, data: d })} loading={updateComp.isLoading}/>} 
        {showTest && <TestModal open onClose={()=>setShowTest(null)} onSave={d=>addTest.mutate({compId:showTest,data:d})} loading={addTest.isLoading}/>} 
        {editingTest && <TestModal open initialData={editingTest} onClose={()=>setEditingTest(null)} onSave={d=>updateTest.mutate({ compId: editingTest.competition_id, testId: editingTest.id, data: d })} loading={updateTest.isLoading}/>} 
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <RiTrophyLine className="w-7 h-7 text-[#4F7CF3]"/> Competitions
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Create and manage timed contests for students</p>
          </div>
          <button onClick={()=>setShowCreate(true)} className="btn btn-primary">
            <RiAddLine className="w-4 h-4"/> New Competition
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s,i)=>(
            <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
              className={`${s.color} p-5 rounded-2xl`}>
              <p className="text-2xl font-bold text-gray-800" style={{fontFamily:'Plus Jakarta Sans'}}>{s.value}</p>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {isLoading && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1,2,3].map(i=><div key={i} className="card p-5 h-52 skeleton"/>)}
          </div>
        )}

        {/* Competition cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {competitions?.map((c,i)=>{
            const ss = STATUS_STYLE[c.status]||STATUS_STYLE.ended;
            const isExpanded = expanded===c.id;
            return (
              <motion.div key={c.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
                className={`card border-l-4 ${ss.border} overflow-hidden hover:shadow-lift transition-all duration-300`}>
                {/* Banner */}
                {c.banner_url && <img src={c.banner_url} alt="" className="w-full h-28 object-cover" loading="lazy"/>}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-gray-800 leading-tight line-clamp-2">{c.name}</h3>
                    <span className={`badge ${ss.badge} shrink-0`}>{c.status}</span>
                  </div>
                  {c.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{c.description}</p>}
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <div className="flex items-center gap-2"><RiTimeLine className="w-3.5 h-3.5"/>Start: {c.start_time?new Date(c.start_time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}</div>
                    <div className="flex items-center gap-2"><RiTimeLine className="w-3.5 h-3.5"/>End: {c.end_time?new Date(c.end_time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}</div>
                    <div className="flex items-center gap-2"><RiKeyLine className="w-3.5 h-3.5"/>Code: <code className="font-mono font-bold text-[#4F7CF3] bg-blue-50 px-1.5 py-0.5 rounded-md">{c.access_code}</code></div>
                  </div>

                  {/* Tests preview */}
                  {c.tests?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.tests.slice(0,3).map((t,ti)=>(
                        <span key={ti} className="badge badge-purple text-xs">{typeof t==='string'?`Test ${ti+1}`:t.name}</span>
                      ))}
                      {c.tests.length>3 && <span className="badge bg-gray-100 text-gray-500">+{c.tests.length-3} more</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ss.dot}`}/>
                    <span className="text-xs font-medium text-gray-500">{c.is_active?'Enabled':'Disabled'}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <button onClick={()=>setEditingComp(c)} className="btn btn-secondary btn-xs">
                      <RiEditLine className="w-3.5 h-3.5"/> Edit
                    </button>
                    <button onClick={()=>setShowTest(c.id)} className="btn btn-secondary btn-xs">
                      <RiAddLine className="w-3.5 h-3.5"/> Add Test
                    </button>
                    <Link to={`/faculty/competitions/${c.id}`} className="btn btn-secondary btn-xs">
                      Open Page
                    </Link>
                    <button onClick={()=>setExpanded(expanded===c.id?null:c.id)} className="btn btn-secondary btn-xs">
                      <RiArrowRightLine className={`w-3.5 h-3.5 transition-transform ${expanded===c.id ? 'rotate-90' : ''}`}/> View Tests
                    </button>
                    <button onClick={()=>toggleComp.mutate(c.id)} disabled={toggleComp.isLoading}
                      className={`btn btn-xs ${c.is_active?'btn-danger':'btn-success'}`}>
                      <RiToggleLine className="w-3.5 h-3.5"/>
                      {c.is_active?'Disable':'Enable'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this competition and all related data?')) {
                          deleteComp.mutate(c.id);
                        }
                      }}
                      className="btn btn-xs btn-danger"
                    >
                      <RiDeleteBinLine className="w-3.5 h-3.5"/> Delete
                    </button>
                  </div>
                </div>

                {expanded === c.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-surface-lighter/30 space-y-2">
                    {(competitionTests || []).length === 0 ? (
                      <p className="text-xs text-secondary">No tests inside this competition yet.</p>
                    ) : (competitionTests || []).map((t) => (
                      <div key={t.id} className="rounded-xl border border-theme bg-surface-card p-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          {t.banner_url ? <img src={t.banner_url} alt="" className="w-full h-16 object-cover rounded-lg mb-2" loading="lazy" /> : null}
                          <p className="text-sm font-semibold text-primary truncate">{t.name}</p>
                          <p className="text-xs text-secondary capitalize">{t.test_type} • {t.time_limit_minutes} min</p>
                          {t.description ? <p className="text-[11px] text-secondary mt-1 line-clamp-2">{t.description}</p> : null}
                          {Array.isArray(t.tags) && t.tags.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {t.tags.map((tag) => (
                                <span key={tag} className="badge badge-medium text-[11px]">{tag}</span>
                              ))}
                            </div>
                          ) : null}
                          <p className="text-[11px] text-secondary mt-1">{t.is_active === false ? 'Disabled' : 'Enabled'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link to={`/faculty/competitions/${c.id}/tests/${t.id}/edit`} className="btn btn-secondary btn-xs"><RiEditLine className="w-3.5 h-3.5"/> Open Test</Link>
                          <button onClick={() => toggleTest.mutate({ compId: c.id, testId: t.id })} className="btn btn-secondary btn-xs">{t.is_active === false ? 'Enable' : 'Disable'}</button>
                          <button onClick={() => {
                            if (window.confirm('Delete this test from competition?')) {
                              deleteTest.mutate({ compId: c.id, testId: t.id });
                            }
                          }} className="btn btn-danger btn-xs"><RiDeleteBinLine className="w-3.5 h-3.5"/> Delete</button>
                          <Link to={`/faculty/competitions/${c.id}/tests/${t.id}/results`} className="btn btn-secondary btn-xs">Results</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {!isLoading && !competitions?.length && (
          <div className="card p-20 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <RiTrophyLine className="w-8 h-8 text-[#4F7CF3]"/>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">No competitions yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first competition to get students competing</p>
            <button onClick={()=>setShowCreate(true)} className="btn btn-primary mx-auto">
              <RiAddLine className="w-4 h-4"/> Create Competition
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
