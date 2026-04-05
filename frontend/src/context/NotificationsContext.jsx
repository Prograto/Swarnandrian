import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useRef, useState,
} from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

const NotificationsContext = createContext(null);
const POLL_MS = 30000;

export function NotificationsProvider({ children }) {
  const [items, setItems]   = useState([]);
  const [unread, setUnread] = useState(0);
  const timerRef            = useRef(null);
  const token               = useAuthStore((state) => state.token);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/notifications/?page=1&limit=30');
      setItems(res.data.notifications || []);
      setUnread(res.data.unread ?? 0);
    } catch {
      // silently skip if not authenticated yet
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setUnread(0);
      clearInterval(timerRef.current);
      return undefined;
    }

    fetch();
    timerRef.current = setInterval(fetch, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetch, token]);

  const markRead = useCallback(async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  }, []);

  const value = useMemo(() => ({
    items, unreadCount: unread, markRead, markAllRead, refresh: fetch,
  }), [items, unread, markRead, markAllRead, fetch]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationsProvider');
  return ctx;
}
