import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import NotificationPanel from './NotificationPanel';
import { useThemeMode } from '../../context/ThemeContext';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';

const ROLE_CONF = {
  admin:   { gradient:'from-[#4F7CF3] to-[#7C8CFF]', light:'bg-blue-50 text-blue-600',   label:'Admin' },
  faculty: { gradient:'from-[#F6B8C6] to-[#FFAABC]', light:'bg-pink-50 text-pink-600',   label:'Faculty' },
  student: { gradient:'from-[#CDEDE1] to-[#A8DCC8]', light:'bg-emerald-50 text-emerald-600', label:'Student' },
};

export default function DashboardLayout({ navItems, children, role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDrop, setOpenDrop] = useState(null);
  const [query, setQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePreview, setProfilePreview] = useState('');
  const [profileFile, setProfileFile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', designation: '', department: '', contact_number: '', email: '', password: '' });
  const { isDark, toggleTheme } = useThemeMode();

  const rc = ROLE_CONF[role] || ROLE_CONF.student;
  const dashboardRoot = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (role !== 'faculty') return;
    setProfileForm({
      name: user?.name || '',
      designation: user?.designation || '',
      department: user?.department || '',
      contact_number: user?.contact_number || '',
      email: user?.email || '',
      password: '',
    });
    setProfilePreview(user?.profile_photo_url || '');
  }, [role, user]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const formData = new FormData();
      Object.entries(profileForm).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      if (profileFile) formData.append('profile_photo', profileFile);
      const { data } = await api.patch('/faculty/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfilePreview(data.profile_photo_url || '');
      useAuthStore.getState().setUser(data);
      toast.success('Profile updated');
      setProfileOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Profile update failed'));
    } finally {
      setProfileSaving(false);
    }
  };

  const roleShortcuts = useMemo(() => {
    if (role === 'admin') return ['Manage users', 'Upload batch', 'Platform analytics'];
    if (role === 'faculty') return ['Create coding task', 'Publish test', 'Review submissions'];
    return ['Resume coding practice', 'Start aptitude test', 'View leaderboard'];
  }, [role]);

  const filteredShortcuts = useMemo(() => {
    if (!query.trim()) return roleShortcuts;
    return roleShortcuts.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  }, [query, roleShortcuts]);

  const Logo = () => (
    <div className="flex items-center gap-3 px-4 py-5 border-b border-theme">
      <div className="w-10 h-10 rounded-2xl bg-transparent flex items-center justify-center overflow-hidden shrink-0">
        <img src="/logo.png" alt="Swarnandrian" className="h-full w-full object-cover" />
      </div>
      {(expanded || mobileOpen) && (
        <div className="min-w-0">
          <p className="font-bold text-primary text-sm leading-tight">Swarnandrian</p>
          <p className="text-xs text-secondary capitalize">{rc.label} Portal</p>
        </div>
      )}
    </div>
  );

  const NavItem = ({ item }) => {
    const isActive = item.href !== '#' && location.pathname.startsWith(item.href);
    const hasKids  = item.children?.length > 0;
    const isOpen   = openDrop === item.label;

    return (
      <div>
        <button
          onClick={() => {
            if (hasKids) setOpenDrop(isOpen ? null : item.label);
            else navigate(item.href);
          }}
          className={`nav-link w-full text-left group focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${isActive ? 'active' : ''}`}
        >
          <span className="text-lg shrink-0 transition-transform group-hover:scale-110">{item.icon}</span>
          {(expanded || mobileOpen) && (
            <>
              <span className="flex-1">{item.label}</span>
              {hasKids && (
                <ExpandMoreRoundedIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
              )}
            </>
          )}
        </button>
        {hasKids && (expanded || mobileOpen) && (
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height:0, opacity:0 }}
                animate={{ height:'auto', opacity:1 }}
                exit={{ height:0, opacity:0 }}
                transition={{ duration:0.2 }}
                className="overflow-hidden ml-4 pl-3 border-l-2 border-blue-100 mt-1 space-y-0.5"
              >
                {item.children.map(c => (
                  <Link key={c.label} to={c.href}
                    className={`nav-link text-xs py-2 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${location.pathname===c.href?'active':''}`}>
                    <span className="text-sm">{c.icon}</span> {c.label}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  const SidebarInner = () => (
    <div className="flex flex-col h-full min-h-0 bg-surface-light">
      <Logo />
      <nav className="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => <NavItem key={item.label} item={item} />)}
      </nav>
      <div className="p-3 border-t border-theme">
        {(expanded || mobileOpen) && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-lighter mb-2">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${rc.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary truncate">{user?.name}</p>
              <p className="text-xs text-secondary truncate">{user?.[`${role}_id`]||user?.student_id||user?.faculty_id||user?.admin_id}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50/80 transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
          <LogoutRoundedIcon className="w-4 h-4 shrink-0"/>
          {(expanded || mobileOpen) && 'Logout'}
        </button>
      </div>
    </div>
  );

  const ProfileDropdown = () => {
    if (role !== 'faculty') return null;
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-xl bg-surface-card px-2.5 py-1.5 hover:bg-surface-lighter transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
        >
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${rc.gradient} flex items-center justify-center overflow-hidden text-white text-xs font-bold`}>
            {profilePreview ? <img src={profilePreview} alt={user?.name || 'Profile'} className="h-full w-full object-cover" /> : (user?.name?.[0]?.toUpperCase() || 'U')}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-primary leading-tight">{user?.name}</p>
            <p className="text-[11px] text-secondary">Profile</p>
          </div>
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-2xl border border-theme bg-surface-card p-4 shadow-soft z-50 max-h-[85vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-primary">Faculty profile</p>
                  <p className="text-xs text-secondary">Edit your account details</p>
                </div>
                <button type="button" onClick={() => setProfileOpen(false)} className="p-2 rounded-xl hover:bg-surface-lighter text-secondary">
                  <CloseRoundedIcon sx={{ fontSize: 16 }} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-theme bg-surface p-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-theme bg-surface-lighter">
                    {profilePreview ? <img src={profilePreview} alt="Profile preview" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-secondary"><PersonRoundedIcon /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-primary">Profile image</p>
                    <p className="text-[11px] text-secondary">PNG, JPG or WEBP</p>
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-theme px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-lighter">
                      <UploadRoundedIcon sx={{ fontSize: 14 }} /> Change image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setProfileFile(file);
                        setProfilePreview(URL.createObjectURL(file));
                      }} />
                    </label>
                  </div>
                </div>

                {[
                  ['name', 'Name'],
                  ['designation', 'Designation'],
                  ['department', 'Department'],
                  ['contact_number', 'Contact Number'],
                  ['email', 'Email'],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-semibold text-secondary">{label}</span>
                    <input
                      className="input"
                      value={profileForm[key]}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </label>
                ))}

                <label className="block">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary"><LockRoundedIcon sx={{ fontSize: 14 }} /> New password</div>
                  <input
                    className="input"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={profileForm.password}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setProfileOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="button" onClick={handleProfileSave} disabled={profileSaving} className="btn btn-primary btn-sm">
                  <SaveRoundedIcon sx={{ fontSize: 14 }} />
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-surface text-primary">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: expanded ? 240 : 68 }}
        transition={{ duration:0.25, ease:'easeInOut' }}
        className="hidden md:flex flex-col shrink-0 overflow-hidden sticky top-0 h-screen"
        style={{ boxShadow:'2px 0 20px rgba(2,8,23,0.06)', background:'rgb(var(--bg-secondary))', borderRight:'1px solid rgb(var(--border-color))' }}
      >
        <SidebarInner />
        <button onClick={() => setExpanded(!expanded)}
          className="absolute bottom-20 -right-3 w-6 h-6 bg-surface-card rounded-full shadow-soft flex items-center justify-center text-secondary hover:text-primary hover:border-primary/30 transition-all z-10 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
          style={{ position:'sticky' }}>
          <span className="text-xs">{expanded ? '‹' : '›'}</span>
        </button>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 bg-black/25 z-40 md:hidden" onClick={()=>setMobileOpen(false)}/>
            <motion.aside initial={{x:-240}} animate={{x:0}} exit={{x:-240}} transition={{duration:0.25}}
              className="fixed left-0 top-0 bottom-0 w-60 z-50 md:hidden shadow-2xl">
              <SidebarInner />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Topbar */}
        <header className="bg-surface-light border-b border-theme px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 lg:pr-8"
          style={{ boxShadow:'0 1px 12px rgba(2,8,23,0.04)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={()=>setMobileOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-surface-lighter text-secondary transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
              <MenuRoundedIcon className="w-5 h-5"/>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-secondary">
              <Link to={dashboardRoot} className="hover:text-primary transition-colors">Home</Link>
              <span>/</span>
              <Link to={dashboardRoot} className="text-primary font-semibold capitalize hover:underline">
                {role}
              </Link>
            </div>
            <div className="relative ml-2 hidden lg:block w-72">
              <SearchRoundedIcon className="absolute left-3 top-2.5 text-secondary" sx={{ fontSize: 18 }} />
              <input
                aria-label="Search actions"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search actions"
                className="w-full rounded-xl border border-theme bg-surface text-sm pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {query && (
                <div className="absolute mt-1 w-full rounded-xl border border-theme bg-surface-card shadow-soft p-1 z-30">
                  {filteredShortcuts.map((shortcut) => (
                    <button
                      key={shortcut}
                      type="button"
                      className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-primary hover:bg-primary/5"
                    >
                      {shortcut}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl hover:bg-surface-lighter text-secondary transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
            >
              {isDark ? <LightModeOutlinedIcon sx={{ fontSize: 18 }} /> : <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />}
            </button>
            {role === 'faculty' && (
              <Link
                to="/faculty/notifications"
                title="Send notification"
                aria-label="Send notification"
                className="p-2 rounded-xl hover:bg-pink-50 text-pink-600 transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
              >
                <CampaignOutlinedIcon sx={{ fontSize: 18 }} />
              </Link>
            )}
            <NotificationPanel role={role} />
            <ProfileDropdown />
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-primary/10 bg-primary/5 text-xs text-primary">
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} />
              <span>Smart suggestions enabled</span>
            </div>
            <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-surface-lighter text-xs font-medium text-secondary focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
              <BoltOutlinedIcon sx={{ fontSize: 14 }} />
              Quick action
            </button>
            {role !== 'faculty' && (
              <div className="flex items-center gap-2.5 pl-2 border-l border-theme">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-primary leading-tight">{user?.name}</p>
                  <p className="text-xs text-secondary capitalize">{role}</p>
                </div>
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${rc.gradient} flex items-center justify-center text-white text-sm font-bold`}>
                  {user?.name?.[0]?.toUpperCase()||'U'}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:pr-8">{children}</main>
      </div>
    </div>
  );
}
