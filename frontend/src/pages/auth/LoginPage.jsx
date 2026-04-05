import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { applyPageMetadata } from '../../utils/seo';
import { RiShieldLine, RiGroupLine, RiUserLine, RiEyeLine, RiEyeOffLine, RiArrowRightLine } from 'react-icons/ri';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

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

function getLoginErrorMessage(error, currentRole) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  const roleLabel = currentRole ? `${PLACEHOLDER[currentRole].toLowerCase()}` : 'credentials';

  if (status === 401) {
    return `We couldn't sign you in. Check your ${roleLabel}, password, and selected role, then try again.`;
  }

  if (status === 403) {
    return typeof detail === 'string' && detail ? detail : 'This account is disabled. Contact an administrator to restore access.';
  }

  if (status === 422) {
    return 'Please review the highlighted fields and make sure both the ID and password are filled in.';
  }

  if (status === 429) {
    return 'Too many sign-in attempts. Please wait a moment and try again.';
  }

  if (typeof detail === 'string' && detail) {
    return detail;
  }

  if (!error?.response) {
    return 'Network error. Check your connection and try again.';
  }

  return 'Sign in failed. Please try again.';
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const [role,    setRole]    = useState(params.get('role')||'student');
  const [userId,  setUserId]  = useState('');
  const [password,setPass]    = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoad]    = useState(false);
  const [errors, setErrors]    = useState({});
  const [submitError, setSubmitError] = useState('');
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

  useEffect(() => {
    setErrors({});
    setSubmitError('');
  }, [role]);

  const validate = () => {
    setSubmitError('');
    const next = {};
    if (!userId.trim()) next.userId = `Please enter your ${PLACEHOLDER[role]}.`;
    if (!password.trim()) next.password = 'Please enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoad(true);
    setSubmitError('');
    try {
      await login(userId, password, role);
      toast.success('Welcome back!');
      navigate(DASH[role]);
    } catch(err) {
      setSubmitError(getLoginErrorMessage(err, role));
    } finally { setLoad(false); }
  };

  return (
    <div className="relative min-h-screen flex bg-surface text-primary overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,124,243,0.16),transparent_32%),radial-gradient(circle_at_80%_15%,rgba(124,140,255,0.14),transparent_22%),radial-gradient(circle_at_50%_110%,rgba(16,185,129,0.08),transparent_30%)]" />
        <div className="absolute inset-0 opacity-[0.16] dark:opacity-[0.22] bg-[linear-gradient(rgba(79,124,243,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(79,124,243,0.18)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#081126] via-[#0d1b3f] to-[#121b4d]" />
        <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_at_18%_18%,rgba(96,165,250,0.22),transparent_26%),radial-gradient(circle_at_82%_28%,rgba(192,132,252,0.16),transparent_20%),radial-gradient(circle_at_60%_82%,rgba(52,211,153,0.08),transparent_18%)]" />
        <div className="absolute inset-0 opacity-14 bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:84px_84px]" />

        <motion.div
          aria-hidden="true"
          className="absolute left-10 top-14 h-24 w-24 rounded-full bg-white/6 blur-3xl"
          animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute right-12 bottom-16 h-28 w-28 rounded-full bg-[#4F7CF3]/10 blur-3xl"
          animate={{ y: [0, 14, 0], x: [0, -8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-3 self-start">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white shadow-soft backdrop-blur-md">
              <img src="/logo.png" alt="Swarnandrian" className="h-8 w-8 rounded-xl object-cover" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white" style={{fontFamily:'Plus Jakarta Sans'}}>Swarnandrian</span>
          </Link>

          <div className="mx-auto max-w-xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-md">
              <LoginRoundedIcon sx={{ fontSize: 14 }} /> Secure campus access
            </div>
            <h2 className="mt-6 text-4xl font-bold leading-tight text-white xl:text-5xl" style={{fontFamily:'Plus Jakarta Sans'}}>
              A simpler login for students, faculty, and admins.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-slate-200/90">
              One clean screen. Clear role selection. Fast access to the tools you need inside Swarnandrian.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-semibold text-cyan-100">
              {[
                { icon: RiShieldLine, label: 'Secure access' },
                { icon: RiGroupLine, label: 'Role aware' },
                { icon: RiUserLine, label: 'Personalized' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-md">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Fast access', value: 'One clean sign in', icon: LoginRoundedIcon },
              { label: 'Role based', value: 'Student, faculty, admin', icon: HubRoundedIcon },
              { label: 'Protected', value: 'Private sessions', icon: SecurityRoundedIcon },
            ].map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-white/12 bg-white/10 p-4 shadow-soft backdrop-blur-md"
              >
                <card.icon sx={{ fontSize: 18 }} className="text-cyan-100" />
                <p className="mt-3 text-sm font-semibold text-white">{card.label}</p>
                <p className="mt-1 text-xs text-slate-200/80">{card.value}</p>
              </motion.div>
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

          <div className="card border-theme bg-surface-card/95 p-7 shadow-[0_20px_48px_rgba(2,8,23,0.10)] backdrop-blur-xl sm:p-8">
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

            {submitError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700 shadow-sm dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200" role="alert" aria-live="polite">
                <div className="flex items-start gap-3">
                  <WarningAmberRoundedIcon sx={{ fontSize: 18 }} className="mt-0.5 text-red-500" />
                  <div className="min-w-0">
                    <p className="font-semibold text-red-800 dark:text-red-100">Sign-in failed</p>
                    <p className="mt-1 leading-6">{submitError}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary">{PLACEHOLDER[role]}</label>
                <input
                  className={`input ${errors.userId ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  placeholder={`Enter your ${PLACEHOLDER[role]}`}
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    if (submitError) setSubmitError('');
                    if (errors.userId) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.userId;
                        return next;
                      });
                    }
                  }}
                  autoComplete="username"
                  autoFocus
                  aria-invalid={Boolean(errors.userId)}
                  aria-describedby={errors.userId ? 'login-userid-error' : undefined}
                />
                {errors.userId && <p id="login-userid-error" className="mt-1.5 text-xs text-red-500">{errors.userId}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary">Password</label>
                <div className="relative">
                  <input
                    className={`input pr-10 ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPass(e.target.value);
                      if (submitError) setSubmitError('');
                      if (errors.password) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.password;
                          return next;
                        });
                      }
                    }}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                  />
                  <button type="button" onClick={()=>setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary">
                    {showPw?<RiEyeOffLine className="w-4 h-4"/>:<RiEyeLine className="w-4 h-4"/>}
                  </button>
                </div>
                {errors.password && <p id="login-password-error" className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
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
