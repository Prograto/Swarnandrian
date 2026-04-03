import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CircleNotificationsOutlinedIcon from '@mui/icons-material/CircleNotificationsOutlined';
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';

function useOutsideClick(ref, handler) {
  React.useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target)) handler(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, handler]);
}

export default function NotificationPanel({ role: roleProp }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', target_role: 'student' });
  const ref = useRef(null);
  const { items, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const storeRole = useAuthStore((state) => state.role);
  const location = useLocation();
  const effectiveRole = roleProp || storeRole;
  const pathRole = location.pathname.startsWith('/faculty')
    ? 'faculty'
    : location.pathname.startsWith('/admin')
      ? 'admin'
      : 'student';
  const canCompose = (effectiveRole || pathRole) === 'faculty' || (effectiveRole || pathRole) === 'admin';

  useOutsideClick(ref, () => setOpen(false));

  const fmt = (ts) => {
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); }
    catch { return ''; }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);
    try {
      await api.post('/notifications/', {
        title: form.title.trim(),
        message: form.message.trim(),
        target_role: form.target_role,
      });
      setForm({ title: '', message: '', target_role: 'student' });
      toast.success('Notification sent');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      toast.success('Notification deleted');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen(p => !p)}
        className="relative p-2 rounded-xl hover:bg-surface-lighter text-secondary transition-colors"
      >
        <CircleNotificationsOutlinedIcon fontSize="small" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] leading-[18px] font-semibold text-center border-2 border-white dark:border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[92vw] bg-surface-card border border-theme rounded-2xl shadow-soft overflow-hidden z-50"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-theme flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg p-1.5 text-secondary hover:bg-surface-lighter hover:text-primary transition-colors"
                  aria-label="Go back"
                >
                  <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
                </button>
                <p className="text-sm font-semibold text-primary">Notifications</p>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <DoneAllOutlinedIcon sx={{ fontSize: 14 }} />
                  Mark all read
                </button>
              )}
            </div>

            {canCompose && (
              <form onSubmit={handleSend} className="px-4 py-3 border-b border-theme space-y-2">
                <input
                  type="text"
                  placeholder="Notification title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-theme bg-surface px-2.5 py-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  maxLength={120}
                />
                <textarea
                  rows={2}
                  placeholder="Write message..."
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-lg border border-theme bg-surface px-2.5 py-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={form.target_role}
                    onChange={(e) => setForm((prev) => ({ ...prev, target_role: e.target.value }))}
                    className="rounded-lg border border-theme bg-surface px-2 py-1.5 text-xs text-primary focus:outline-none"
                  >
                    <option value="student">Students</option>
                    <option value="faculty">Faculty</option>
                    <option value="all">Everyone</option>
                  </select>
                  <button
                    type="submit"
                    disabled={sending}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-2.5 py-1.5 disabled:opacity-60"
                  >
                    <SendRoundedIcon sx={{ fontSize: 14 }} />
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y" style={{ borderColor: 'rgb(var(--border-color))' }}>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-secondary">
                  <CampaignOutlinedIcon sx={{ fontSize: 36 }} />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : items.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => { if (!n.is_read) markRead(n.id); }}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-lighter transition-colors ${
                    n.is_read ? '' : 'bg-primary/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CampaignOutlinedIcon sx={{ fontSize: 14 }} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-primary leading-tight">
                        {n.title}
                      </p>
                      <p className="text-sm text-secondary mt-0.5 line-clamp-2 leading-snug">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted inline-flex items-center gap-0.5">
                          <AccessTimeOutlinedIcon sx={{ fontSize: 11 }} />
                          {fmt(n.created_at)}
                        </span>
                        {n.created_by_name && (
                          <span className="text-[11px] text-muted">
                            · {n.created_by_name}
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    {canCompose && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this notification?')) {
                            handleDeleteNotification(n.id);
                          }
                        }}
                        className="mt-0.5 p-1 rounded-md hover:bg-red-50 text-secondary hover:text-red-500 shrink-0"
                        aria-label="Delete notification"
                      >
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-surface-lighter border-t border-theme text-[11px] text-muted">
              Auto-refreshes every 30 seconds
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
