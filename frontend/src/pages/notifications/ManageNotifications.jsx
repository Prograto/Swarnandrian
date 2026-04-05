import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';

const TARGET_OPTIONS = [
  { value: 'student', label: 'Students', icon: SchoolOutlinedIcon },
  { value: 'faculty', label: 'Faculty', icon: PeopleAltOutlinedIcon },
  { value: 'all',     label: 'Everyone', icon: GroupsOutlinedIcon },
];

const DEPTS = ['CSE','ECE','EEE','MECH','CIVIL','IT','MBA'];

export default function ManageNotifications() {
  const [form, setForm] = useState({ title: '', message: '', target_role: 'student', target_department: '' });
  const [sending, setSending]     = useState(false);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/?page=1&limit=50');
      setHistory(res.data.notifications || []);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      await api.post('/notifications/', {
        title: form.title,
        message: form.message,
        target_role: form.target_role,
        target_department: form.target_department || null,
      });
      toast.success('Notification sent!');
      setForm({ title: '', message: '', target_role: 'student', target_department: '' });
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send');
    } finally { setSending(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setHistory(h => h.filter(n => n.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  const fmt = (ts) => {
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); }
    catch { return ts; }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
          <CampaignOutlinedIcon className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Push announcements to students or faculty</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compose form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6"
        >
          <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">
            Compose notification
          </h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Title</label>
              <input
                className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="e.g. Test schedule updated"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={120}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Message</label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                placeholder="Write your announcement here..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
              />
            </div>

            {/* Target role */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Send to</label>
              <div className="grid grid-cols-3 gap-2">
                {TARGET_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, target_role: value }))}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      form.target_role === value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional dept filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                Department <span className="text-gray-400">(optional)</span>
              </label>
              <select
                className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.target_department}
                onChange={e => setForm(f => ({ ...f, target_department: e.target.value }))}
              >
                <option value="">All departments</option>
                {DEPTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <SendRoundedIcon sx={{ fontSize: 16 }} />
              {sending ? 'Sending...' : 'Send notification'}
            </button>
          </form>
        </motion.div>

        {/* Sent history */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Sent notifications</h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-slate-500">
                <CampaignOutlinedIcon sx={{ fontSize: 36 }} className="mb-2 opacity-40" />
                <p className="text-sm">No notifications sent yet</p>
              </div>
            ) : history.map(n => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{n.title}</p>
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-medium capitalize">
                      {n.target_role}
                    </span>
                    {n.target_department && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 text-[10px]">
                        {n.target_department}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{n.message}</p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{fmt(n.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all"
                >
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
