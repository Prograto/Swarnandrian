import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      role: null,

      login: async (userId, password, role) => {
        const { data } = await api.post('/auth/login', {
          user_id: userId,
          password,
          role,
        });
        set({ token: data.access_token, user: data.user, role: data.role });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
        return data;
      },

      logout: () => {
        set({ token: null, user: null, role: null });
        delete api.defaults.headers.common['Authorization'];
      },

      setUser: (user) => set({ user }),

      isAuthenticated: () => !!get().token,

      initAuth: () => {
        const token = get().token;
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },
    }),
    {
      name: 'swarnandrian-auth',
      partialize: (state) => ({ token: state.token, user: state.user, role: state.role }),
    }
  )
);
