import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useThemeMode } from '../../context/ThemeContext';
import NotificationPanel from '../common/NotificationPanel';
import api from '../../utils/api';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import CollectionsBookmarkRoundedIcon from '@mui/icons-material/CollectionsBookmarkRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import PsychologyAltRoundedIcon from '@mui/icons-material/PsychologyAltRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';

const NAV_ITEMS = [
  {
    label: 'Coding',
    href: '/student/coding/practice',
    icon: CodeRoundedIcon,
    children: [
      { label: 'Practice Mode', href: '/student/coding/practice', icon: MenuBookRoundedIcon },
      { label: 'Competitor Mode', href: '/student/coding/competitor', icon: EmojiEventsRoundedIcon },
    ],
  },
  {
    label: 'Aptitude',
    href: '/student/aptitude/practice',
    icon: PsychologyAltRoundedIcon,
    children: [
      { label: 'Practice Mode', href: '/student/aptitude/practice', icon: MenuBookRoundedIcon },
      { label: 'Competitor Mode', href: '/student/aptitude/competitor', icon: EmojiEventsRoundedIcon },
    ],
  },
  {
    label: 'Technical',
    href: '/student/technical/practice',
    icon: SettingsRoundedIcon,
    children: [
      { label: 'Practice Mode', href: '/student/technical/practice', icon: MenuBookRoundedIcon },
      { label: 'Competitor Mode', href: '/student/technical/competitor', icon: EmojiEventsRoundedIcon },
    ],
  },
  { label: 'Media', href: '/student/media', icon: CollectionsBookmarkRoundedIcon },
  { label: 'Competitions', href: '/student/competitions', icon: FlagRoundedIcon },
  { label: 'Courses', href: '/student/courses', icon: MenuBookRoundedIcon },
];

const PROFILE_ITEMS = [
  { label: 'Profile', href: '/student/profile', icon: PersonOutlineRoundedIcon },
  { label: 'Results', href: '/student/results', icon: BarChartRoundedIcon },
  { label: 'Achievements', href: '/student/achievements', icon: WorkspacePremiumRoundedIcon },
  { label: 'Leaderboard', href: '/student/leaderboard', icon: EmojiEventsRoundedIcon },
  { label: 'Bookmarks', href: '/student/bookmarks', icon: BookmarkBorderRoundedIcon },
  { label: 'Change Password', href: '/student/profile#security', icon: LockRoundedIcon },
];

function useOutsideClose(ref, handler) {
  useEffect(() => {
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) handler();
    };

    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [handler, ref]);
}

function Avatar({ user }) {
  const initials = (user?.name || user?.student_id || 'S').slice(0, 1).toUpperCase();

  if (user?.profile?.profile_photo_url || user?.profile_photo_url) {
    return (
      <img
        src={user?.profile?.profile_photo_url || user?.profile_photo_url}
        alt={user?.name || 'Student'}
        className="h-full w-full object-cover"
      />
    );
  }

  return <span>{initials}</span>;
}

