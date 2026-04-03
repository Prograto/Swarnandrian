import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function ProtectedRoute({ children, role }) {
  const { token, role: userRole, initAuth } = useAuthStore();

  useEffect(() => { initAuth(); }, []);

  if (!token) return <Navigate to="/login" replace />;
  if (role && userRole !== role && !(role === 'faculty' && userRole === 'admin')) {
    const dashMap = { admin: '/admin', faculty: '/faculty', student: '/student' };
    return <Navigate to={dashMap[userRole] || '/'} replace />;
  }
  return children;
}
