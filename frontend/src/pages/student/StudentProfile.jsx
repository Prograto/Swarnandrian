import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import StudentPortalLayout from '../../components/student/StudentPortalLayout';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import InterestsRoundedIcon from '@mui/icons-material/InterestsRounded';
import PasswordRoundedIcon from '@mui/icons-material/PasswordRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { getApiErrorMessage } from '../../utils/apiError';

const EMPTY_PROJECT = { title: '', description: '', tech_stack: '', link: '' };
const EMPTY_INTERNSHIP = { company: '', role: '', duration: '', description: '' };
const EMPTY_CERTIFICATE = { name: '', issuer: '', year: '', link: '' };
const EMPTY_EDUCATION = { institution: '', degree: '', year: '', description: '' };
const SKILLS_LIST = ['Python', 'JavaScript', 'C++', 'Java', 'React', 'Node.js', 'MongoDB', 'SQL', 'Data Structures', 'Algorithms', 'Machine Learning', 'Docker'];

function normalizeRows(rows, template) {
  if (!Array.isArray(rows) || rows.length === 0) return [template()];
  return rows.map((row) => ({ ...template(), ...row }));
}

function splitCsvList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function toCsvInput(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return typeof value === 'string' ? value : '';
}

function BadgeTier({ score = 0 }) {
  const tier = score >= 1500 ? 'Advanced' : score >= 500 ? 'Intermediate' : 'Beginner';
  const color = score >= 1500 ? 'bg-emerald-100 text-emerald-700' : score >= 500 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{tier}</span>;
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-secondary">{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="input" />
    </label>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-secondary">{label}</span>
      <textarea rows={rows} value={value} onChange={onChange} placeholder={placeholder} className="input resize-none" />
    </label>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div>
      <h3 className="inline-flex items-center gap-2 font-semibold text-primary">
        <Icon sx={{ fontSize: 18 }} />
        {title}
      </h3>
      {description && <p className="mt-1 text-xs text-secondary">{description}</p>}
    </div>
  );
}

function CardShell({ children, className = '', ...props }) {
  return <div {...props} data-lenis-prevent-wheel data-lenis-prevent-touch className={`rounded-3xl border border-theme bg-surface-card p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)] ${className}`}>{children}</div>;
}

