import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { applyPageMetadata } from '../../utils/seo';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

const DEPARTMENTS = ['CSE','ECE','EEE','MECH','CIVIL','IT','AIDS','AIML','CSD','MBA'];
const COURSES     = ['BTech','MTech'];
const YEARS       = [1,2,3,4];
const SITE_NAME = 'Swarnandrian';
const COLLEGE_NAME = 'Swarnandhra College of Engineering and Technology';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoad] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '', course: 'BTech', year: '1',
    department: 'CSE', student_id: '', password: '', confirm: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const origin = window.location.origin;

    applyPageMetadata({
      title: `Student Registration | ${SITE_NAME}`,
      description: `Create a student account for ${SITE_NAME} at ${COLLEGE_NAME}.`,
      keywords: ['student registration', 'Swarnandrian', COLLEGE_NAME, 'student portal'],
      robots: 'noindex,nofollow',
      canonical: `${origin}/register`,
      url: `${origin}/register`,
      image: `${origin}/logo.png`,
      imageAlt: `${SITE_NAME} logo`,
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_IN',
      jsonLd: null,
    });
  }, []);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.student_id.trim()) next.student_id = 'Student ID is required';
    if (!form.password.trim()) next.password = 'Password is required';
    if (form.password.length < 6) next.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoad(true);
    try {
      await api.post('/auth/register/student', {
        name: form.name, course: form.course,
        year: parseInt(form.year), department: form.department,
        student_id: form.student_id, password: form.password,
      });
      toast.success('Registered! Please log in.');
      navigate('/login?role=student');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center font-bold text-lg shadow-glow">S</div>
            <span className="font-display font-bold text-xl text-primary">Swarnandrian</span>
          </Link>
          <p className="mt-2 text-secondary text-sm">Student Registration</p>
        </div>

        <div className="card p-8 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-secondary mb-1">Full Name</label>
              <input className={`input ${errors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`} placeholder="John Doe" value={form.name} onChange={e=>set('name',e.target.value)} required autoFocus />
              {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
            </div>
            {/* Course + Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-secondary mb-1">Course</label>
                <select className="input" value={form.course} onChange={e=>set('course',e.target.value)}>
                  {COURSES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Year</label>
                <select className="input" value={form.year} onChange={e=>set('year',e.target.value)}>
                  {YEARS.map(y=><option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
            {/* Department */}
            <div>
              <label className="block text-sm text-secondary mb-1">Department</label>
              <select className="input" value={form.department} onChange={e=>set('department',e.target.value)}>
                {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            {/* Student ID */}
            <div>
              <label className="block text-sm text-secondary mb-1">Student ID</label>
              <input className={`input ${errors.student_id ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`} placeholder="e.g. 22CS001" value={form.student_id} onChange={e=>set('student_id',e.target.value)} required />
              {errors.student_id && <p className="mt-1.5 text-xs text-red-500">{errors.student_id}</p>}
            </div>
            {/* Password */}
            <div>
              <label className="block text-sm text-secondary mb-1">Password</label>
              <input className={`input ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`} type="password" placeholder="••••••••" value={form.password} onChange={e=>set('password',e.target.value)} required />
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-sm text-secondary mb-1">Confirm Password</label>
              <input className={`input ${errors.confirm ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`} type="password" placeholder="••••••••" value={form.confirm} onChange={e=>set('confirm',e.target.value)} required />
              {errors.confirm && <p className="mt-1.5 text-xs text-red-500">{errors.confirm}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? 'Registering…' : <><span>Create Account</span><ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></>}
            </button>
          </form>

            <p className="text-center text-sm text-secondary">
            Already registered?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
