import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { applyPageMetadata } from '../../utils/seo';
import PublicPortfolioNavbar from '../../components/student/PublicPortfolioNavbar';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';

const publicApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  timeout: 30000,
});

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22,1,0.36,1] } }),
};

const SKILL_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
];

function Section({ icon: Icon, title, custom, children }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={custom}
      className="rounded-3xl border border-theme bg-surface-card p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <h2 className="font-bold text-lg mb-5 flex items-center gap-2 text-primary">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}>
          <Icon sx={{ fontSize: 16 }} />
        </span>
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${color}`}>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

export default function PublicPortfolio() {
  const { studentId } = useParams();
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery(
    ['public-portfolio', studentId],
    () => publicApi.get(`/profile/public/${studentId}`).then(r => r.data)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (isError) {
      applyPageMetadata({ title: 'Portfolio not found | Swarnandrian', robots: 'noindex,nofollow' });
      return undefined;
    }
    if (!data) return undefined;
    const title = `${data?.name || 'Public Portfolio'} | Swarnandrian`;
    const description = data?.profile?.objective || `${data?.name || 'Student'}\'s public portfolio on Swarnandrian.`;
    const origin = window.location.origin;
    applyPageMetadata({
      title, description,
      keywords: [`${data?.name || 'Student'} portfolio`, 'Swarnandrian', 'student achievements'],
      robots: 'index,follow',
      canonical: `${origin}${window.location.pathname}`,
      url: `${origin}${window.location.pathname}`,
      image: data?.profile?.profile_photo_url || `${origin}/logo.png`,
      type: 'profile', siteName: 'Swarnandrian', locale: 'en_IN',
    });
  }, [data, isError]);

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy portfolio link', shareUrl); }
  };
  const handleNativeShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: data?.name || 'Public Portfolio', text: `View ${data?.name || 'this portfolio'} on Swarnandrian`, url: shareUrl });
      else await handleCopyLink();
    } catch {}
  };

  if (isLoading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#4F7CF3] border-t-transparent rounded-full animate-spin" />
        <p className="text-secondary text-sm">Loading portfolio…</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen bg-surface flex items-center justify-center text-center px-4">
      <div>
        <SentimentDissatisfiedRoundedIcon sx={{ fontSize: 52 }} className="text-muted mb-4" />
        <p className="text-secondary font-medium">Portfolio not found</p>
        <Link to="/" className="btn-primary mt-6 inline-block">← Go Home</Link>
      </div>
    </div>
  );

  const p = data?.profile || {};
  const stats = data?.stats || {};

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'achievements', label: 'Achievements' },
  ];

  return (
    <div className="min-h-screen bg-surface text-primary">
      <PublicPortfolioNavbar />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* ── Hero ─── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible"
          className="rounded-3xl border border-theme bg-surface-card overflow-hidden shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
          {/* Banner strip */}
          <div className="h-24 bg-gradient-to-r from-[#4F7CF3] via-[#7C8CFF] to-[#F6B8C6] relative">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>

          <div className="px-6 sm:px-8 pb-6">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
              <div className="relative z-10 h-24 w-24 flex-shrink-0 overflow-hidden rounded-3xl border-4 border-surface-card bg-gradient-to-br from-[#4F7CF3]/15 to-[#7C8CFF]/15 shadow-lg">
                {p.profile_photo_url ? (
                  <img src={p.profile_photo_url} alt="avatar"
                    className="h-full w-full object-cover object-top" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}>
                    {data?.name?.[0]}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 sm:mb-2">
                <button onClick={handleCopyLink} className="btn-secondary btn-sm flex items-center gap-1.5">
                  <ContentCopyRoundedIcon sx={{ fontSize: 14 }} /> {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button onClick={handleNativeShare} className="btn-secondary btn-sm flex items-center gap-1.5">
                  <ShareRoundedIcon sx={{ fontSize: 14 }} /> Share
                </button>
              </div>
            </div>

            {/* Name & meta */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">{data?.name}</h1>
              {data?.platform_rank && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <EmojiEventsRoundedIcon sx={{ fontSize: 14 }} /> Rank #{data.platform_rank}
                </span>
              )}
            </div>
            <p className="text-sm text-secondary mb-1">
              {data?.course} · {data?.department} · Year {data?.year}{data?.section ? ` · Sec ${data.section}` : ''}
            </p>
            {data?.student_id && <p className="text-xs text-muted mb-3">ID: {data.student_id}</p>}

            {p.objective && (
              <p className="text-sm leading-relaxed text-secondary max-w-2xl mb-4">{p.objective}</p>
            )}

            {/* Contact links */}
            <div className="flex flex-wrap gap-3">
              {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-[#4F7CF3] transition-colors"><EmailOutlinedIcon sx={{ fontSize: 15 }} /> {p.email}</a>}
              {p.phone && <span className="inline-flex items-center gap-1.5 text-xs text-secondary"><CallRoundedIcon sx={{ fontSize: 15 }} /> {p.phone}</span>}
              {p.github && <a href={p.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-[#4F7CF3] transition-colors"><GitHubIcon sx={{ fontSize: 15 }} /> GitHub</a>}
              {p.linkedin && <a href={p.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-[#4F7CF3] transition-colors"><LinkedInIcon sx={{ fontSize: 15 }} /> LinkedIn</a>}
              {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-[#4F7CF3] transition-colors"><LanguageRoundedIcon sx={{ fontSize: 15 }} /> Website</a>}
            </div>
          </div>
        </motion.div>

        {/* ── Platform Stats ─── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Total Score" value={stats?.total_score || data?.stats?.total_score} color="card-lavender" />
          <StatPill label="Problems Solved" value={stats?.problems_solved || data?.stats?.problems_solved} color="card-mint" />
          <StatPill label="Tests Attempted" value={stats?.tests_attempted || data?.stats?.tests_attempted} color="card-pink" />
          <StatPill label="Platform Rank" value={data?.platform_rank ? `#${data.platform_rank}` : '—'} color="card-yellow" />
        </motion.div>

        {/* ── Tab Navigation ─── */}
        <div className="flex gap-1 rounded-2xl border border-theme bg-surface-card p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-white shadow-sm' : 'text-secondary hover:text-primary'}`}
              style={activeTab === tab.id ? { background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' } : {}}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─── */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Skills */}
                {p.skills?.length > 0 && (
                  <Section icon={BuildRoundedIcon} title="Skills" custom={0}>
                    <div className="flex flex-wrap gap-2">
                      {p.skills.map((s, i) => (
                        <span key={s} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>{s}</span>
                      ))}
                    </div>
                  </Section>
                )}
                {/* Education */}
                {p.education?.length > 0 && (
                  <Section icon={SchoolRoundedIcon} title="Education" custom={1}>
                    <div className="space-y-3">
                      {p.education.map((edu, i) => (
                        <div key={`${edu.institution}-${i}`} className="flex gap-3 rounded-2xl border border-theme bg-surface p-4">
                          <div className="w-9 h-9 rounded-xl bg-[#4F7CF3]/10 flex items-center justify-center flex-shrink-0">
                            <SchoolRoundedIcon sx={{ fontSize: 18 }} className="text-[#4F7CF3]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-primary text-sm">{edu.institution}</p>
                            <p className="text-xs text-secondary mt-0.5">{edu.degree} · {edu.year}</p>
                            {edu.description && <p className="text-xs text-secondary mt-1">{edu.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
              {/* Interests */}
              {p.interests?.length > 0 && (
                <Section icon={AutoAwesomeRoundedIcon} title="Interests" custom={2}>
                  <div className="flex flex-wrap gap-2">
                    {p.interests.map(i => <span key={i} className="rounded-full border border-theme bg-surface px-3 py-1.5 text-sm text-secondary">{i}</span>)}
                  </div>
                </Section>
              )}
            </motion.div>
          )}

          {activeTab === 'experience' && (
            <motion.div key="experience" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
              {/* Internships */}
              {p.internships?.length > 0 ? (
                <Section icon={WorkOutlineRoundedIcon} title="Internships & Work Experience" custom={0}>
                  <div className="space-y-3">
                    {p.internships.map((intern, i) => (
                      <div key={i} className="flex gap-4 rounded-2xl border border-theme bg-surface p-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <ApartmentRoundedIcon sx={{ fontSize: 18 }} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-primary">{intern.role}</p>
                          <p className="text-sm text-secondary">{intern.company}</p>
                          <p className="text-xs text-muted mt-0.5">{intern.duration}</p>
                          {intern.description && <p className="text-xs text-secondary mt-2 leading-relaxed">{intern.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : (
                <div className="card p-12 text-center text-secondary">No experience listed yet</div>
              )}
            </motion.div>
          )}

          {activeTab === 'projects' && (
            <motion.div key="projects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
              {p.projects?.length > 0 ? (
                <Section icon={RocketLaunchRoundedIcon} title="Projects" custom={0}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {p.projects.map((proj, i) => (
                      <div key={i} className="rounded-2xl border border-theme bg-surface p-4 flex flex-col gap-3 hover:border-[rgba(79,124,243,0.4)] transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-primary text-sm">{proj.title}</h3>
                          {proj.link && (
                            <a href={proj.link} target="_blank" rel="noreferrer"
                              className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-[#4F7CF3]/10 px-2.5 py-1 text-xs font-medium text-[#4F7CF3] hover:bg-[#4F7CF3]/20 transition-colors">
                              <OpenInNewRoundedIcon sx={{ fontSize: 12 }} /> View
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-secondary leading-relaxed flex-1">{proj.description}</p>
                        {proj.tech_stack?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {proj.tech_stack.map(t => <span key={t} className="rounded-full bg-surface-lighter px-2 py-0.5 text-xs text-secondary border border-theme">{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              ) : (
                <div className="card p-12 text-center text-secondary">No projects listed yet</div>
              )}
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div key="achievements" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                {p.achievements?.length > 0 && (
                  <Section icon={WorkspacePremiumRoundedIcon} title="Achievements" custom={0}>
                    <div className="space-y-2">
                      {p.achievements.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl border border-theme bg-surface p-3">
                          <StarRoundedIcon sx={{ fontSize: 16 }} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-secondary">{a}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
                {p.certificates?.length > 0 && (
                  <Section icon={DescriptionRoundedIcon} title="Certificates" custom={1}>
                    <div className="space-y-3">
                      {p.certificates.map((c, i) => (
                        <div key={i} className="rounded-2xl border border-theme bg-surface p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-primary text-sm">{c.name}</p>
                              <p className="text-xs text-secondary mt-0.5">{c.issuer} · {c.year}</p>
                            </div>
                            <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18 }} className="text-emerald-500 flex-shrink-0" />
                          </div>
                          {c.link && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-theme">
                              <a href={c.link} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#4F7CF3] hover:underline flex items-center gap-1">
                                <VisibilityRoundedIcon sx={{ fontSize: 13 }} /> View Certificate
                              </a>
                              <a href={c.link} target="_blank" rel="noreferrer" download className="text-xs font-medium text-secondary hover:text-primary flex items-center gap-1">
                                <DownloadRoundedIcon sx={{ fontSize: 13 }} /> Download
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
              {!p.achievements?.length && !p.certificates?.length && (
                <div className="card p-12 text-center text-secondary">No achievements listed yet</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="border-t border-theme py-6 text-center text-xs text-secondary mt-8">
        Portfolio powered by <span className="font-semibold text-primary">Swarnandrian Platform</span>
      </footer>
    </div>
  );
}