export default function StudentProfile() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({});

  const { data: profile } = useQuery('my-profile', () => api.get('/profile/me').then((r) => r.data));
  const { data: stats } = useQuery('my-stats', () => api.get('/profile/me/stats').then((r) => r.data), { staleTime: 60000 });
  const { data: codingSubmissions = [] } = useQuery('profile-coding-submissions', () => api.get('/submissions/code/history?limit=20').then((r) => r.data?.submissions || []), { staleTime: 60000 });
  const { data: testSubmissions = [] } = useQuery('profile-test-submissions', () => api.get('/submissions/aptitude/history?limit=20').then((r) => r.data?.submissions || []), { staleTime: 60000 });
  const { data: competitionSubmissions = [] } = useQuery('profile-competition-submissions', () => api.get('/submissions/competitions/history?limit=20').then((r) => r.data?.submissions || []), { staleTime: 60000 });

  const p = profile?.profile || {};

  useEffect(() => {
    if (!profile || editing) return;
    setForm({
      name: profile?.name || '',
      phone: p.phone || '',
      github: p.github || '',
      linkedin: p.linkedin || '',
      portfolio_url: p.portfolio_url || '',
      profile_photo_url: p.profile_photo_url || '',
      objective: p.objective || '',
      skills: p.skills || [],
      projects: normalizeRows(p.projects, () => ({ ...EMPTY_PROJECT })).map((project) => ({
        ...project,
        tech_stack: toCsvInput(project.tech_stack),
      })),
      internships: normalizeRows(p.internships, () => ({ ...EMPTY_INTERNSHIP })),
      achievements: p.achievements || [],
      education: normalizeRows(p.education, () => ({ ...EMPTY_EDUCATION })),
      certificates: normalizeRows(p.certificates, () => ({ ...EMPTY_CERTIFICATE })),
      interests: p.interests || [],
      password: '',
    });
  }, [profile, editing]);

  const saveMutation = useMutation((payload) => api.put('/profile/me', payload), {
    onSuccess: async () => {
      await queryClient.invalidateQueries('my-profile');
      setEditing(false);
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Update failed')),
  });

  const uploadAsset = async (file, folder) => {
    const data = new FormData();
    data.append('file', file);
    const response = await api.post(`/upload/?folder=${encodeURIComponent(folder)}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateListItem = (key, index, nextValue) => setForm((prev) => ({ ...prev, [key]: prev[key].map((item, itemIndex) => (itemIndex === index ? nextValue : item)) }));
  const addListItem = (key, template) => setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), template()] }));
  const removeListItem = (key, index) => setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, itemIndex) => itemIndex !== index) }));

  const toggleSkill = (skill) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills?.includes(skill) ? prev.skills.filter((item) => item !== skill) : [...(prev.skills || []), skill],
    }));
  };

  const handleProfilePhotoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAsset(file, 'profile-photos');
      updateField('profile_photo_url', result.url);
      toast.success('Profile photo uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Photo upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleCertificateUpload = async (index, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAsset(file, 'certificates');
      updateListItem('certificates', index, {
        ...form.certificates[index],
        link: result.url,
        name: form.certificates[index].name || result.filename || file.name,
      });
      toast.success('Certificate uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Certificate upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const normalizedProjects = (form.projects || [])
      .map((item) => ({
        title: (item.title || '').trim(),
        description: (item.description || '').trim(),
        tech_stack: splitCsvList(item.tech_stack),
        link: (item.link || '').trim() || null,
      }))
      .filter((item) => item.title || item.description || item.tech_stack.length || item.link);

    const normalizedInternships = (form.internships || [])
      .map((item) => ({
        company: (item.company || '').trim(),
        role: (item.role || '').trim(),
        duration: (item.duration || '').trim(),
        description: (item.description || '').trim(),
      }))
      .filter((item) => item.company || item.role || item.duration || item.description);

    const normalizedEducation = (form.education || [])
      .map((item) => ({
        institution: (item.institution || '').trim(),
        degree: (item.degree || '').trim(),
        year: (item.year || '').trim(),
        description: (item.description || '').trim(),
      }))
      .filter((item) => item.institution || item.degree || item.year || item.description);

    const normalizedCertificates = (form.certificates || [])
      .map((item) => ({
        name: (item.name || '').trim(),
        issuer: (item.issuer || '').trim(),
        year: item.year === '' || item.year === null || item.year === undefined ? null : Number(item.year),
        link: (item.link || '').trim() || null,
      }))
      .filter((item) => item.name || item.issuer || item.year !== null || item.link);

    saveMutation.mutate({
      name: form.name,
      phone: form.phone,
      github: form.github,
      linkedin: form.linkedin,
      portfolio_url: form.portfolio_url,
      profile_photo_url: form.profile_photo_url,
      skills: (form.skills || []).map((skill) => String(skill).trim()).filter(Boolean),
      projects: normalizedProjects,
      internships: normalizedInternships,
      achievements: (form.achievements || []).map((achievement) => String(achievement).trim()).filter(Boolean),
      education: normalizedEducation,
      certificates: normalizedCertificates,
      objective: form.objective,
      interests: (form.interests || []).map((interest) => String(interest).trim()).filter(Boolean),
      password: form.password?.trim() || undefined,
    });
  };

  const recentActivity = useMemo(() => {
    const combined = [
      ...(codingSubmissions || []).map((item) => ({ ...item, activityType: 'Coding' })),
      ...(testSubmissions || []).map((item) => ({ ...item, activityType: item.section_type === 'technical' ? 'Technical' : 'Aptitude' })),
      ...(competitionSubmissions || []).map((item) => ({ ...item, activityType: 'Competition' })),
    ];

    return combined.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 5);
  }, [codingSubmissions, testSubmissions, competitionSubmissions]);

  const accepted = stats?.accepted_submissions || 0;
  const totalSubmissions = stats?.total_submissions || 0;
  const totalScore = stats?.stats?.total_score || 0;

  const editSections = [
    { id: 'profile-personal', label: 'Personal' },
    { id: 'profile-security', label: 'Security' },
    { id: 'profile-skills', label: 'Skills' },
    { id: 'profile-projects', label: 'Projects' },
    { id: 'profile-internships', label: 'Internships' },
    { id: 'profile-education', label: 'Education' },
    { id: 'profile-achievements', label: 'Achievements' },
    { id: 'profile-certificates', label: 'Certificates' },
    { id: 'profile-interests', label: 'Interests' },
  ];

  const editNavGroups = [
    {
      title: 'Student',
      items: editSections.filter((section) => ['profile-personal', 'profile-security', 'profile-education'].includes(section.id)),
    },
    {
      title: 'Portfolio',
      items: editSections.filter((section) => !['profile-personal', 'profile-security', 'profile-education'].includes(section.id)),
    },
  ];

  const viewMode = (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <CardShell className="overflow-hidden">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-3xl border border-theme bg-gradient-to-br from-[#4F7CF3]/15 to-[#7C8CFF]/15">
                {p.profile_photo_url ? (
                  <img src={p.profile_photo_url} alt={profile?.name || 'Student'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-primary">{profile?.name?.[0] || 'S'}</div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-primary">{profile?.name || 'Student Profile'}</h1>
                  <BadgeTier score={totalScore} />
                </div>
                <p className="mt-1 text-sm text-secondary">{profile?.course} · {profile?.department} · Year {profile?.year}</p>
                {profile?.section && <p className="mt-1 text-xs font-medium text-secondary">Section {profile.section}</p>}
                <p className="mt-1 text-xs font-mono text-secondary">{profile?.student_id}</p>
                {p.objective && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">{p.objective}</p>}
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {p.github && <a href={p.github} target="_blank" rel="noreferrer" className="rounded-full border border-theme bg-surface-card px-3 py-1.5 text-secondary transition-colors hover:text-primary">GitHub</a>}
                  {p.linkedin && <a href={p.linkedin} target="_blank" rel="noreferrer" className="rounded-full border border-theme bg-surface-card px-3 py-1.5 text-secondary transition-colors hover:text-primary">LinkedIn</a>}
                  {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noreferrer" className="rounded-full border border-theme bg-surface-card px-3 py-1.5 text-secondary transition-colors hover:text-primary">Portfolio</a>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 sm:justify-end">
              <Link to={`/portfolio/${profile?.student_id}`} target="_blank" className="btn-secondary text-sm inline-flex items-center gap-2">
                <LinkRoundedIcon sx={{ fontSize: 16 }} /> Preview Portfolio
              </Link>
              <button onClick={() => setEditing(true)} className="btn-primary text-sm inline-flex items-center gap-2">
                <EditRoundedIcon sx={{ fontSize: 16 }} /> Edit Profile
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Accepted', value: accepted, icon: EmojiEventsRoundedIcon },
              { label: 'Submissions', value: totalSubmissions, icon: HistoryRoundedIcon },
              { label: 'Total Score', value: totalScore, icon: WorkspacePremiumRoundedIcon },
              { label: 'Badge', value: <BadgeTier score={totalScore} />, icon: PersonOutlineRoundedIcon },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon sx={{ fontSize: 18 }} />
                  </div>
                  <p className="mt-3 text-xs text-secondary">{stat.label}</p>
                  <div className="mt-1 text-lg font-bold text-primary">{stat.value}</div>
                </div>
              );
            })}
          </div>
        </CardShell>

        <CardShell>
          <SectionHeader icon={HistoryRoundedIcon} title="Test History" description="Coding, aptitude, technical, and competition submissions." />
          <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
            {recentActivity.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-theme px-4 py-8 text-center text-sm text-secondary">No test submissions yet.</p>
            ) : recentActivity.map((item) => (
              <div key={`${item.id}-${item.submitted_at}`} className="rounded-2xl border border-theme bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-secondary">{item.activityType || item.type}</p>
                    <p className="mt-1 font-semibold text-primary">{item.name || item.problem_name || item.test_name || 'Submission'}</p>
                    <p className="mt-1 text-xs text-secondary">{new Date(item.submitted_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{item.marks || item.score || 0}</p>
                    <p className="text-xs text-secondary">score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/student/leaderboard" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <EmojiEventsRoundedIcon sx={{ fontSize: 16 }} /> Open leaderboard
          </Link>
        </CardShell>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CardShell>
          <SectionHeader icon={BuildRoundedIcon} title="Skills" description="Badge-ready and easy to update." />
          <div className="mt-4 flex max-h-72 flex-wrap gap-2 overflow-y-auto pr-1">
            {(p.skills || []).length > 0 ? p.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-theme bg-surface px-3 py-1.5 text-sm text-secondary">{skill}</span>
            )) : <p className="text-sm text-secondary">No skills added yet.</p>}
          </div>
        </CardShell>

        <CardShell>
          <SectionHeader icon={InterestsRoundedIcon} title="Interests" description="A quick summary of what you want recruiters to see." />
          <div className="mt-4 flex flex-wrap gap-2">
            {(p.interests || []).length > 0 ? p.interests.map((interest) => (
              <span key={interest} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary">{interest}</span>
            )) : <p className="text-sm text-secondary">No interests listed yet.</p>}
          </div>
        </CardShell>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CardShell>
          <SectionHeader icon={RocketLaunchRoundedIcon} title="Projects" description="Scrollable cards with tech stacks and links." />
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {(p.projects || []).length > 0 ? p.projects.map((project, index) => (
              <div key={`${project.title}-${index}`} className="rounded-2xl border border-theme bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-primary">{project.title}</h4>
                  {project.link && <a href={project.link} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">View</a>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{project.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {splitCsvList(project.tech_stack).map((tech) => <span key={tech} className="rounded-full bg-surface-lighter px-2.5 py-1 text-xs text-secondary">{tech}</span>)}
                </div>
              </div>
            )) : <p className="text-sm text-secondary">No projects added yet.</p>}
          </div>
        </CardShell>

        <CardShell>
          <SectionHeader icon={WorkOutlineRoundedIcon} title="Education & Certificates" description="Keep academic history and uploads in one place." />
          <div className="mt-4 space-y-6">
            <div>
              <p className="mb-3 text-sm font-semibold text-primary inline-flex items-center gap-2"><SchoolRoundedIcon sx={{ fontSize: 18 }} /> Education</p>
              <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {(p.education || []).length > 0 ? p.education.map((entry, index) => (
                  <div key={`${entry.institution}-${index}`} className="rounded-2xl border border-theme bg-surface p-4">
                    <p className="font-semibold text-primary">{entry.institution}</p>
                    <p className="text-sm text-secondary">{entry.degree} · {entry.year}</p>
                    {entry.description && <p className="mt-1 text-xs text-secondary">{entry.description}</p>}
                  </div>
                )) : <p className="text-sm text-secondary">No education details added yet.</p>}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-primary inline-flex items-center gap-2"><WorkspacePremiumRoundedIcon sx={{ fontSize: 18 }} /> Certificates</p>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {(p.certificates || []).length > 0 ? p.certificates.map((certificate, index) => (
                  <div key={`${certificate.name}-${index}`} className="rounded-2xl border border-theme bg-surface p-4">
                    <p className="font-semibold text-primary">{certificate.name}</p>
                    <p className="text-sm text-secondary">{certificate.issuer} · {certificate.year || '—'}</p>
                    {certificate.link && <a href={certificate.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">Open file</a>}
                  </div>
                )) : <p className="text-sm text-secondary">No certificates added yet.</p>}
              </div>
            </div>
          </div>
        </CardShell>
      </div>
    </div>
  );

  const editMode = (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-secondary">Profile Studio</p>
          <h1 className="mt-1 text-2xl font-bold text-primary">Edit your portfolio profile</h1>
          <p className="mt-1 text-sm text-secondary">Update contact info, portfolio content, uploads, and account security in one place.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to={`/portfolio/${profile?.student_id}`} target="_blank" className="btn-secondary text-sm inline-flex items-center gap-2">
            <LinkRoundedIcon sx={{ fontSize: 16 }} /> Preview Portfolio
          </Link>
          <button onClick={() => setEditing(false)} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saveMutation.isLoading || uploading} className="btn-primary text-sm inline-flex items-center gap-2">
            <SaveRoundedIcon sx={{ fontSize: 16 }} /> {saveMutation.isLoading ? 'Saving...' : uploading ? 'Uploading...' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-theme bg-surface-card px-4 py-3">
        <div className="grid gap-4 lg:grid-cols-2">
          {editNavGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">{group.title}</p>
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
                {group.items.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="whitespace-nowrap rounded-full border border-theme bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-surface-lighter hover:text-primary"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CardShell className="scroll-mt-24" id="profile-personal">
          <SectionHeader icon={PersonOutlineRoundedIcon} title="Personal details" description="Name, phone number, and profile image." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={form.name || ''} onChange={(e) => updateField('name', e.target.value)} placeholder="Your name" />
            <Field label="Phone" value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="+91 98765 43210" />
            <div className="sm:col-span-2 rounded-3xl border border-dashed border-theme bg-surface p-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-theme bg-surface-lighter">
                  {form.profile_photo_url ? <img src={form.profile_photo_url} alt="Profile preview" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-secondary"><PhotoCameraRoundedIcon /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">Profile image</p>
                  <p className="text-xs text-secondary">Upload a clean headshot or avatar. It will be stored in S3.</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-theme bg-surface-card px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-lighter">
                    <CloudUploadRoundedIcon sx={{ fontSize: 16 }} /> {uploading ? 'Uploading...' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProfilePhotoUpload(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardShell>

        <CardShell className="scroll-mt-24" id="profile-security">
          <SectionHeader icon={PasswordRoundedIcon} title="Security" description="Optional password update during profile save." />
          <div className="mt-4 space-y-4">
            <Field label="GitHub" value={form.github || ''} onChange={(e) => updateField('github', e.target.value)} placeholder="https://github.com/yourname" />
            <Field label="LinkedIn" value={form.linkedin || ''} onChange={(e) => updateField('linkedin', e.target.value)} placeholder="https://linkedin.com/in/yourname" />
            <Field label="Portfolio URL" value={form.portfolio_url || ''} onChange={(e) => updateField('portfolio_url', e.target.value)} placeholder="https://yourportfolio.com" />
            <Field label="New Password" value={form.password || ''} onChange={(e) => updateField('password', e.target.value)} placeholder="Leave blank to keep current password" type="password" />
          </div>
        </CardShell>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CardShell className="scroll-mt-24" id="profile-skills">
          <SectionHeader icon={BuildRoundedIcon} title="Skills" description="Pick from the preset list or add a custom one." />
          <div className="mt-4 flex flex-wrap gap-2">
            {SKILLS_LIST.map((skill) => (
              <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${form.skills?.includes(skill) ? 'border-primary/30 bg-primary/10 text-primary' : 'border-theme bg-surface text-secondary hover:bg-surface-lighter'}`}>
                {skill}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => {
              const value = window.prompt('Enter a custom skill');
              if (value?.trim()) toggleSkill(value.trim());
            }} className="btn-secondary text-sm inline-flex items-center gap-2">
              <AddRoundedIcon sx={{ fontSize: 16 }} /> Add skill
            </button>
          </div>
        </CardShell>

        <CardShell className="scroll-mt-24" id="profile-objective">
          <SectionHeader icon={RocketLaunchRoundedIcon} title="Objective" description="A concise summary for recruiters and the public portfolio." />
          <div className="mt-4">
            <TextareaField label="Objective / Bio" value={form.objective || ''} onChange={(e) => updateField('objective', e.target.value)} placeholder="Describe your focus, strengths, and goals." rows={6} />
          </div>
        </CardShell>
      </div>

      <CardShell className="scroll-mt-24" id="profile-projects">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader icon={RocketLaunchRoundedIcon} title="Projects" description="Scrollable cards with tech stacks, links, and descriptions." />
          <button type="button" onClick={() => addListItem('projects', () => ({ ...EMPTY_PROJECT }))} className="btn-secondary text-sm inline-flex items-center gap-2 self-start lg:self-auto">
            <AddRoundedIcon sx={{ fontSize: 16 }} /> Add project
          </button>
        </div>
        <div className="mt-4 max-h-96 space-y-4 overflow-y-auto pr-1">
          {(form.projects || []).map((project, index) => (
            <div key={index} className="rounded-3xl border border-theme bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-primary">Project {index + 1}</p>
                <button type="button" onClick={() => removeListItem('projects', index)} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"><DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /> Remove</button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Title" value={project.title || ''} onChange={(e) => updateListItem('projects', index, { ...project, title: e.target.value })} placeholder="Project title" />
                <Field label="Link" value={project.link || ''} onChange={(e) => updateListItem('projects', index, { ...project, link: e.target.value })} placeholder="https://..." />
                <TextareaField label="Description" value={project.description || ''} onChange={(e) => updateListItem('projects', index, { ...project, description: e.target.value })} placeholder="What did you build?" rows={3} />
                <Field label="Tech stack" value={toCsvInput(project.tech_stack)} onChange={(e) => updateListItem('projects', index, { ...project, tech_stack: e.target.value })} placeholder="React, FastAPI, PostgreSQL" />
              </div>
            </div>
          ))}
        </div>
      </CardShell>

      <div className="grid gap-6 xl:grid-cols-2">
        <CardShell className="scroll-mt-24" id="profile-internships">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader icon={WorkOutlineRoundedIcon} title="Internships" description="Add roles, duration, and organization summaries." />
            <button type="button" onClick={() => addListItem('internships', () => ({ ...EMPTY_INTERNSHIP }))} className="btn-secondary text-sm inline-flex items-center gap-2"><AddRoundedIcon sx={{ fontSize: 16 }} /> Add internship</button>
          </div>
          <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
            {(form.internships || []).map((internship, index) => (
              <div key={index} className="rounded-3xl border border-theme bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-primary">Internship {index + 1}</p>
                  <button type="button" onClick={() => removeListItem('internships', index)} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"><DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /> Remove</button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Company" value={internship.company || ''} onChange={(e) => updateListItem('internships', index, { ...internship, company: e.target.value })} placeholder="Company" />
                  <Field label="Role" value={internship.role || ''} onChange={(e) => updateListItem('internships', index, { ...internship, role: e.target.value })} placeholder="Role" />
                  <Field label="Duration" value={internship.duration || ''} onChange={(e) => updateListItem('internships', index, { ...internship, duration: e.target.value })} placeholder="Jun 2025 - Aug 2025" />
                  <TextareaField label="Description" value={internship.description || ''} onChange={(e) => updateListItem('internships', index, { ...internship, description: e.target.value })} placeholder="Short summary of responsibilities" rows={3} />
                </div>
              </div>
            ))}
          </div>
        </CardShell>

        <CardShell className="scroll-mt-24" id="profile-education">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader icon={SchoolRoundedIcon} title="Education" description="Academic history shown on the public portfolio." />
            <button type="button" onClick={() => addListItem('education', () => ({ ...EMPTY_EDUCATION }))} className="btn-secondary text-sm inline-flex items-center gap-2"><AddRoundedIcon sx={{ fontSize: 16 }} /> Add education</button>
          </div>
          <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
            {(form.education || []).map((education, index) => (
              <div key={index} className="rounded-3xl border border-theme bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-primary">Education {index + 1}</p>
                  <button type="button" onClick={() => removeListItem('education', index)} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"><DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /> Remove</button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Institution" value={education.institution || ''} onChange={(e) => updateListItem('education', index, { ...education, institution: e.target.value })} placeholder="University / College" />
                  <Field label="Degree" value={education.degree || ''} onChange={(e) => updateListItem('education', index, { ...education, degree: e.target.value })} placeholder="B.Tech Computer Science" />
                  <Field label="Year" value={education.year || ''} onChange={(e) => updateListItem('education', index, { ...education, year: e.target.value })} placeholder="2023 - 2027" />
                  <TextareaField label="Description" value={education.description || ''} onChange={(e) => updateListItem('education', index, { ...education, description: e.target.value })} placeholder="Awards, GPA, specialization" rows={3} />
                </div>
              </div>
            ))}
          </div>
        </CardShell>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CardShell className="scroll-mt-24" id="profile-achievements">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader icon={WorkspacePremiumRoundedIcon} title="Achievements" description="Short statements shown in the portfolio and on the profile card." />
            <button type="button" onClick={() => setForm((prev) => ({ ...prev, achievements: [...(prev.achievements || []), ''] }))} className="btn-secondary text-sm inline-flex items-center gap-2"><AddRoundedIcon sx={{ fontSize: 16 }} /> Add achievement</button>
          </div>
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {(form.achievements || []).map((achievement, index) => (
              <div key={index} className="flex gap-2">
                <input className="input flex-1" value={achievement} onChange={(e) => setForm((prev) => ({ ...prev, achievements: prev.achievements.map((item, itemIndex) => itemIndex === index ? e.target.value : item) }))} placeholder="Achievement statement" />
                <button type="button" onClick={() => setForm((prev) => ({ ...prev, achievements: prev.achievements.filter((_, itemIndex) => itemIndex !== index) }))} className="inline-flex items-center justify-center rounded-2xl border border-theme px-3 text-red-500 hover:bg-red-50"><DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} /></button>
              </div>
            ))}
          </div>
        </CardShell>

        <CardShell className="scroll-mt-24" id="profile-certificates">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader icon={WorkspacePremiumRoundedIcon} title="Certificates" description="Upload a file and attach metadata for each certificate." />
            <button type="button" onClick={() => addListItem('certificates', () => ({ ...EMPTY_CERTIFICATE }))} className="btn-secondary text-sm inline-flex items-center gap-2"><AddRoundedIcon sx={{ fontSize: 16 }} /> Add certificate</button>
          </div>
          <div className="mt-4 max-h-96 space-y-4 overflow-y-auto pr-1">
            {(form.certificates || []).map((certificate, index) => (
              <div key={index} className="rounded-3xl border border-theme bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-primary">Certificate {index + 1}</p>
                  <button type="button" onClick={() => removeListItem('certificates', index)} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"><DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /> Remove</button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Name" value={certificate.name || ''} onChange={(e) => updateListItem('certificates', index, { ...certificate, name: e.target.value })} placeholder="Certificate title" />
                  <Field label="Issuer" value={certificate.issuer || ''} onChange={(e) => updateListItem('certificates', index, { ...certificate, issuer: e.target.value })} placeholder="Issuer" />
                  <Field label="Year" value={certificate.year || ''} onChange={(e) => updateListItem('certificates', index, { ...certificate, year: e.target.value })} placeholder="2026" />
                  <Field label="Link / File URL" value={certificate.link || ''} onChange={(e) => updateListItem('certificates', index, { ...certificate, link: e.target.value })} placeholder="https://..." />
                  <label className="sm:col-span-2 block rounded-2xl border border-dashed border-theme bg-surface-card p-4">
                    <span className="mb-1 block text-xs font-semibold text-secondary">Upload certificate file</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input type="file" accept=".pdf,image/*" onChange={(e) => handleCertificateUpload(index, e.target.files?.[0])} className="text-sm text-secondary" />
                      {certificate.link && <a href={certificate.link} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">Open uploaded file</a>}
                    </div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </CardShell>
      </div>

      <CardShell className="scroll-mt-24" id="profile-interests">
        <SectionHeader icon={InterestsRoundedIcon} title="Interests" description="Comma-separated topics and areas you want to highlight." />
        <div className="mt-4 flex flex-wrap gap-2">
          {(form.interests || []).map((interest, index) => <span key={`${interest}-${index}`} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary">{interest}</span>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => {
            const value = window.prompt('Add interest');
            if (value?.trim()) setForm((prev) => ({ ...prev, interests: [...(prev.interests || []), value.trim()] }));
          }} className="btn-secondary text-sm inline-flex items-center gap-2">
            <AddRoundedIcon sx={{ fontSize: 16 }} /> Add interest
          </button>
        </div>
      </CardShell>
    </div>
  );

  return (
    <StudentPortalLayout>
      <AnimatePresence mode="wait">
        <motion.div key={editing ? 'edit' : 'view'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.18 }}>
          {editing ? editMode : viewMode}
        </motion.div>
      </AnimatePresence>
    </StudentPortalLayout>
  );
}