export default function StudentNavbar() {
  const { user, role, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navOpen, setNavOpen] = useState('');
  const navCloseTimerRef = useRef(null);
  const profileRef = useRef(null);
  const mobileRef = useRef(null);

  const { data: studentProfile } = useQuery(
    'my-profile',
    () => api.get('/profile/me').then((response) => response.data),
    {
      enabled: role === 'student' && !!user?.id,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const displayUser = studentProfile || user;

  useOutsideClose(profileRef, () => setProfileOpen(false));
  useOutsideClose(mobileRef, () => setMobileOpen(false));

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setNavOpen('');
  }, [location.pathname]);

  useEffect(() => () => {
    if (navCloseTimerRef.current) {
      clearTimeout(navCloseTimerRef.current);
    }
  }, []);

  const activeItem = useMemo(() => {
    const match = NAV_ITEMS.find((item) => location.pathname.startsWith(item.href.replace('/practice', '')) || location.pathname.startsWith(item.href));
    return match?.label;
  }, [location.pathname]);

  const isActive = (href) => {
    if (href === '/student/media') return location.pathname.startsWith('/student/media');
    if (href === '/student/competitions') return location.pathname.startsWith('/student/competitions');
    if (href === '/student/coding/practice') return location.pathname.startsWith('/student/coding');
    if (href === '/student/aptitude/practice') return location.pathname.startsWith('/student/aptitude');
    if (href === '/student/technical/practice') return location.pathname.startsWith('/student/technical');
    return location.pathname === href;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openNavMenu = (label) => {
    if (navCloseTimerRef.current) {
      clearTimeout(navCloseTimerRef.current);
      navCloseTimerRef.current = null;
    }
    setNavOpen(label);
  };

  const closeNavMenu = () => {
    if (navCloseTimerRef.current) {
      clearTimeout(navCloseTimerRef.current);
    }
    navCloseTimerRef.current = setTimeout(() => setNavOpen(''), 160);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-theme bg-surface/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:pr-8">
        <Link to="/student" className="flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F7CF3] to-[#7C8CFF] text-white shadow-[0_12px_30px_rgba(79,124,243,0.28)]">
            <img src="/logo.png" alt="Swarnandrian" className="h-7 w-7 rounded-xl object-cover" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className="font-bold text-primary leading-tight">Swarnandrian</p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-secondary leading-tight">Student Portal</p>
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-1 gap-y-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;

            return (
              <div
                key={item.label}
                className="relative shrink-0"
                onMouseEnter={() => hasChildren && openNavMenu(item.label)}
                onMouseLeave={() => hasChildren && closeNavMenu()}
              >
                <Link
                  to={item.href}
                  onClick={() => setNavOpen('')}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-2xl px-3 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-secondary hover:bg-surface-lighter hover:text-primary'
                  }`}
                >
                  <Icon sx={{ fontSize: 18 }} />
                  {item.label}
                  {hasChildren ? <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} /> : null}
                </Link>

                {hasChildren && navOpen === item.label ? (
                  <div
                    className="absolute left-0 mt-2 w-52 rounded-2xl border border-theme bg-surface-card p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
                    onMouseEnter={() => openNavMenu(item.label)}
                    onMouseLeave={() => closeNavMenu()}
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface-lighter hover:text-primary"
                        >
                          <ChildIcon sx={{ fontSize: 16 }} />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-theme bg-surface-card text-secondary transition-colors hover:bg-surface-lighter hover:text-primary"
          >
            {isDark ? <LightModeOutlinedIcon sx={{ fontSize: 18 }} /> : <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />}
          </button>

          <NotificationPanel role="student" />

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="inline-flex h-10 items-center gap-3 rounded-2xl border border-theme bg-surface-card px-2.5 pr-3 transition-colors hover:bg-surface-lighter"
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#4F7CF3] to-[#7C8CFF] text-xs font-bold text-white">
                <Avatar user={displayUser} />
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="max-w-[140px] truncate text-xs font-semibold text-primary">{user?.student_id || 'Student'}</p>
                <p className="text-[11px] text-secondary">{activeItem || 'Dashboard'}</p>
              </div>
              <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} className="text-secondary" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-72 overflow-hidden rounded-3xl border border-theme bg-surface-card shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
                >
                  <div className="border-b border-theme bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFF] to-[#F4F7FF] p-4 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#4F7CF3] to-[#7C8CFF] text-sm font-bold text-white">
                        <Avatar user={displayUser} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-primary">{user?.name || 'Student'}</p>
                        <p className="truncate text-xs text-secondary">Reg No: {user?.student_id || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    {PROFILE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={item.href}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-secondary transition-colors hover:bg-surface-lighter hover:text-primary"
                        >
                          <Icon sx={{ fontSize: 18 }} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="border-t border-theme p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <LogoutRoundedIcon sx={{ fontSize: 18 }} />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-theme bg-surface-card text-secondary transition-colors hover:bg-surface-lighter hover:text-primary lg:hidden"
          >
            {mobileOpen ? <CloseRoundedIcon sx={{ fontSize: 18 }} /> : <MenuRoundedIcon sx={{ fontSize: 18 }} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={mobileRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-theme bg-surface/96 lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

                  return (
                    <div key={item.label} className="space-y-2">
                      <Link
                        to={item.href}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
                          active
                            ? 'border-primary/20 bg-primary/10 text-primary'
                            : 'border-theme bg-surface-card text-secondary hover:bg-surface-lighter hover:text-primary'
                        }`}
                      >
                        <Icon sx={{ fontSize: 18 }} />
                        {item.label}
                      </Link>
                      {hasChildren ? (
                        <div className="ml-2 space-y-1">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.href}
                                to={child.href}
                                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-secondary hover:bg-surface-lighter hover:text-primary"
                              >
                                <ChildIcon sx={{ fontSize: 14 }} />
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-3xl border border-theme bg-surface-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Account</p>
                <div className="mt-3 space-y-1">
                  {PROFILE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-secondary transition-colors hover:bg-surface-lighter hover:text-primary"
                      >
                        <Icon sx={{ fontSize: 18 }} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}