import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { applyPageMetadata } from '../../utils/seo';
import { RiShieldLine, RiGroupLine, RiUserLine, RiEyeLine, RiEyeOffLine, RiArrowRightLine } from 'react-icons/ri';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';

const ROLES = [
  { id:'student', label:'Student', icon:<SchoolRoundedIcon sx={{ fontSize: 18 }} />,  accent:'from-[#34d399] to-[#60a5fa]', badge:'badge-mint' },
  { id:'faculty', label:'Faculty', icon:<HubRoundedIcon sx={{ fontSize: 18 }} />, accent:'from-[#f472b6] to-[#c084fc]', badge:'badge-pink' },
  { id:'admin',   label:'Admin',   icon:<SecurityRoundedIcon sx={{ fontSize: 18 }} />, accent:'from-[#60a5fa] to-[#a78bfa]', badge:'badge-purple' },
];
const PLACEHOLDER = { student:'Student ID', faculty:'Faculty ID', admin:'Admin ID' };
const DASH = { admin:'/admin', faculty:'/faculty', student:'/student' };
const SITE_NAME = 'Swarnandrian';
const COLLEGE_NAME = 'Swarnandhra College of Engineering and Technology';
const LOGIN_META = {
  student: {
    title: 'Student Sign In',
    description: `Sign in to access coding practice, aptitude drills, and progress tracking for ${COLLEGE_NAME}.`,
    keywords: ['student login', 'coding practice', 'aptitude assessment', 'Swarnandrian', COLLEGE_NAME],
  },
  faculty: {
    title: 'Faculty Sign In',
    description: `Sign in to create assessments, review submissions, and manage classes at ${COLLEGE_NAME}.`,
    keywords: ['faculty login', 'assessment management', 'submission review', 'Swarnandrian', COLLEGE_NAME],
  },
  admin: {
    title: 'Admin Sign In',
    description: `Sign in to manage users, analytics, and platform controls for Swarnandrian at ${COLLEGE_NAME}.`,
    keywords: ['admin login', 'platform control', 'analytics', 'Swarnandrian', COLLEGE_NAME],
  },
};

