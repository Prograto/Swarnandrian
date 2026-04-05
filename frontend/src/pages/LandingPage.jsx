import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { applyPageMetadata } from '../utils/seo';
import {
  RiArrowRightLine,
  RiBarChartBoxLine,
  RiBookMarkedLine,
  RiCodeLine,
  RiShieldCheckLine,
  RiTrophyLine,
  RiUserStarLine,
} from 'react-icons/ri';

const SITE_NAME = 'Swarnandrian';
const COLLEGE_NAME = 'Swarnandhra College of Engineering and Technology';
const COLLEGE_URL = 'https://www.swarnandhra.ac.in/';

const LANDING_TITLE = `${SITE_NAME} | ${COLLEGE_NAME}`;
const LANDING_DESCRIPTION = `${SITE_NAME} is a simple learning and evaluation platform for students, faculty, and administrators at ${COLLEGE_NAME}.`;
const LANDING_KEYWORDS = [
  'Swarnandrian',
  'Swarnandhra College of Engineering and Technology',
  'student learning platform',
  'coding practice',
  'aptitude assessment',
  'faculty dashboard',
  'student portfolio',
];

const heroStats = [
  { label: 'User roles', value: '3' },
  { label: 'Core tracks', value: '4' },
  { label: 'One login', value: '1' },
];

const platformPillars = [
  {
    icon: RiCodeLine,
    title: 'Practice with focus',
    description: 'Students can solve coding, aptitude, and technical problems in one clean workspace.',
  },
  {
    icon: RiBarChartBoxLine,
    title: 'Evaluate with clarity',
    description: 'Faculty can create tests, review scores, and keep assessment data organized.',
  },
  {
    icon: RiUserStarLine,
    title: 'Show progress',
    description: 'Profiles, badges, and portfolio views make growth visible and easy to share.',
  },
];

const roleCards = [
  {
    icon: RiCodeLine,
    title: 'Students',
    points: ['Practice problems and tests', 'Track scores and streaks', 'Build a public portfolio'],
  },
  {
    icon: RiBookMarkedLine,
    title: 'Faculty',
    points: ['Create and manage assessments', 'Review submissions quickly', 'Monitor performance trends'],
  },
  {
    icon: RiShieldCheckLine,
    title: 'Admins',
    points: ['Manage users and access', 'View platform health', 'Keep the workspace organized'],
  },
];

const previewCards = [
  {
    icon: RiCodeLine,
    title: 'Coding practice',
    text: 'A straightforward flow for solving and submitting problems.',
  },
  {
    icon: RiTrophyLine,
    title: 'Competitions',
    text: 'Simple competition setup with scoring and ranking views.',
  },
  {
    icon: RiBarChartBoxLine,
    title: 'Analytics',
    text: 'Quick progress snapshots for students and faculty teams.',
  },
  {
    icon: RiUserStarLine,
    title: 'Profiles',
    text: 'A compact public portfolio and badge showcase.',
  },
];

const floatingOrbs = [
  { className: 'left-[6%] top-[18%] h-20 w-20 bg-[#4F7CF3]/10', motion: { y: [0, -12, 0], x: [0, 8, 0] }, duration: 10 },
  { className: 'right-[8%] top-[34%] h-28 w-28 bg-[#7C8CFF]/10', motion: { y: [0, 16, 0], x: [0, -10, 0] }, duration: 12 },
  { className: 'left-[52%] bottom-[10%] h-16 w-16 bg-[#34d399]/10', motion: { y: [0, -10, 0], x: [0, 6, 0] }, duration: 11 },
];

function SectionTag({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4F7CF3]">{children}</p>;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-theme bg-surface-card px-4 py-4 shadow-soft">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-sm text-secondary">{label}</p>
    </div>
  );
}

function IconTile({ icon: Icon }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4F7CF3]/10 text-[#4F7CF3]">
      <Icon className="h-5 w-5" />
    </div>
  );
}

