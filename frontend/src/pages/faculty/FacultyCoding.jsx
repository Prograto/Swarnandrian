import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/common/DashboardLayout';
import { FACULTY_NAV } from './FacultyDashboard';
import api from '../../utils/api';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';

const DIFFS = ['Easy','Medium','Hard'];
const DSA_TOPICS = ['DSA','Graph Algorithms','Dynamic Programming','SkillUp Coder','Sorting & Searching','Trees','Bit Manipulation'];

export default function FacultyCoding() {
  const { mode } = useParams();
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editingProblem, setEditingProblem] = useState(null);
  const [sectionForm, setSectionForm] = useState({ name:'', banner_url:'', description:'', branch:'', is_active:true });
  const [sectionImageUploading, setSectionImageUploading] = useState(false);
  const [problemImageUploading, setProblemImageUploading] = useState(false);
  const [privateCases, setPrivateCases] = useState([{ input:'', expected_output:'' }]);
  const [pForm, setPForm] = useState({ problem_id:'', name:'', statement:'', constraints:'', sample_input_1:'', sample_output_1:'', sample_input_2:'', sample_output_2:'', difficulty:'Medium', marks:10, editorial:'', banner_url:'', branch:'', is_active:true });

  const uploadImageToS3 = async (file, folder = 'section-images') => {
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
      const url = await uploadImageToS3(file, 'coding-sections');
      setSectionForm((prev) => ({ ...prev, banner_url: url }));
      toast.success('Section image uploaded');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setSectionImageUploading(false);
    }
  };

  const { data: sections, isError: sectionsError, refetch: refetchSections } = useQuery(['coding-sections', mode], () => api.get('/coding/sections', { params: { mode } }).then(r => r.data));
  const { data: problems, isError: problemsError, refetch: refetchProblems } = useQuery(
    ['coding-problems', selectedSection, mode],
    () => api.get('/coding/problems', { params: { section_id: selectedSection, mode } }).then(r => r.data),
    { enabled: !!selectedSection }
  );

  const createSection = useMutation(
    () => api.post(`/coding/sections?mode=${mode}`, sectionForm),
    { onSuccess: () => { qc.invalidateQueries(['coding-sections', mode]); setShowSectionModal(false); setSectionForm({name:'',banner_url:'',description:'',branch:'',is_active:true}); toast.success('Section created!'); } }
  );
  const deleteSection = useMutation(
    id => api.delete(`/coding/sections/${id}`),
    {
      onSuccess: () => {
        qc.invalidateQueries(['coding-sections', mode]);
        setSelectedSection(null);
        toast.success('Section deleted');
      },
      onError: () => toast.error('Failed to delete section'),
    }
  );
  const createProblem = useMutation(
    data => api.post('/coding/problems', data),
    { onSuccess: () => { qc.invalidateQueries(['coding-problems', selectedSection, mode]); setShowProblemModal(false); toast.success('Problem added!'); } }
  );
  const updateSection = useMutation(
    ({ id, payload }) => api.put(`/coding/sections/${id}`, payload),
    { onSuccess: () => { qc.invalidateQueries(['coding-sections', mode]); toast.success('Section updated'); } }
  );
  const updateProblem = useMutation(
    ({ id, payload }) => api.put(`/coding/problems/${id}`, payload),
    { onSuccess: () => { qc.invalidateQueries(['coding-problems', selectedSection, mode]); toast.success('Problem updated'); } }
  );
  const deleteProblem = useMutation(
    id => api.delete(`/coding/problems/${id}`),
    { onSuccess: () => qc.invalidateQueries(['coding-problems', selectedSection, mode]) }
  );
  const toggleProblem = useMutation(
    id => api.patch(`/coding/problems/${id}/toggle`),
    { onSuccess: () => { qc.invalidateQueries(['coding-problems', selectedSection, mode]); toast.success('Problem status updated'); } }
  );

  const handleBulkUploadProblems = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSection) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post(`/coding/problems/bulk-upload?section_id=${selectedSection}&mode=${mode}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${res.data.created || 0} coding problems imported`);
      qc.invalidateQueries(['coding-problems', selectedSection, mode]);
    } catch {
      toast.error('Bulk upload failed');
    }
    e.target.value = '';
  };

  const resetProblemForm = () => {
    setEditingProblem(null);
    setPForm({ problem_id:'', name:'', statement:'', constraints:'', sample_input_1:'', sample_output_1:'', sample_input_2:'', sample_output_2:'', difficulty:'Medium', marks:10, editorial:'', banner_url:'', branch:'', is_active:true });
    setPrivateCases([{ input:'', expected_output:'' }]);
  };

  const handleProblemImageUpload = async (file) => {
    if (!file) return;
    setProblemImageUploading(true);
    try {
      const url = await uploadImageToS3(file, 'coding-problems');
      setPForm((prev) => ({ ...prev, banner_url: url }));
      toast.success('Problem image uploaded');
    } catch {
      toast.error('Problem image upload failed');
    } finally {
      setProblemImageUploading(false);
    }
  };

  const handleEditSection = (section) => {
    setEditingSection(section);
    setSectionForm({ name: section.name || '', banner_url: section.banner_url || '', description: section.description || '', branch: section.branch || '', is_active: section.is_active !== false });
    setShowSectionModal(true);
  };

  const handleEditProblem = (problem) => {
    setEditingProblem(problem);
    setPForm({
      problem_id: problem.problem_id || '',
      name: problem.name || '',
      statement: problem.statement || '',
      constraints: problem.constraints || '',
      sample_input_1: problem.sample_input_1 || '',
      sample_output_1: problem.sample_output_1 || '',
      sample_input_2: problem.sample_input_2 || '',
      sample_output_2: problem.sample_output_2 || '',
      difficulty: problem.difficulty || 'Medium',
      marks: problem.marks ?? 10,
      editorial: problem.editorial || '',
      banner_url: problem.banner_url || '',
      branch: problem.branch || '',
      is_active: problem.is_active !== false,
    });
    setPrivateCases(Array.isArray(problem.private_test_cases) && problem.private_test_cases.length
      ? problem.private_test_cases
      : [{ input:'', expected_output:'' }]);
    setShowProblemModal(true);
  };

  const handleSaveProblem = () => {
    const payload = {
      ...pForm,
      section_id: selectedSection,
      mode,
      private_test_cases: privateCases,
      marks: mode === 'competitor' ? +pForm.marks : null,
      editorial: mode === 'practice' ? pForm.editorial : null,
      branch: pForm.branch || null,
      is_active: pForm.is_active !== false,
    };

    if (editingProblem) {
      updateProblem.mutate({ id: editingProblem.id, payload }, {
        onSuccess: () => {
          setShowProblemModal(false);
          resetProblemForm();
        },
      });
      return;
    }

    createProblem.mutate(payload, {
      onSuccess: () => {
        setShowProblemModal(false);
        resetProblemForm();
      },
    });
  };

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      {/* Section Modal */}
      <AnimatePresence>{showSectionModal&&(
        <div data-lenis-prevent className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center">
          <motion.div data-lenis-prevent initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain my-4" style={{ touchAction: 'pan-y' }}>
            <h3 className="font-bold text-gray-800 text-lg mb-3">{editingSection ? 'Edit Coding Section' : 'New Coding Section'}</h3>
            <p className="text-xs text-gray-400 mb-2 font-medium">Quick topics:</p>
            <div className="flex flex-wrap gap-1 mb-3">{DSA_TOPICS.map(t=><button key={t} onClick={()=>setSectionForm(f=>({...f,name:t}))} className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-purple-100 hover:text-purple-600 text-xs transition-colors">{t}</button>)}</div>
            <div className="space-y-3">
              <input className="input" placeholder="Section Name *" value={sectionForm.name} onChange={e=>setSectionForm(f=>({...f,name:e.target.value}))}/>
              <input className="input" placeholder="Banner Image URL (optional)" value={sectionForm.banner_url} onChange={e=>setSectionForm(f=>({...f,banner_url:e.target.value}))}/>
              <label className="block text-xs text-gray-500 font-medium">
                Upload Banner (optional)
                <input
                  type="file"
                  accept="image/*"
                  className="input mt-1"
                  onChange={(e) => handleSectionImageUpload(e.target.files?.[0])}
                />
              </label>
              {sectionImageUploading && <p className="text-xs text-blue-500">Uploading image...</p>}
              {sectionForm.banner_url && (
                <img src={sectionForm.banner_url} alt="Section banner" className="w-full h-24 object-cover rounded-xl" loading="lazy" />
              )}
              <textarea className="input h-20 resize-none" placeholder="Description (optional)" value={sectionForm.description} onChange={e=>setSectionForm(f=>({...f,description:e.target.value}))}/>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Branch Access</label><input className="input" placeholder="All branches if blank" value={sectionForm.branch} onChange={e=>setSectionForm(f=>({...f,branch:e.target.value}))}/></div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium mt-6"><input type="checkbox" checked={sectionForm.is_active !== false} onChange={e=>setSectionForm(f=>({...f,is_active:e.target.checked}))}/>Enabled for students</label>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4"><button onClick={()=>{setShowSectionModal(false);setEditingSection(null);setSectionForm({ name:'', banner_url:'', description:'', branch:'', is_active:true });setSectionImageUploading(false);}} className="btn-ghost">Cancel</button><button onClick={()=>{ if (editingSection) { updateSection.mutate({ id: editingSection.id, payload: sectionForm }, { onSuccess: () => { setShowSectionModal(false); setEditingSection(null); setSectionForm({ name:'', banner_url:'', description:'', branch:'', is_active:true }); } }); } else { createSection.mutate(); } }} className="btn-primary">{editingSection ? 'Save Changes' : 'Create'}</button></div>
          </motion.div>
        </div>
      )}</AnimatePresence>

      {/* Problem Modal */}
      <AnimatePresence>{showProblemModal&&(
        <div data-lenis-prevent className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain sm:items-center">
          <motion.div data-lenis-prevent initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain my-4" style={{ touchAction: 'pan-y' }}>
            <h3 className="font-bold text-gray-800 text-lg mb-4">{editingProblem ? 'Edit Coding Problem' : 'Add Coding Problem'}</h3>
            <div data-lenis-prevent-wheel data-lenis-prevent-touch className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Problem ID *</label><input className="input" placeholder="e.g. P001" value={pForm.problem_id} onChange={e=>setPForm(f=>({...f,problem_id:e.target.value}))}/></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Problem Name *</label><input className="input" placeholder="Two Sum" value={pForm.name} onChange={e=>setPForm(f=>({...f,name:e.target.value}))}/></div>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Banner Image URL</label><input className="input" placeholder="https://..." value={pForm.banner_url} onChange={e=>setPForm(f=>({...f,banner_url:e.target.value}))}/></div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">Upload Problem Image</label>
                <input type="file" accept="image/*" className="input" onChange={(e) => handleProblemImageUpload(e.target.files?.[0])} />
                {problemImageUploading && <p className="text-xs text-blue-500 mt-1">Uploading image...</p>}
                {pForm.banner_url && <img src={pForm.banner_url} alt="Problem banner" className="mt-2 w-full h-24 object-cover rounded-xl" loading="lazy" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Branch Access</label><input className="input" placeholder="All branches if blank" value={pForm.branch} onChange={e=>setPForm(f=>({...f,branch:e.target.value}))}/></div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium mt-6"><input type="checkbox" checked={pForm.is_active !== false} onChange={e=>setPForm(f=>({...f,is_active:e.target.checked}))}/>Enabled for students</label>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Problem Statement * (Markdown supported)</label><textarea className="input h-32 resize-none font-mono text-sm" placeholder="Given an array of integers..." value={pForm.statement} onChange={e=>setPForm(f=>({...f,statement:e.target.value}))}/></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-medium">Constraints</label><input className="input" placeholder="1 ≤ N ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9" value={pForm.constraints} onChange={e=>setPForm(f=>({...f,constraints:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Sample Input 1</label><textarea className="input h-20 resize-none font-mono text-sm" value={pForm.sample_input_1} onChange={e=>setPForm(f=>({...f,sample_input_1:e.target.value}))}/></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Sample Output 1</label><textarea className="input h-20 resize-none font-mono text-sm" value={pForm.sample_output_1} onChange={e=>setPForm(f=>({...f,sample_output_1:e.target.value}))}/></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Sample Input 2</label><textarea className="input h-20 resize-none font-mono text-sm" value={pForm.sample_input_2} onChange={e=>setPForm(f=>({...f,sample_input_2:e.target.value}))}/></div>
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Sample Output 2</label><textarea className="input h-20 resize-none font-mono text-sm" value={pForm.sample_output_2} onChange={e=>setPForm(f=>({...f,sample_output_2:e.target.value}))}/></div>
              </div>
              {/* Private test cases */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 font-medium">Private Test Cases</label>
                  <button onClick={()=>setPrivateCases(c=>[...c,{input:'',expected_output:''}])} className="text-xs text-[#6C63FF] font-medium hover:text-purple-800">+ Add Case</button>
                </div>
                <div className="space-y-2">
                  {privateCases.map((c,i)=>(
                    <div key={i} className="grid grid-cols-2 gap-2 items-start">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Input {i+1}</p>
                        <textarea className="input h-16 resize-none font-mono text-xs" value={c.input} onChange={e=>setPrivateCases(prev=>prev.map((p,j)=>j===i?{...p,input:e.target.value}:p))}/>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-400">Expected {i+1}</p>
                          {privateCases.length>1&&<button onClick={()=>setPrivateCases(prev=>prev.filter((_,j)=>j!==i))} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
                        </div>
                        <textarea className="input h-16 resize-none font-mono text-xs" value={c.expected_output} onChange={e=>setPrivateCases(prev=>prev.map((p,j)=>j===i?{...p,expected_output:e.target.value}:p))}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block font-medium">Difficulty</label>
                  <select className="input" value={pForm.difficulty} onChange={e=>setPForm(f=>({...f,difficulty:e.target.value}))}>{DIFFS.map(d=><option key={d}>{d}</option>)}</select></div>
                {mode==='competitor'&&<div><label className="text-xs text-gray-500 mb-1 block font-medium">Marks</label><input className="input" type="number" value={pForm.marks} onChange={e=>setPForm(f=>({...f,marks:e.target.value}))}/></div>}
              </div>
              {mode==='practice'&&<div><label className="text-xs text-gray-500 mb-1 block font-medium">Editorial Solution (shown after Accepted)</label><textarea className="input h-24 resize-none font-mono text-sm" placeholder="Explain the optimal approach..." value={pForm.editorial} onChange={e=>setPForm(f=>({...f,editorial:e.target.value}))}/></div>}
            </div>
            <div className="flex gap-3 justify-end mt-4"><button onClick={()=>{setShowProblemModal(false);resetProblemForm();}} className="btn-ghost">Cancel</button><button onClick={handleSaveProblem} disabled={createProblem.isLoading || updateProblem.isLoading} className="btn-primary">{editingProblem ? 'Save Changes' : 'Add Problem'}</button></div>
          </motion.div>
        </div>
      )}</AnimatePresence>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="section-title inline-flex items-center gap-2">Coding — {mode==='practice'?<><MenuBookRoundedIcon sx={{fontSize:20}}/> Practice</>:<><EmojiEventsRoundedIcon sx={{fontSize:20}}/> Competitor</>}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{mode==='practice'?'Unlimited attempts · Editorial visible after solving':'Scored problems · Counts toward leaderboard'}</p>
          </div>
          <button onClick={()=>{setEditingSection(null);setSectionForm({ name:'', banner_url:'', description:'', branch:'', is_active:true });setShowSectionModal(true);}} className="btn-primary text-sm">+ New Section</button>
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
                  <button key={s.id} onClick={()=>setSelectedSection(s.id)}
                    className={`w-full text-left rounded-xl border overflow-hidden transition-all ${selectedSection===s.id?'border-purple-300 shadow-md':'border-gray-100 hover:border-purple-200'}`}>
                    {s.banner_url&&<img src={s.banner_url} alt="" className="w-full h-20 object-contain bg-slate-50" loading="lazy"/>}
                    <div className={`px-4 py-3 ${selectedSection===s.id?'bg-purple-50':''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${selectedSection===s.id?'text-[#6C63FF]':'text-gray-700'}`}>{s.name}</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={(e)=>{e.stopPropagation(); handleEditSection(s);}} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Edit</button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Delete this section and all problems inside it?')) {
                                deleteSection.mutate(s.id);
                              }
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{s.problem_count} problems</p>
                      {s.description&&<p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.description}</p>}
                    </div>
                  </button>
                ))}
                {!sections?.length&&<div className="card p-6 text-center"><p className="text-2xl mb-2 inline-flex"><FolderOpenRoundedIcon sx={{fontSize:28}}/></p><p className="text-xs text-gray-400">No sections yet.</p></div>}
              </>
            )}
          </div>

          {/* Problems */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Problems {selectedSection?'':"(select a section)"}</p>
              {selectedSection&&<div className="flex items-center gap-2">
                <label className="btn btn-secondary btn-sm cursor-pointer">
                  Bulk Upload
                  <input type="file" accept=".xlsx" className="hidden" onChange={handleBulkUploadProblems} />
                </label>
                <button onClick={()=>{setEditingProblem(null);resetProblemForm();setShowProblemModal(true);}} className="btn-primary text-sm">+ Add Problem</button>
              </div>}
            </div>
            {problemsError ? (
              <div className="card p-10 text-center text-red-600">
                Failed to load problems.
                <button type="button" onClick={() => refetchProblems()} className="mt-2 btn-secondary text-xs">Retry</button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {problems?.problems?.map((p,i)=>(
                  <motion.div key={p.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                    className="card overflow-hidden hover:shadow-md transition-all">
                    {p.banner_url&&<img src={p.banner_url} alt="" className="w-full h-32 object-contain bg-slate-50" loading="lazy"/>}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.problem_id}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>handleEditProblem(p)} className="text-blue-500 hover:text-blue-700 text-xs shrink-0 p-1 hover:bg-blue-50 rounded-lg">Edit</button>
                          <button onClick={()=>{if(window.confirm('Delete?'))deleteProblem.mutate(p.id)}} className="text-red-400 hover:text-red-600 text-xs shrink-0 p-1 hover:bg-red-50 rounded-lg">Delete</button>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className={`badge-${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
                        {p.marks&&<span className="badge bg-amber-100 text-amber-700">{p.marks}pts</span>}
                        <span className={`badge ${p.is_active === false ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.is_active === false ? 'Disabled' : 'Enabled'}</span>
                      </div>
                      <div className="mt-2">
                        <button onClick={()=>toggleProblem.mutate(p.id)} className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-700">{p.is_active === false ? 'Enable' : 'Disable'}</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {selectedSection&&!problems?.problems?.length&&(
              <div className="card p-16 text-center"><p className="text-4xl mb-3 inline-flex"><CodeRoundedIcon sx={{fontSize:36}}/></p><p className="text-gray-400">No problems yet.</p><button onClick={()=>setShowProblemModal(true)} className="btn-primary mt-4 text-sm">Add First Problem</button></div>
            )}
            {!selectedSection&&(
              <div className="card p-16 text-center"><p className="text-4xl mb-3 inline-flex"><FolderOpenRoundedIcon sx={{fontSize:36}}/></p><p className="text-gray-400">Select a section to view problems</p></div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
