import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Lenis from 'lenis';
import { motion, useScroll, useTransform } from 'framer-motion';
import { applyPageMetadata } from '../utils/seo';
import {
  RiArrowRightLine,
  RiBarChartBoxLine,
  RiBarChartLine,
  RiBookMarkedLine,
  RiBrainLine,
  RiCodeLine,
  RiCpuLine,
  RiDatabase2Line,
  RiRadarLine,
  RiRocket2Line,
  RiShieldCheckLine,
  RiTrophyLine,
  RiUserStarLine,
} from 'react-icons/ri';

const SITE_NAME = 'Swarnandrian';
const COLLEGE_NAME = 'Swarnandhra College of Engineering and Technology';
const LANDING_TITLE = `${SITE_NAME} | ${COLLEGE_NAME} Learning & Evaluation Platform`;
const LANDING_DESCRIPTION = `Swarnandrian powers coding practice, assessments, contests, and portfolios for ${COLLEGE_NAME}, Seetharampuram.`;
const LANDING_KEYWORDS = [
  'Swarnandhra College of Engineering and Technology',
  'SCET',
  'Seetharampuram',
  'Narsapur',
  'student training platform',
  'coding practice',
  'aptitude assessment',
  'faculty dashboard',
  'college competition portal',
  'student portfolio',
];

const ecosystemNodes = [
  { title: 'Code Execution', icon: RiCodeLine, left: '8%', top: '38%', accent: '#60C7FF' },
  { title: 'Assessments', icon: RiBrainLine, left: '28%', top: '14%', accent: '#8B9EFF' },
  { title: 'Competitions', icon: RiTrophyLine, left: '68%', top: '16%', accent: '#5DD8C7' },
  { title: 'Analytics', icon: RiBarChartLine, left: '82%', top: '44%', accent: '#7CC9FF' },
  { title: 'Portfolio', icon: RiUserStarLine, left: '60%', top: '77%', accent: '#35B9FF' },
  { title: 'Anti-Cheat', icon: RiShieldCheckLine, left: '22%', top: '76%', accent: '#7A5CFF' },
];

const roleStories = [
  {
    name: 'Admin Command Center',
    subtitle: 'Govern users, batches, performance, and institutional outcomes from one ops cockpit.',
    points: ['Bulk onboarding in minutes', 'Global benchmark analytics', 'Policy controls and privilege matrix'],
    accent: '#4CC9F0',
    route: '/login?role=admin',
    stats: ['24 Departments Online', '6 Active Drives', '97.4% Assessment Integrity'],
  },
  {
    name: 'Faculty Mission Deck',
    subtitle: 'Design tests, launch coding rounds, evaluate quickly, and deliver targeted remediation.',
    points: ['Reusable question banks', 'Timed competition orchestration', 'Section-wise student heatmaps'],
    accent: '#8B9EFF',
    route: '/login?role=faculty',
    stats: ['42 Question Sets Live', '2,400 Submissions This Week', 'Real-time regrading controls'],
  },
  {
    name: 'Student Flight Console',
    subtitle: 'Practice with feedback loops, track momentum, and build portfolio evidence recruiters can trust.',
    points: ['Instant judge verdicts', 'Personal growth timeline', 'Public profile and project visibility'],
    accent: '#34D1BF',
    route: '/login?role=student',
    stats: ['5+ Supported Languages', 'Live percentile tracking', 'Achievement timeline exports'],
  },
];

const hudStats = [
  { label: 'Students', value: 2000, suffix: '+' },
  { label: 'Live Competitions', value: 120, suffix: '+' },
  { label: 'Supported Languages', value: 5, suffix: '+' },
  { label: 'Institutions', value: 30, suffix: '+' },
];

const floatTransition = {
  repeat: Infinity,
  repeatType: 'mirror',
  duration: 4.6,
  ease: 'easeInOut',
};