export default function LandingPage() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const origin = window.location.origin;
    const canonicalUrl = `${origin}/`;

    applyPageMetadata({
      title: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
      keywords: LANDING_KEYWORDS,
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      canonical: canonicalUrl,
      url: canonicalUrl,
      image: `${origin}/logo.png`,
      imageAlt: `${SITE_NAME} logo`,
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_IN',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: SITE_NAME,
        description: LANDING_DESCRIPTION,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        url: canonicalUrl,
        image: `${origin}/logo.png`,
        publisher: {
          '@type': 'CollegeOrUniversity',
          name: COLLEGE_NAME,
          url: COLLEGE_URL,
        },
      },
    });
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface text-primary">
      {floatingOrbs.map((orb, index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          className={`pointer-events-none absolute z-0 rounded-full blur-3xl ${orb.className}`}
          animate={orb.motion}
          transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,124,243,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(124,140,255,0.10),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(245,248,255,0.95))] dark:bg-[radial-gradient(circle_at_top_left,rgba(79,124,243,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(124,140,255,0.14),transparent_32%),linear-gradient(180deg,rgba(6,11,28,0.92),rgba(9,16,39,0.98))]" />

      <header className="sticky top-0 z-40 border-b border-theme bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt={SITE_NAME} className="h-10 w-10 rounded-2xl border border-theme object-cover shadow-soft" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{SITE_NAME}</p>
              <p className="text-xs text-secondary">{COLLEGE_NAME}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-secondary md:flex">
            <a href="#about" className="transition hover:text-primary">About</a>
            <a href="#platform" className="transition hover:text-primary">Platform</a>
            <a href="#roles" className="transition hover:text-primary">Roles</a>
            <a href={COLLEGE_URL} target="_blank" rel="noreferrer" className="transition hover:text-primary">
              Visit College
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={COLLEGE_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-theme bg-surface-card px-4 py-2 text-sm font-semibold text-primary transition hover:border-[#4F7CF3]/40 hover:text-[#4F7CF3] sm:inline-flex"
            >
              Visit College
            </a>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-[#4F7CF3] px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#4068db]">
              Sign In
              <RiArrowRightLine className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section id="platform" className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <SectionTag>Simple learning platform</SectionTag>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-primary sm:text-5xl lg:text-6xl"
            >
              Swarnandrian keeps practice, evaluation, and progress in one place.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-5 max-w-2xl text-base leading-8 text-secondary sm:text-lg"
            >
              Built for {COLLEGE_NAME}, Swarnandrian gives students a clean space to practice, gives faculty a fast way to evaluate, and gives admins a simple way to keep everything organized.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-[#4F7CF3] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#4068db]">
                Get Started
                <RiArrowRightLine className="h-4 w-4" />
              </Link>
              <a
                href={COLLEGE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-theme bg-surface-card px-6 py-3 text-sm font-semibold text-primary transition hover:border-[#4F7CF3]/40 hover:text-[#4F7CF3]"
              >
                Visit College
              </a>
            </motion.div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  whileHover={{ y: -3 }}
                >
                  <StatCard label={stat.label} value={stat.value} />
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="relative"
          >
            <div className="absolute -left-6 top-8 h-24 w-24 rounded-full bg-[#4F7CF3]/10 blur-3xl" />
            <div className="absolute -right-4 bottom-8 h-28 w-28 rounded-full bg-[#7C8CFF]/10 blur-3xl" />

            <div className="card relative overflow-hidden p-6 sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,124,243,0.12),transparent_28%)]" />
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <SectionTag>Platform preview</SectionTag>
                  <h2 className="mt-2 text-2xl font-bold text-primary">A calm dashboard for everyday academic work.</h2>
                </div>
                <span className="badge badge-mint">Demo view</span>
              </div>

              <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
                {previewCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.35 }}
                      transition={{ duration: 0.45, delay: index * 0.08 }}
                      whileHover={{ y: -3 }}
                      className="rounded-2xl border border-theme bg-surface-card p-4 shadow-soft"
                    >
                      <div className="flex items-start gap-3">
                        <IconTile icon={Icon} />
                        <div>
                          <p className="font-semibold text-primary">{card.title}</p>
                          <p className="mt-1 text-sm leading-6 text-secondary">{card.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="relative mt-5 rounded-2xl border border-theme bg-surface-lighter p-4">
                <p className="text-sm font-semibold text-primary">What the platform focuses on</p>
                <p className="mt-1 text-sm leading-6 text-secondary">
                  Less clutter, faster navigation, and a simple workflow for learning, testing, and showcasing progress.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="about" className="px-5 py-10 lg:px-8 lg:py-14">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <SectionTag>About the platform</SectionTag>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-primary sm:text-4xl">
                Built by and for the academic ecosystem at {COLLEGE_NAME}.
              </h2>
              <p className="mt-4 text-base leading-8 text-secondary sm:text-lg">
                Swarnandrian is the digital learning and evaluation platform for the college. It brings together practice, assessments, competitions, analytics, and profiles in a straightforward interface that feels easy to use.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {platformPillars.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                    whileHover={{ y: -4 }}
                    className="card p-5"
                  >
                    <IconTile icon={Icon} />
                    <h3 className="mt-4 text-lg font-bold text-primary">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-secondary">{pillar.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="roles" className="px-5 py-10 lg:px-8 lg:py-14">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-8 max-w-2xl">
              <SectionTag>Who uses it</SectionTag>
              <h2 className="mt-4 text-3xl font-bold text-primary sm:text-4xl">One platform, three simple experiences.</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {roleCards.map((role, index) => {
                const Icon = role.icon;
                return (
                  <motion.div
                    key={role.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                    whileHover={{ y: -4 }}
                    className="card p-6"
                  >
                    <div className="flex items-center gap-3">
                      <IconTile icon={Icon} />
                      <div>
                        <p className="text-lg font-bold text-primary">{role.title}</p>
                        <p className="text-sm text-secondary">Simple tools that match the role.</p>
                      </div>
                    </div>

                    <ul className="mt-5 space-y-3 text-sm text-secondary">
                      {role.points.map((point) => (
                        <li key={point} className="flex items-start gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-[#4F7CF3]" />
                          <span className="leading-6">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-10 pb-20 lg:px-8 lg:py-14 lg:pb-24">
          <div className="mx-auto w-full max-w-7xl">
            <div className="card overflow-hidden p-6 sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <SectionTag>Visit the college</SectionTag>
                  <h2 className="mt-4 text-3xl font-bold leading-tight text-primary sm:text-4xl">
                    Learn more about {COLLEGE_NAME}.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-secondary">
                    See the institution behind Swarnandrian and explore the college that supports the platform, its students, and its academic culture.
                  </p>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <a
                    href={COLLEGE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4F7CF3] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#4068db] sm:w-auto"
                  >
                    Visit College
                    <RiArrowRightLine className="h-4 w-4" />
                  </a>
                  <Link
                    to="/register"
                    className="inline-flex w-full items-center justify-center rounded-full border border-theme bg-surface-card px-6 py-3 text-sm font-semibold text-primary transition hover:border-[#4F7CF3]/40 hover:text-[#4F7CF3] sm:w-auto"
                  >
                    Create an account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-theme px-5 py-6 text-center text-sm text-secondary lg:px-8">
        <p>
          © {new Date().getFullYear()} {SITE_NAME} - {COLLEGE_NAME}
        </p>
      </footer>
    </div>
  );
}
