import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
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

const publicApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  timeout: 30000,
});

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function PublicPortfolio() {
  const { studentId } = useParams();
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const { data, isLoading, isError } = useQuery(
    ['public-portfolio', studentId],
    () => publicApi.get(`/profile/public/${studentId}`).then(r => r.data)
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (isError) {
      const origin = window.location.origin;

      applyPageMetadata({
        title: `Portfolio not found | Swarnandrian`,
        description: 'The requested public portfolio could not be found on Swarnandrian.',
        keywords: ['public portfolio', 'Swarnandrian', 'not found'],
        robots: 'noindex,nofollow',
        canonical: `${origin}${window.location.pathname}`,
        url: `${origin}${window.location.pathname}`,
        image: `${origin}/logo.png`,
        imageAlt: 'Swarnandrian logo',
        type: 'website',
        siteName: 'Swarnandrian',
        locale: 'en_IN',
        jsonLd: null,
      });

      return undefined;
    }

    if (!data) return undefined;

    const title = `${data?.name || 'Public Portfolio'} | Swarnandrian`;
    const description = data?.profile?.objective || `${data?.name || 'Student'}'s public portfolio on Swarnandrian.`;
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${window.location.pathname}`;
    const image = data?.profile?.profile_photo_url || `${origin}/logo.png`;

    applyPageMetadata({
      title,
      description,
      keywords: [
        `${data?.name || 'Student'} portfolio`,
        'Swarnandrian',
        'student achievements',
        'coding profile',
      ],
      robots: 'index,follow',
      canonical: canonicalUrl,
      url: canonicalUrl,
      image,
      imageAlt: `${data?.name || 'Student'} portfolio image`,
      type: 'profile',
      siteName: 'Swarnandrian',
      locale: 'en_IN',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: title,
        description,
        url: canonicalUrl,
        mainEntity: {
          '@type': 'Person',
          name: data?.name || 'Student',
          alumniOf: {
            '@type': 'CollegeOrUniversity',
            name: 'Swarnandhra College of Engineering and Technology',
          },
        },
      },
    });
  }, [data, isError]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt('Copy portfolio link', shareUrl);
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: data?.name || 'Public Portfolio',
          text: `View ${data?.name || 'this portfolio'} on Swarnandrian`,
          url: shareUrl,
        });
      } else {
        await handleCopyLink();
      }
    } catch {
      // Ignore share cancellations.
    }
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`View ${data?.name || 'this portfolio'} on Swarnandrian`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-secondary animate-pulse">Loading portfolio…</div>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen bg-surface flex items-center justify-center text-center px-4">
      <div>
        <p className="text-5xl mb-4 inline-flex"><SentimentDissatisfiedRoundedIcon sx={{ fontSize: 42 }} /></p>
        <p className="text-secondary">Portfolio not found.</p>
        <Link to="/" className="btn-primary mt-6 inline-block">← Home</Link>
      </div>
    </div>
  );

  const p = data?.profile || {};

  return (
    <div className="min-h-screen bg-surface text-primary">
      <PublicPortfolioNavbar />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Hero */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="rounded-3xl border border-theme bg-surface-card p-6 sm:p-8 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {p.profile_photo_url ? (
              <img src={p.profile_photo_url} alt="avatar" className="h-28 w-28 rounded-3xl object-cover border border-theme shrink-0" loading="lazy" />
            ) : (
              <div className="h-28 w-28 rounded-3xl bg-primary/10 border border-theme flex items-center justify-center text-4xl font-bold text-primary shrink-0">
                {data?.name?.[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-primary">{data?.name}</h1>
                {data?.platform_rank && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
                    <EmojiEventsRoundedIcon sx={{ fontSize: 14 }} /> Platform Rank #{data.platform_rank}
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-secondary">{data?.course} in {data?.department} · Year {data?.year}{data?.section ? ` · Section ${data.section}` : ''}</p>
              {p.objective && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-secondary">{p.objective}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                {p.email    && <a href={`mailto:${p.email}`}    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><EmailOutlinedIcon sx={{ fontSize: 14 }} /> Email</a>}
                {p.github   && <a href={p.github}   target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><GitHubIcon sx={{ fontSize: 14 }} /> GitHub</a>}
                {p.linkedin && <a href={p.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><LinkedInIcon sx={{ fontSize: 14 }} /> LinkedIn</a>}
                {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><LanguageRoundedIcon sx={{ fontSize: 14 }} /> Website</a>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-2 rounded-full border border-theme bg-surface px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary">
                  <ContentCopyRoundedIcon sx={{ fontSize: 14 }} /> Copy link
                </button>
                <button type="button" onClick={handleNativeShare} className="inline-flex items-center gap-2 rounded-full border border-theme bg-surface px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary">
                  <ShareRoundedIcon sx={{ fontSize: 14 }} /> Share
                </button>
                <button type="button" onClick={handleTwitterShare} className="inline-flex items-center gap-2 rounded-full border border-theme bg-surface px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary">
                  <LanguageRoundedIcon sx={{ fontSize: 14 }} /> Share on X
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Skills */}
          {p.skills?.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="rounded-3xl border border-theme bg-surface-card p-6">
              <h2 className="font-semibold text-lg mb-4 inline-flex items-center gap-2"><BuildRoundedIcon sx={{ fontSize: 20 }} /> Skills</h2>
              <div className="flex flex-wrap gap-2">
                {p.skills.map((s) => (
                  <span key={s} className="rounded-full border border-theme bg-surface px-3 py-1.5 text-sm text-secondary">{s}</span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Education */}
          {p.education?.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="rounded-3xl border border-theme bg-surface-card p-6">
              <h2 className="font-semibold text-lg mb-4 inline-flex items-center gap-2"><SchoolRoundedIcon sx={{ fontSize: 20 }} /> Education</h2>
              <div className="space-y-3">
                {p.education.map((edu, i) => (
                  <div key={`${edu.institution}-${i}`} className="rounded-2xl border border-theme bg-surface p-4">
                    <p className="font-semibold text-primary">{edu.institution}</p>
                    <p className="text-sm text-secondary">{edu.degree} · {edu.year}</p>
                    {edu.description && <p className="mt-1 text-xs text-secondary">{edu.description}</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Projects */}
          {p.projects?.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="rounded-3xl border border-theme bg-surface-card p-6">
              <h2 className="font-semibold text-lg mb-4 inline-flex items-center gap-2"><RocketLaunchRoundedIcon sx={{ fontSize: 20 }} /> Projects</h2>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {p.projects.map((proj, i) => (
                  <div key={i} className="rounded-2xl border border-theme bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium text-primary">{proj.title}</h3>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                          <VisibilityRoundedIcon sx={{ fontSize: 14 }} /> View
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-secondary mt-2 leading-relaxed">{proj.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {proj.tech_stack?.map((t) => <span key={t} className="rounded-full bg-surface-lighter px-2 py-0.5 text-xs text-secondary">{t}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Internships */}
          {p.internships?.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="rounded-3xl border border-theme bg-surface-card p-6">
              <h2 className="font-semibold text-lg mb-4 inline-flex items-center gap-2"><WorkOutlineRoundedIcon sx={{ fontSize: 20 }} /> Internships</h2>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {p.internships.map((intern, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-theme bg-surface p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ApartmentRoundedIcon sx={{ fontSize: 18 }} /></div>
                    <div>
                      <p className="font-medium text-primary">{intern.role}</p>
                      <p className="text-sm text-secondary">{intern.company} · {intern.duration}</p>
                      {intern.description && <p className="text-xs text-secondary mt-1">{intern.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Achievements */}
          {p.achievements?.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="rounded-3xl border border-theme bg-surface-card p-6">
              <h2 className="font-semibold text-lg mb-4 inline-flex items-center gap-2"><WorkspacePremiumRoundedIcon sx={{ fontSize: 20 }} /> Achievements</h2>
              <ul className="space-y-2">
                {p.achievements.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-secondary"><span className="mt-0.5 text-amber-400">●</span> {a}</li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Certificates */}
          {p.certificates?.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6} className="rounded-3xl border border-theme bg-surface-card p-6">
              <h2 className="font-semibold text-lg mb-4 inline-flex items-center gap-2"><DescriptionRoundedIcon sx={{ fontSize: 20 }} /> Certificates</h2>
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {p.certificates.map((c, i) => (
                  <div key={i} className="rounded-2xl border border-theme bg-surface p-4">
                    <p className="font-medium text-primary text-sm">{c.name}</p>
                    <p className="text-xs text-secondary mt-0.5">{c.issuer} · {c.year}</p>
                    <div className="mt-2 flex items-center gap-3">
                      {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><VisibilityRoundedIcon sx={{ fontSize: 14 }} /> Preview</a>}
                      {c.link && <a href={c.link} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><DownloadRoundedIcon sx={{ fontSize: 14 }} /> Download</a>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Interests */}
        {p.interests?.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7} className="rounded-3xl border border-theme bg-surface-card p-6">
            <h2 className="font-semibold text-lg mb-3 inline-flex items-center gap-2"><AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} /> Interests</h2>
            <div className="flex flex-wrap gap-2">
              {p.interests.map((i) => <span key={i} className="rounded-full border border-theme bg-surface px-3 py-1 text-sm text-secondary">{i}</span>)}
            </div>
          </motion.div>
        )}
      </div>

      <footer className="border-t border-theme py-6 text-center text-xs text-secondary">
        Portfolio powered by Swarnandrian Platform
      </footer>
    </div>
  );
}