export default function LoginPage() {
  const [params] = useSearchParams();
  const [role,    setRole]    = useState(params.get('role')||'student');
  const [userId,  setUserId]  = useState('');
  const [password,setPass]    = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoad]    = useState(false);
  const [errors, setErrors]    = useState({});
  const { login } = useAuthStore();
  const navigate  = useNavigate();

  const roleConfig = useMemo(() => ({
    student: {
      title: 'Launch your learning orbit',
      subtitle: 'Practice, compete, and track progress through a clean student workspace built for momentum.',
      chips: ['Coding practice', 'Aptitude drills', 'Leaderboard tracking'],
    },
    faculty: {
      title: 'Orchestrate your classroom workflow',
      subtitle: 'Create assessments, review submissions, and manage batches from a streamlined faculty console.',
      chips: ['Assessment authoring', 'Submission review', 'Student insights'],
    },
    admin: {
      title: 'Control the platform with clarity',
      subtitle: 'Monitor users, analytics, exports, and role management from a premium admin command center.',
      chips: ['Real analytics', 'Export data', 'Access control'],
    },
  }), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const origin = window.location.origin;
    const loginMeta = LOGIN_META[role] || LOGIN_META.student;

    applyPageMetadata({
      title: `${loginMeta.title} | ${SITE_NAME}`,
      description: loginMeta.description,
      keywords: loginMeta.keywords,
      robots: 'noindex,nofollow',
      canonical: `${origin}/login`,
      url: `${origin}/login`,
      image: `${origin}/logo.png`,
      imageAlt: `${SITE_NAME} logo`,
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_IN',
      jsonLd: null,
    });
  }, [role]);

  const validate = () => {
    const next = {};
    if (!userId.trim()) next.userId = `${PLACEHOLDER[role]} is required`;
    if (!password.trim()) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoad(true);
    try {
      await login(userId, password, role);
      toast.success('Welcome back!');
      navigate(DASH[role]);
    } catch(err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials');
    } finally { setLoad(false); }
  };

  return (
    <div className="min-h-screen flex bg-surface text-primary overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,124,243,0.16),transparent_32%),radial-gradient(circle_at_80%_15%,rgba(124,140,255,0.14),transparent_22%),radial-gradient(circle_at_50%_110%,rgba(16,185,129,0.08),transparent_30%)]" />
        <div className="absolute inset-0 opacity-[0.16] dark:opacity-[0.22] bg-[linear-gradient(rgba(79,124,243,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(79,124,243,0.18)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#091126] via-[#0d1b3f] to-[#121b56]" />
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.28),transparent_26%),radial-gradient(circle_at_80%_30%,rgba(192,132,252,0.20),transparent_20%),radial-gradient(circle_at_60%_80%,rgba(251,191,36,0.14),transparent_18%)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] bg-[size:78px_78px]" />

        <div className="absolute inset-0 overflow-hidden">
          {[
            { icon: <CodeRoundedIcon sx={{ fontSize: 22 }} />, className: 'left-[10%] top-[20%]' },
            { icon: <AnalyticsRoundedIcon sx={{ fontSize: 22 }} />, className: 'right-[16%] top-[18%]' },
            { icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 22 }} />, className: 'left-[18%] bottom-[18%]' },
            { icon: <HubRoundedIcon sx={{ fontSize: 22 }} />, className: 'right-[12%] bottom-[24%]' },
          ].map((item, index) => (
            <motion.div
              key={index}
              className={`absolute ${item.className} flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white shadow-soft backdrop-blur-md`}
              animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
              transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
            >
              {item.icon}
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-3 self-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white shadow-glow backdrop-blur-md">
              <img src="/logo.png" alt="Swarnandrian" className="h-8 w-8 rounded-xl object-cover" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white" style={{fontFamily:'Plus Jakarta Sans'}}>Swarnandrian</span>
          </Link>

          <div className="mx-auto max-w-xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-md">
              <RocketLaunchRoundedIcon sx={{ fontSize: 14 }} /> Space-tech learning ecosystem
            </div>
            <h2 className="mt-6 text-4xl font-bold leading-tight text-white xl:text-5xl" style={{fontFamily:'Plus Jakarta Sans'}}>
              Premium learning for students and faculty, built like a modern product.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-slate-200/90">
              Practice coding, manage assessments, review analytics, and track progress through a polished platform that stays readable in both dark and light mode.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Adaptive UI', value: 'Dark + Light', icon: AutoAwesomeRoundedIcon },
              { label: 'Platform Control', value: 'Faculty + Admin', icon: SecurityRoundedIcon },
              { label: 'Student Flow', value: 'Practice + Rank', icon: LoginRoundedIcon },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/12 bg-white/10 p-4 shadow-soft backdrop-blur-md">
                <card.icon sx={{ fontSize: 18 }} className="text-cyan-100" />
                <p className="mt-3 text-sm font-semibold text-white">{card.label}</p>
                <p className="mt-1 text-xs text-slate-200/80">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 text-sm text-cyan-100 sm:flex-row sm:flex-wrap">
            {['Real analytics', 'Smooth transitions', 'WCAG-aware contrast', 'File preview ready'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 backdrop-blur-md">
                <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                {item}
              </span>
            ))}
          </div>

          <p className="mt-10 text-xs text-slate-300/80">© {new Date().getFullYear()} Swarnandrian</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link to="/" className="flex items-center gap-3 rounded-2xl border border-theme bg-surface-card px-4 py-3 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F7CF3] to-[#7C8CFF] text-white shadow-glow">
                <img src="/logo.png" alt="Swarnandrian" className="h-7 w-7 rounded-xl object-cover" />
              </div>
              <span className="font-bold text-xl text-primary" style={{fontFamily:'Plus Jakarta Sans'}}>Swarnandrian</span>
            </Link>
          </div>

          <div className="card border-theme bg-surface-card/95 p-7 shadow-[0_24px_60px_rgba(2,8,23,0.12)] backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-theme bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                <SecurityRoundedIcon sx={{ fontSize: 14 }} /> Secure login
              </div>
              <h1 className="mt-4 text-3xl font-bold text-primary" style={{fontFamily:'Plus Jakarta Sans'}}>Welcome back</h1>
              <p className="mt-2 text-sm leading-6 text-secondary">
                {roleConfig[role].title}
              </p>
              <p className="mt-2 text-sm leading-6 text-secondary">
                {roleConfig[role].subtitle}
              </p>
            </div>

            {/* Role selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {ROLES.map((r)=>(
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={role === r.id}
                  onClick={()=>setRole(r.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setRole(r.id);
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-xs font-semibold transition-all ${role===r.id ? `border-transparent bg-gradient-to-br ${r.accent} text-white shadow-glow` : 'border-theme bg-surface text-secondary hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft'}`}>
                  <span className="text-base">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {roleConfig[role].chips.map((chip) => (
                <span key={chip} className={`badge ${ROLES.find((item) => item.id === role)?.badge || 'badge-primary'}`}>
                  {chip}
                </span>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary">{PLACEHOLDER[role]}</label>
                <input
                  className={`input ${errors.userId ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  placeholder={`Enter your ${PLACEHOLDER[role]}`}
                  value={userId} onChange={e=>setUserId(e.target.value)} autoComplete="username" autoFocus/>
                {errors.userId && <p className="mt-1.5 text-xs text-red-500">{errors.userId}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary">Password</label>
                <div className="relative">
                  <input className={`input pr-10 ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`} type={showPw?'text':'password'}
                    placeholder="Enter your password" value={password} onChange={e=>setPass(e.target.value)} autoComplete="current-password"/>
                  <button type="button" onClick={()=>setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary">
                    {showPw?<RiEyeOffLine className="w-4 h-4"/>:<RiEyeLine className="w-4 h-4"/>}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 mt-2 shadow-glow">
                {loading ? 'Signing in…' : <>Sign In <RiArrowRightLine className="w-4 h-4"/></>}
              </button>
            </form>

            {role==='student' && (
              <p className="mt-5 text-center text-sm text-secondary">
                No account?{' '}
                <Link to="/register" className="font-semibold text-primary transition-colors hover:text-[rgb(var(--accent-color))]">Register here</Link>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
