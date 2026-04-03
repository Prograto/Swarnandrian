import React, { useState } from 'react';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/common/DashboardLayout';
import api from '../../utils/api';
import {
  RiUserAddLine, RiSearchLine, RiFilterLine, RiDeleteBinLine,
  RiLockPasswordLine, RiToggleLine, RiUserLine, RiGroupLine,
  RiShieldLine, RiCloseLine,
} from 'react-icons/ri';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';

const NAV = [
  { label:'Dashboard',   href:'/admin',            icon:<DashboardRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Users',       href:'/admin/users',       icon:<GroupRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Bulk Upload', href:'/admin/bulk-upload', icon:<UploadFileRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Analytics',   href:'/admin/analytics',   icon:<InsightsRoundedIcon sx={{ fontSize: 18 }}/> },
];

const ROLES = ['student','faculty','admin'];
const DEPTS = ['CSE','ECE','EEE','MECH','CIVIL','IT','AIDS','AIML','CSD','MBA'];
const COURSES = ['BTech','MTech'];
const YEARS   = [1,2,3,4];
const SECTIONS = ['A','B','C','D','E','F'];

const ROLE_ICON = { student:<RiUserLine className="w-4 h-4"/>, faculty:<RiGroupLine className="w-4 h-4"/>, admin:<RiShieldLine className="w-4 h-4"/> };
const ROLE_COLOR = {
  student:'bg-blue-100 text-blue-700 border-blue-200',
  faculty:'bg-pink-100 text-pink-700 border-pink-200',
  admin:  'bg-violet-100 text-violet-700 border-violet-200',
};

const EMPTY_STUDENT  = { name:'',course:'BTech',year:1,department:'CSE',section:'A',student_id:'',password:'' };
const EMPTY_FACULTY  = { name:'',designation:'',department:'CSE',contact_number:'',email:'',faculty_id:'',password:'' };
const EMPTY_ADMIN    = { name:'',designation:'',department:'CSE',contact_number:'',email:'',admin_id:'',password:'' };

export default function AdminUsers() {
  const qc = useQueryClient();
  const [role, setRole]     = useState('student');
  const [search, setSearch] = useState('');
  const [dept, setDept]     = useState('');
  const [year, setYear]     = useState('');
  const [page, setPage]     = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_STUDENT);
  const [addLoading, setAddLoading] = useState(false);

  const { data, isLoading } = useQuery(
    ['admin-users', role, search, dept, year, page],
    () => api.get('/admin/users', { params:{ role, search, department:dept||undefined, year:year||undefined, page, limit:30 } }).then(r=>r.data),
    { keepPreviousData:true }
  );

  const toggleMut = useMutation(({r,id})=>api.patch(`/admin/users/${r}/${id}/toggle`),
    { onSuccess:()=>{ qc.invalidateQueries('admin-users'); toast.success('Status updated'); } });
  const deleteMut = useMutation(({r,id})=>api.delete(`/admin/users/${r}/${id}`),
    { onSuccess:()=>{ qc.invalidateQueries('admin-users'); toast.success('User deleted'); } });
  const resetMut  = useMutation(({r,id})=>api.patch(`/admin/users/${r}/${id}/reset-password`,null,{params:{new_password:'Welcome@123'}}),
    { onSuccess:()=>toast.success('Password reset to Welcome@123') });

  const handleRoleChange = (r) => {
    setRole(r); setPage(1);
    setAddForm(r==='student' ? EMPTY_STUDENT : r==='faculty' ? EMPTY_FACULTY : EMPTY_ADMIN);
  };

  const handleAdd = async () => {
    setAddLoading(true);
    try {
      await api.post(`/auth/register/${role}`, addForm);
      toast.success(`${role} created!`);
      qc.invalidateQueries('admin-users');
      setShowAddModal(false);
      setAddForm(role==='student' ? EMPTY_STUDENT : role==='faculty' ? EMPTY_FACULTY : EMPTY_ADMIN);
    } catch(e){ toast.error(e.response?.data?.detail||'Failed to create user'); }
    finally{ setAddLoading(false); }
  };

  const f = (k,v) => setAddForm(prev=>({...prev,[k]:v}));

  useEffect(() => {
    if (!showAddModal) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showAddModal]);

  return (
    <DashboardLayout navItems={NAV} role="admin">
      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div data-lenis-prevent className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
            <motion.div data-lenis-prevent initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
              style={{ touchAction: 'pan-y' }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-modal my-4 overflow-hidden">
              <div className="bg-gradient-to-r from-[#4F7CF3] to-[#7C8CFF] px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">Add New {role.charAt(0).toUpperCase()+role.slice(1)}</h3>
                    <p className="text-blue-100 text-xs mt-0.5">Fill in the details below</p>
                  </div>
                  <button onClick={()=>setShowAddModal(false)} className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                    <RiCloseLine className="w-5 h-5"/>
                  </button>
                </div>
              </div>
              <div data-lenis-prevent-wheel data-lenis-prevent-touch className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name *</label>
                  <input className="input" placeholder="Enter full name" value={addForm.name} onChange={e=>f('name',e.target.value)}/>
                </div>
                {role==='student' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Course</label>
                      <select className="input" value={addForm.course} onChange={e=>f('course',e.target.value)}>
                        {COURSES.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Year</label>
                      <select className="input" value={addForm.year} onChange={e=>f('year',+e.target.value)}>
                        {YEARS.map(y=><option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Section</label>
                    <select className="input" value={addForm.section} onChange={e=>f('section',e.target.value)}>
                      {SECTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Student ID *</label>
                    <input className="input" placeholder="e.g. 22CS001" value={addForm.student_id} onChange={e=>f('student_id',e.target.value)}/>
                  </div>
                </>}
                {(role==='faculty'||role==='admin') && <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Designation *</label>
                    <input className="input" placeholder="e.g. Professor" value={addForm.designation} onChange={e=>f('designation',e.target.value)}/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email</label>
                      <input className="input" type="email" placeholder="email@college.edu" value={addForm.email} onChange={e=>f('email',e.target.value)}/>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Contact</label>
                      <input className="input" placeholder="9999999999" value={addForm.contact_number} onChange={e=>f('contact_number',e.target.value)}/>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{role==='faculty'?'Faculty':'Admin'} ID *</label>
                    <input className="input" placeholder={role==='faculty'?'FAC001':'ADM001'} value={addForm[`${role}_id`]} onChange={e=>f(`${role}_id`,e.target.value)}/>
                  </div>
                </>}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Department</label>
                  <select className="input" value={addForm.department} onChange={e=>f('department',e.target.value)}>
                    {DEPTS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Password *</label>
                  <input className="input" type="password" placeholder="Min 6 characters" value={addForm.password} onChange={e=>f('password',e.target.value)}/>
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3 justify-end">
                <button onClick={()=>setShowAddModal(false)} className="btn btn-ghost">Cancel</button>
                <button onClick={handleAdd} disabled={addLoading} className="btn btn-primary">
                  <RiUserAddLine className="w-4 h-4"/>
                  {addLoading ? 'Creating…' : `Create ${role.charAt(0).toUpperCase()+role.slice(1)}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="text-gray-400 text-sm mt-0.5">{data?.total||0} {role}s found</p>
          </div>
          <button onClick={()=>setShowAddModal(true)} className="btn btn-primary">
            <RiUserAddLine className="w-4 h-4"/> Add {role.charAt(0).toUpperCase()+role.slice(1)}
          </button>
        </div>

        {/* Role tabs */}
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(r=>(
            <button key={r} onClick={()=>handleRoleChange(r)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all capitalize ${role===r?ROLE_COLOR[r]+' shadow-sm':'bg-white border-gray-200 text-gray-500 hover:border-blue-200'}`}>
              {ROLE_ICON[r]} {r}s
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <RiSearchLine className="w-4 h-4 text-gray-400 shrink-0"/>
            <input className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700 placeholder-gray-400"
              placeholder="Search name or ID…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
          </div>
          <div className="flex items-center gap-2">
            <RiFilterLine className="w-4 h-4 text-gray-400"/>
            <select className="input py-2 text-sm w-32" value={dept} onChange={e=>setDept(e.target.value)}>
              <option value="">All Depts</option>
              {DEPTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          {role==='student'&&(
            <select className="input py-2 text-sm w-28" value={year} onChange={e=>setYear(e.target.value)}>
              <option value="">All Years</option>
              {YEARS.map(y=><option key={y} value={y}>Year {y}</option>)}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {(role==='student'
                    ? ['Name','ID','Department','Section','Year','Status','Actions']
                    : ['Name','ID','Department','Designation','Status','Actions']
                  ).map(h=>(
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? <tr><td colSpan={role==='student' ? 7 : 6} className="text-center py-12 text-gray-400">Loading…</td></tr>
                  : data?.users?.map(u=>(
                  <motion.tr key={u.id} initial={{opacity:0}} animate={{opacity:1}} className="tbl-row">
                    <td className="tbl-td">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${ROLE_CONF_MAP[role]||'from-blue-400 to-blue-600'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="tbl-td font-mono text-xs text-gray-500">{u[`${role}_id`]||u.student_id}</td>
                    <td className="tbl-td text-gray-500">{u.department}</td>
                    {role==='student' && <td className="tbl-td text-gray-500">{u.section || '—'}</td>}
                    <td className="tbl-td text-gray-500">{role==='student'?`Y${u.year}`:u.designation}</td>
                    <td className="tbl-td">
                      <span className={`badge ${u.is_active?'badge-mint':'bg-red-100 text-red-600'}`}>
                        {u.is_active?'● Active':'○ Disabled'}
                      </span>
                    </td>
                    <td className="tbl-td">
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>toggleMut.mutate({r:role,id:u.id})}
                          className={`btn btn-xs ${u.is_active?'btn-danger':'btn-success'}`}>
                          <RiToggleLine className="w-3.5 h-3.5"/>
                          {u.is_active?'Disable':'Enable'}
                        </button>
                        <button onClick={()=>resetMut.mutate({r:role,id:u.id})}
                          className="btn btn-xs btn-secondary" title="Reset password to Welcome@123">
                          <RiLockPasswordLine className="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={()=>{if(window.confirm('Delete user?'))deleteMut.mutate({r:role,id:u.id});}}
                          className="btn btn-xs btn-danger">
                          <RiDeleteBinLine className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn btn-ghost btn-sm disabled:opacity-30">← Prev</button>
            <span className="text-sm text-gray-400 font-medium">Page {page}</span>
            <button disabled={!data?.users?.length||data.users.length<30} onClick={()=>setPage(p=>p+1)} className="btn btn-ghost btn-sm disabled:opacity-30">Next →</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const ROLE_CONF_MAP = {
  student: 'from-blue-400 to-blue-600',
  faculty: 'from-pink-400 to-pink-600',
  admin:   'from-violet-400 to-violet-600',
};