function Counter({ value, label, suffix }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;

    let rafId;
    let started = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        const duration = 1500;
        const startedAt = performance.now();

        const tick = (now) => {
          const p = Math.min((now - startedAt) / duration, 1);
          setCurrent(Math.floor(value * p));
          if (p < 1) rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
      },
      { threshold: 0.45 }
    );

    obs.observe(ref.current);

    return () => {
      obs.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [value]);

  return (
    <div ref={ref} className="rounded-2xl border border-white/10 bg-[#0D1635]/70 px-5 py-6 backdrop-blur-md">
      <p className="text-4xl font-bold text-white md:text-5xl">
        {current}
        {suffix}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#90A0D0]">{label}</p>
    </div>
  );
}

export default function LandingPage() {
  const heroRef = useRef(null);
  const rolesRef = useRef(null);
  const [roleStep, setRoleStep] = useState(0);

  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2.2,
        delay: `${Math.random() * 4}s`,
        duration: `${2.4 + Math.random() * 3.8}s`,
      })),
    []
  );

  const { scrollY } = useScroll();
  const spaceLayerY = useTransform(scrollY, [0, 700], [0, 120]);
  const heroPanelsY = useTransform(scrollY, [0, 700], [0, -70]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.2,
    });

    let raf;
    const rafLoop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(rafLoop);
    };

    raf = requestAnimationFrame(rafLoop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

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
          url: 'https://www.swarnandhra.ac.in/',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Seetharampuram, Narasapur',
            addressLocality: 'Seetharampuram',
            addressRegion: 'Andhra Pradesh',
            postalCode: '534280',
            addressCountry: 'IN',
          },
        },
      },
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!rolesRef.current) return;

      const rect = rolesRef.current.getBoundingClientRect();
      const span = Math.max(rect.height - window.innerHeight, 1);
      const progress = Math.min(Math.max(-rect.top / span, 0), 0.999);
      const nextStep = Math.min(2, Math.floor(progress * 3));
      setRoleStep(nextStep);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const activeStory = roleStories[roleStep];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050B1D] text-white">
      <style>{`
        @keyframes starPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.94); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes radarSweep {
          0% { transform: rotate(0deg); opacity: 0.72; }
          100% { transform: rotate(360deg); opacity: 0.2; }
        }
        @keyframes signalRise {
          0% { transform: translateY(10px); opacity: 0.24; }
          100% { transform: translateY(-8px); opacity: 0.95; }
        }
      `}</style>

      <motion.div style={{ y: spaceLayerY }} className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(55,122,255,0.22),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(112,82,255,0.2),transparent_48%),radial-gradient(circle_at_65%_75%,rgba(15,173,255,0.2),transparent_50%),linear-gradient(180deg,#040914_0%,#070E24_45%,#050B1D_100%)]" />
        {stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-[#C9DEFF]"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              boxShadow: '0 0 14px rgba(115,173,255,0.85)',
              animation: `starPulse ${star.duration} ease-in-out ${star.delay} infinite`,
            }}
          />
        ))}
      </motion.div>

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050B1D]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Swarnandrian" className="h-10 w-10 rounded-xl border border-white/20 object-cover" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#86A3FF]">Swarnandrian</p>
              <p className="text-xs text-[#8AA1D5]">For Swarnandhra College of Engineering and Technology</p>
            </div>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-[#91A5D9] md:flex">
            <a href="#ecosystem" className="transition hover:text-white">Ecosystem</a>
            <a href="#preview" className="transition hover:text-white">Live Preview</a>
            <a href="#intelligence" className="transition hover:text-white">Intelligence</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden rounded-full border border-white/20 px-5 py-2 text-sm text-[#BFD0F9] transition hover:border-[#65C8FF] hover:text-white sm:inline-flex">
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#3DA4FF] to-[#7A5CFF] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_22px_rgba(93,140,255,0.45)] transition hover:scale-[1.02]"
            >
              Get Started
              <RiArrowRightLine className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative min-h-screen px-5 pb-16 pt-28 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative z-10">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex rounded-full border border-[#5A85E0]/40 bg-[#1B2A58]/55 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#9DC0FF]"
            >
              Swarnandhra College Learning Ecosystem
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08 }}
              className="mt-7 text-5xl font-bold leading-[1.05] text-white sm:text-6xl lg:text-7xl"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Train. <span className="text-[#5FB8FF]">Compete.</span> Excel.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.16 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-[#AABAE5]"
            >
              Swarnandrian unifies coding labs, aptitude assessments, contests, and talent portfolios into one immersive platform for Swarnandhra College of Engineering and Technology in Seetharampuram.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.24 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#35B9FF] to-[#7559FF] px-7 py-3.5 text-base font-semibold text-white shadow-[0_0_26px_rgba(82,132,255,0.52)] transition hover:-translate-y-0.5"
              >
                Get Started Free
                <RiArrowRightLine className="h-4 w-4" />
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center rounded-full border border-white/20 bg-[#111D45]/55 px-7 py-3.5 text-base text-[#CAE1FF] transition hover:border-[#61C3FF] hover:text-white"
              >
                Explore Platform
              </a>
            </motion.div>
          </div>

          <motion.div style={{ y: heroPanelsY }} className="relative z-10 hidden h-[560px] lg:block">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.85, delay: 0.12 }}
              className="absolute right-0 top-6 w-[78%] rounded-3xl border border-[#76C6FF]/30 bg-[#0E1A44]/70 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-lg"
            >
              <div className="mb-4 flex items-center justify-between text-xs text-[#9AB2E9]">
                <span className="uppercase tracking-[0.16em]">Code Arena</span>
                <span className="rounded-full bg-[#0A2B67] px-3 py-1 text-[#7CC9FF]">Live Judge</span>
              </div>
              <div className="rounded-2xl bg-[#0A1332] p-4 font-mono text-sm text-[#82B5FF]">
                <p className="text-[#7A95CF]">function shortestPath(graph, source) {`{`}</p>
                <p className="pl-4">const queue = [source];</p>
                <p className="pl-4">while (queue.length) {`{`} ... {`}`}</p>
                <p className="text-[#7A95CF]">{`}`}</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={floatTransition}
              className="absolute left-0 top-48 w-[65%] rounded-3xl border border-[#8A78FF]/28 bg-[#141944]/72 p-5 shadow-[0_16px_42px_rgba(16,15,46,0.6)] backdrop-blur-lg"
            >
              <div className="mb-4 flex items-center justify-between text-xs text-[#BEB7FF]">
                <span className="uppercase tracking-[0.16em]">Leaderboard</span>
                <span className="text-[#51D4FF]">WebSocket Sync</span>
              </div>
              {['Aanya Rao', 'Irfan Khan', 'Sanjana P', 'Rahul K'].map((name, i) => (
                <div key={name} className="mb-2 flex items-center justify-between rounded-xl bg-[#0D1336] px-3 py-2 text-sm">
                  <span className="text-[#C8D4FF]">#{i + 1} {name}</span>
                  <span className="text-[#67C8FF]">{940 - i * 17} pts</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              animate={{ y: [9, -9, 9] }}
              transition={{ ...floatTransition, duration: 5.2 }}
              className="absolute bottom-2 right-10 w-[56%] rounded-3xl border border-[#4AD7C5]/28 bg-[#0C203D]/75 p-4 shadow-[0_16px_46px_rgba(6,30,56,0.52)] backdrop-blur-lg"
            >
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[#9EDFD6]">
                <span>Performance Analytics</span>
                <RiBarChartBoxLine className="h-4 w-4" />
              </div>
              <div className="grid grid-cols-5 items-end gap-2">
                {[42, 66, 52, 82, 75].map((h, i) => (
                  <span
                    key={h}
                    className="rounded-t-md bg-gradient-to-t from-[#29D2C2] to-[#67B6FF]"
                    style={{ height: `${h}px`, opacity: 0.65 + i * 0.06 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="ecosystem" className="relative px-5 py-20 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#84A7FF]">Platform Ecosystem</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight text-white md:text-5xl">A connected learning intelligence network.</h2>
            <p className="mt-4 text-[#98ADD9]">Every module talks to each other: submissions drive analytics, assessments shape readiness, and portfolio signals reveal growth.</p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A1435]/70 px-5 py-10 backdrop-blur-lg sm:px-8 lg:px-10 lg:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,201,240,0.09),transparent_26%),radial-gradient(circle_at_50%_50%,rgba(118,198,255,0.08),transparent_40%)]" />

            <div className="relative grid min-h-[520px] place-items-center">
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {ecosystemNodes.map((node, idx) => (
                  <motion.line
                    key={node.title}
                    x1="50"
                    y1="50"
                    x2={Number.parseFloat(node.left)}
                    y2={Number.parseFloat(node.top)}
                    stroke="rgba(121, 180, 255, 0.35)"
                    strokeWidth="0.35"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.75, delay: idx * 0.08 }}
                  />
                ))}
              </svg>

              <motion.div
                whileInView={{ scale: [0.96, 1.03, 1], opacity: [0.78, 1, 1] }}
                viewport={{ once: true }}
                transition={{ duration: 1.15 }}
                className="relative z-20 flex h-40 w-40 items-center justify-center rounded-full border border-[#6CCBFF]/40 bg-[radial-gradient(circle_at_30%_30%,#6CCBFF_0%,#3348A6_45%,#101A48_100%)] shadow-[0_0_70px_rgba(72,156,255,0.42)]"
              >
                <img src="/logo.png" alt="Swarnandrian hub" className="h-20 w-20 rounded-xl object-cover" />
              </motion.div>

              <div className="absolute inset-0 hidden items-center justify-center lg:flex">
                <span className="absolute h-[18rem] w-[18rem] rounded-full border border-white/10" />
                <span className="absolute h-[28rem] w-[28rem] rounded-full border border-white/5" />
              </div>

              {ecosystemNodes.map((node, idx) => {
                const Icon = node.icon;
                const isLeft = Number.parseFloat(node.left) < 50;
                const lineWidth = isLeft ? '18vw' : '15vw';
                return (
                  <React.Fragment key={node.title}>
                    <motion.span
                      className="pointer-events-none absolute z-0 hidden h-px origin-left bg-gradient-to-r from-[#6CCBFF]/10 via-[#84A7FF]/65 to-transparent lg:block"
                      style={{
                        left: '50%',
                        top: node.top,
                        width: lineWidth,
                        transform: isLeft ? 'translateY(-50%) rotate(0deg)' : 'translateY(-50%) rotate(180deg)',
                        transformOrigin: isLeft ? 'left center' : 'right center',
                      }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      whileInView={{ scaleX: 1, opacity: 1 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.7, delay: idx * 0.08 }}
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.45 }}
                      transition={{ duration: 0.5, delay: idx * 0.08 }}
                      className="absolute z-10 w-40 rounded-2xl border border-white/10 bg-[#0F1B43]/80 p-3 backdrop-blur-md sm:w-44"
                      style={{ left: node.left, top: node.top, transform: 'translate(-50%, -50%)' }}
                    >
                      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: node.accent, boxShadow: `0 0 18px ${node.accent}` }} />
                      <div className="mb-2 inline-flex rounded-lg p-2 text-white shadow-[0_0_18px_rgba(91,160,255,0.24)]" style={{ background: node.accent }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-[#D9E5FF]">{node.title}</p>
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="preview" className="relative px-5 py-20 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-[#84A7FF]">Live Platform Preview</p>
              <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">See the interface your teams will actually use.</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[#9BB0DD]">Glassy UI modules designed for speed, clarity, and real-time competitive workflows.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <motion.article
              initial={{ opacity: 0, x: -30, rotate: -1.4 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.32 }}
              transition={{ duration: 0.7 }}
              className="rounded-3xl border border-white/10 bg-[#0F183A]/70 p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-[#86A6E9]">
                <span>Code Editor</span>
                <RiCodeLine className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-[#0B1230] p-4 font-mono text-xs text-[#7CC3FF]">
                <p className="text-[#748BC3]">#include &lt;bits/stdc++.h&gt;</p>
                <p>int main() {`{`}</p>
                <p className="pl-3">vector&lt;int&gt; nums = {`{`}2,4,7,11{`}`};</p>
                <p className="pl-3">cout &lt;&lt; twoSum(nums, 9);</p>
                <p>{`}`}</p>
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.34 }}
              transition={{ duration: 0.68, delay: 0.1 }}
              className="rounded-3xl border border-white/10 bg-[#12143C]/72 p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-[#B7B5FF]">
                <span>Leaderboard</span>
                <RiTrophyLine className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                {[
                  ['Team Orion', 1265],
                  ['Team Nova', 1210],
                  ['Team Zenith', 1198],
                  ['Team Vector', 1142],
                ].map(([team, score], i) => (
                  <div key={team} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0D1332] px-3 py-2 text-sm">
                    <p className="text-[#D6DEFF]">#{i + 1} {team}</p>
                    <p className="text-[#7BD8FF]">{score}</p>
                  </div>
                ))}
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, x: 30, rotate: 1.2 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.32 }}
              transition={{ duration: 0.72, delay: 0.12 }}
              className="rounded-3xl border border-white/10 bg-[#0E1E3D]/72 p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-[#9EE9D8]">
                <span>Student Profile</span>
                <RiBookMarkedLine className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0A1630] p-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#5BCEFF] to-[#4A6BFF]" />
                  <div>
                    <p className="font-semibold text-[#D8E8FF]">S. Priyanka</p>
                    <p className="text-xs text-[#84A4DC]">Problem Solving Track</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Rank', '87'],
                    ['Solved', '143'],
                    ['Streak', '39d'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-[#0E2146] px-2 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[#88A2DB]">{k}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.article>
          </div>
        </div>
      </section>

      <section ref={rolesRef} className="relative h-[220vh] px-5 lg:px-8">
        <div className="sticky top-24 mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-[#0A1538]/72 p-7 backdrop-blur-md lg:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#84A7FF]">Role Experience</p>
            <h2 className="mt-5 text-4xl font-bold leading-tight text-white">One platform. Three distinct mission experiences.</h2>
            <p className="mt-4 text-[#9CB0DD]">Scroll to move between role environments. The interface, priority metrics, and actions adapt to each user journey.</p>
            <div className="mt-8 flex gap-2">
              {roleStories.map((story, idx) => (
                <span
                  key={story.name}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    background: idx <= roleStep ? 'linear-gradient(90deg,#5DB8FF,#7F72FF)' : 'rgba(255,255,255,0.12)',
                  }}
                />
              ))}
            </div>
          </div>

          <motion.div
            key={activeStory.name}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42 }}
            className="rounded-3xl border border-white/10 bg-[#10183E]/75 p-7 shadow-[0_20px_40px_rgba(2,6,22,0.5)] backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold text-white">{activeStory.name}</h3>
              <Link
                to={activeStory.route}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{ background: `linear-gradient(90deg, ${activeStory.accent}, #6A6CFF)` }}
              >
                Enter View
                <RiArrowRightLine className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-4 max-w-2xl text-[#AFC3EE]">{activeStory.subtitle}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {activeStory.stats.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-[#111F4A]/75 px-4 py-3 text-sm text-[#D4E2FF]">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-7 space-y-3">
              {activeStory.points.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0C1432] px-4 py-3">
                  <RiRocket2Line className="mt-0.5 h-4 w-4 text-[#6BD1FF]" />
                  <p className="text-sm text-[#C9D8F8]">{point}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative px-5 py-20 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-[#84A7FF]">Impact Metrics</p>
            <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">Futuristic HUD. Real academic outcomes.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {hudStats.map((stat) => (
              <Counter key={stat.label} value={stat.value} label={stat.label} suffix={stat.suffix} />
            ))}
          </div>
        </div>
      </section>

      <section id="intelligence" className="relative px-5 pb-20 pt-14 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 rounded-[2rem] border border-white/10 bg-[#09132F]/75 p-7 backdrop-blur-md lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#84A7FF]">System Intelligence</p>
            <h2 className="mt-5 text-4xl font-bold leading-tight text-white">Anti-cheat and analytics built into the core engine.</h2>
            <p className="mt-5 text-[#A6B7DD]">
              Detection telemetry, behavior signals, and performance modeling work together to protect integrity while generating actionable insight.
            </p>
            <div className="mt-7 space-y-3">
              {[
                'Fullscreen and tab-switch event monitoring',
                'Submission fingerprint and suspicious pattern alerts',
                'Adaptive recommendation loops from score trajectories',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#101C45] px-4 py-3 text-sm text-[#D6E2FF]">
                  <RiShieldCheckLine className="mt-0.5 h-4 w-4 text-[#67C7FF]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-3xl border border-[#71D4FF]/25 bg-[#0A1638]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(65,214,255,0.25),transparent_48%),radial-gradient(circle_at_20%_20%,rgba(106,102,255,0.2),transparent_38%)]" />
            <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6BCFFF]/35" />
            <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6BCFFF]/30" />
            <div
              className="absolute left-1/2 top-1/2 h-56 w-1 -translate-x-1/2 -translate-y-1/2 origin-bottom bg-gradient-to-t from-transparent via-[#7FD8FF] to-transparent"
              style={{ animation: 'radarSweep 3.6s linear infinite' }}
            />

            <div className="absolute left-5 top-6 rounded-xl bg-[#12245A]/80 px-3 py-2 text-xs text-[#90B6FF]">
              Integrity Scan: Active
            </div>
            <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-2 text-center">
              {[
                ['Anomaly', '0.9%'],
                ['Trust Score', '98.4'],
                ['Signal', 'Stable'],
              ].map(([key, val], i) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/10 bg-[#11204F]/80 px-2 py-2"
                  style={{ animation: `signalRise ${1.3 + i * 0.2}s ease-in-out ${i * 0.1}s infinite alternate` }}
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#88A1D9]">{key}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{val}</p>
                </div>
              ))}
            </div>

            <div className="absolute right-5 top-6 flex gap-2 text-[#6FD6FF]">
              <RiRadarLine className="h-5 w-5" />
              <RiCpuLine className="h-5 w-5" />
              <RiDatabase2Line className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-5 pb-20 pt-10 lg:px-8">
        <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-[2.3rem] border border-[#7AC4FF]/20 bg-[radial-gradient(circle_at_50%_30%,rgba(82,182,255,0.22),transparent_55%),linear-gradient(180deg,#090F29_0%,#0A1233_100%)] px-8 py-14 text-center md:px-14">
          <p className="text-xs uppercase tracking-[0.2em] text-[#84A7FF]">Launch Your Campus Innovation Grid</p>
            <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl">
              Build the future of learning at Swarnandhra College.
            </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[#A8BAE2]">
            Power students, faculty, and administrators with one intelligent, competition-ready platform.
          </p>
          <Link
            to="/register"
            className="mx-auto mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#34B8FF] to-[#7759FF] px-9 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(91,136,255,0.52)] transition hover:-translate-y-0.5"
          >
            Create Your Account
            <RiArrowRightLine className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-7 text-center text-sm text-[#7B90C5] lg:px-8">
        <p>© {new Date().getFullYear()} Swarnandrian - Learning and Competence Platform</p>
      </footer>
    </div>
  );
}
