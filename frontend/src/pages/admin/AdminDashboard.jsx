import React from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RiGroupLine, RiCodeLine, RiTrophyLine, RiFileListLine, RiUploadCloud2Line, RiBarChartLine, RiArrowRightLine, RiUserLine, RiShieldLine } from 'react-icons/ri';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';

const NAV = [
  { label:'Dashboard',   href:'/admin',            icon:<DashboardRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Users',       href:'/admin/users',       icon:<GroupRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Bulk Upload', href:'/admin/bulk-upload', icon:<UploadFileRoundedIcon sx={{ fontSize: 18 }}/> },
  { label:'Analytics',   href:'/admin/analytics',   icon:<InsightsRoundedIcon sx={{ fontSize: 18 }}/> },
];

const COLORS = ['#4F7CF3','#F6B8C6','#CDEDE1','#F7E3A6','#7C8CFF'];
const TT = { contentStyle:{background:'#fff',border:'1px solid #E8ECF4',borderRadius:12,boxShadow:'0 4px 20px rgba(79,124,243,0.1)'}, cursor:{fill:'rgba(79,124,243,0.04)'} };

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { data } = useQuery('admin-analytics', ()=>api.get('/admin/analytics').then(r=>r.data));
  const deptData = data?.department_breakdown?.map(d=>({name:d._id,value:d.count}))||[];

  const stats = [
    { label:'Total Students',     value:data?.total_students,      icon:<RiGroupLine/>,    color:'bg-card-lavender', text:'text-[#4F7CF3]' },
    { label:'Faculty Members',    value:data?.total_faculty,       icon:<RiUserLine/>,     color:'bg-card-pink',     text:'text-pink-600' },
    { label:'Tests Created',      value:data?.total_tests,         icon:<RiFileListLine/>, color:'bg-card-mint',     text:'text-emerald-600' },
    { label:'Active Competitions',value:data?.active_competitions, icon:<RiTrophyLine/>,   color:'bg-card-yellow',   text:'text-amber-600' },
    { label:'Problems',           value:data?.total_problems,      icon:<RiCodeLine/>,     color:'bg-card-lavender', text:'text-[#7C8CFF]' },
    { label:'Submissions',        value:data?.total_submissions,   icon:<RiBarChartLine/>, color:'bg-card-pink',     text:'text-pink-600' },
  ];

  return (
    <DashboardLayout navItems={NAV} role="admin">
      <div className="space-y-7">
        {/* Banner */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
          className="rounded-3xl overflow-hidden relative bg-gradient-to-br from-[#0b1020] via-[#101a3d] to-[#22306d]">
          <div className="absolute inset-0">
            <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-white/5"/>
            <div className="absolute bottom-0 right-32 w-40 h-40 rounded-full bg-blue-500/10"/>
          </div>
          <div className="relative z-10 p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-300 text-sm font-medium mb-1 inline-flex items-center gap-1"><SecurityRoundedIcon sx={{ fontSize: 16 }}/> Admin Console</p>
              <h1 className="text-white text-2xl font-bold">{user?.name}</h1>
              <p className="text-blue-300/80 text-sm mt-0.5">{user?.designation} · {user?.department}</p>
            </div>
            <Link to="/admin/users" className="btn btn-sm bg-white text-primary hover:bg-surface-lighter shrink-0">
              <RiGroupLine className="w-4 h-4"/> Manage Users <RiArrowRightLine className="w-3.5 h-3.5"/>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s,i)=>(
            <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
              className="bg-surface-card border border-theme rounded-2xl p-5 hover:shadow-lift transition-all duration-300">
              <div className={`w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center ${s.text} text-lg mb-3`}>{s.icon}</div>
              <p className={`text-2xl font-bold ${s.text}`} style={{fontFamily:'Plus Jakarta Sans'}}>{s.value??'—'}</p>
              <p className="text-xs text-secondary font-medium mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-bold text-primary mb-5">Students by Department</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} margin={{top:0,right:0,left:-20,bottom:0}}>
                <XAxis dataKey="name" tick={{fill:'#9CA3AF',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#9CA3AF',fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip {...TT}/>
                <Bar dataKey="value" radius={[8,8,0,0]}>{deptData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-6">
            <h3 className="font-bold text-primary mb-5">Platform Overview</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={stats.map(s=>({name:s.label,value:s.value||0}))} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                    {stats.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip {...TT}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                {stats.map((s,i)=>(
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-secondary truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                      {s.label}
                    </span>
                    <span className="font-bold text-primary ml-2">{s.value??0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {label:'Manage Users',   href:'/admin/users',       icon:<RiGroupLine className="w-5 h-5"/>,          color:'bg-surface-card text-primary', desc:'Add, edit, disable accounts'},
            {label:'Bulk Upload',    href:'/admin/bulk-upload', icon:<RiUploadCloud2Line className="w-5 h-5"/>,   color:'bg-surface-card text-primary',   desc:'Import up to 2000 users'},
            {label:'View Analytics', href:'/admin/analytics',   icon:<RiBarChartLine className="w-5 h-5"/>,      color:'bg-surface-card text-primary',      desc:'Detailed platform metrics'},
            {label:'Competitions', href:'/admin/competitions', icon:<RiTrophyLine className="w-5 h-5"/>, color:'bg-surface-card text-primary', desc:'Edit and control competitions'},
          ].map((a,i)=>(
            <Link key={i} to={a.href} className={`${a.color} rounded-2xl p-5 flex items-center gap-4 border border-theme hover:shadow-lift transition-all duration-300 hover:-translate-y-1`}>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">{a.icon}</div>
              <div><p className="font-bold text-primary text-sm">{a.label}</p><p className="text-xs text-secondary mt-0.5">{a.desc}</p></div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
