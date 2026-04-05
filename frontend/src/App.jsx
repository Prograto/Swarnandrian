import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import Lenis from 'lenis';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import StudentPortalLayout from './components/student/StudentPortalLayout';
import { useCodeRunnerWarmup } from './hooks/useCodeRunnerWarmup';
import ChatbotWidget from './components/common/ChatbotWidget';
import { useAuthStore } from './store/authStore';

// Eager-loaded pages
import LandingPage  from './pages/LandingPage';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PublicPortfolio from './pages/student/PublicPortfolio';

// Lazy-loaded admin
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers'));
const AdminBulkUpload = lazy(() => import('./pages/admin/AdminBulkUpload'));
const AdminAnalytics  = lazy(() => import('./pages/admin/AdminAnalytics'));

// Lazy-loaded faculty
const FacultyDashboard    = lazy(() => import('./pages/faculty/FacultyDashboard'));
const FacultyCoding       = lazy(() => import('./pages/faculty/FacultyCoding'));
const FacultyAptitude     = lazy(() => import('./pages/faculty/FacultyAptitude'));
const FacultyTechnical    = lazy(() => import('./pages/faculty/FacultyTechnical'));
const FacultyCompetitions = lazy(() => import('./pages/faculty/FacultyCompetitions'));
const FacultyCompetitionTestsPage = lazy(() => import('./pages/faculty/FacultyCompetitionTestsPage'));
const FacultyCompetitionTestEditor = lazy(() => import('./pages/faculty/FacultyCompetitionTestEditor'));
const FacultyCompetitionTestResultsPage = lazy(() => import('./pages/faculty/FacultyCompetitionTestResultsPage'));
const FacultyTestResultsPage = lazy(() => import('./pages/faculty/FacultyTestResultsPage'));
const FacultySectionTestEditorPage = lazy(() => import('./pages/faculty/FacultySectionTestEditorPage'));
const FacultyEvaluation   = lazy(() => import('./pages/faculty/FacultyEvaluation'));
const FacultyMediaPage = lazy(() => import('./pages/faculty/FacultyMediaPage'));
const FacultyCourses = lazy(() => import('./pages/faculty/FacultyCourses'));
const FacultyBlogEditor = lazy(() => import('./pages/faculty/FacultyBlogEditor'));

// Lazy-loaded student
const StudentDashboard   = lazy(() => import('./pages/student/StudentDashboard'));
const StudentCoding      = lazy(() => import('./pages/student/StudentCoding'));
const StudentAptitude    = lazy(() => import('./pages/student/StudentAptitude'));
const StudentTechnical   = lazy(() => import('./pages/student/StudentTechnical'));
const StudentCompetitions= lazy(() => import('./pages/student/StudentCompetitions'));
const StudentLeaderboard = lazy(() => import('./pages/student/StudentLeaderboard'));
const StudentProfile     = lazy(() => import('./pages/student/StudentProfile'));
const StudentResults     = lazy(() => import('./pages/student/StudentResults'));
const StudentAnalytics   = lazy(() => import('./pages/student/StudentAnalytics'));
const StudentMediaPage   = lazy(() => import('./pages/student/StudentMediaPage'));
const StudentBookmarks   = lazy(() => import('./pages/student/StudentBookmarks'));
const StudentAchievements = lazy(() => import('./pages/student/StudentAchievements'));
const StudentSectionTests = lazy(() => import('./pages/student/StudentSectionTests'));
const StudentCompetitionTests = lazy(() => import('./pages/student/StudentCompetitionTests'));
const CompetitionTestInterface = lazy(() => import('./pages/student/CompetitionTestInterface'));
const StudentCourses     = lazy(() => import('./pages/student/StudentCourses'));

// Lazy-loaded new features
const MediaSection        = lazy(() => import('./pages/media/MediaSection'));
const ManageNotifications = lazy(() => import('./pages/notifications/ManageNotifications'));

// Coding & test
const ProblemView   = lazy(() => import('./pages/coding/ProblemView'));
const CodeEditor    = lazy(() => import('./pages/coding/CodeEditor'));
const TestInterface = lazy(() => import('./pages/test/TestInterface'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function hasScrollableOverflow(element) {
  if (typeof window === 'undefined' || typeof HTMLElement === 'undefined' || !(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const canScrollY = /(?:auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
  const canScrollX = /(?:auto|scroll|overlay)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;

  return canScrollY || canScrollX;
}

function shouldPreventLenisScroll(node) {
  if (typeof window === 'undefined' || typeof Element === 'undefined' || !(node instanceof Element)) {
    return false;
  }

  if (node.closest('[data-lenis-prevent], [data-lenis-prevent-wheel], [data-lenis-prevent-touch]')) {
    return true;
  }

  let current = node;
  while (current && current !== document.body) {
    if (hasScrollableOverflow(current)) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

function SmoothScrollProvider({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.1,
      allowNestedScroll: true,
      prevent: shouldPreventLenisScroll,
    });
    let rafId;
    const raf = (time) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(rafId); lenis.destroy(); };
  }, []);
  return children;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F8FC] dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 dark:text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

function WrapLazy({ children }) {
  return (<ErrorBoundary><Suspense fallback={<PageLoader />}>{children}</Suspense></ErrorBoundary>);
}

function StudentShell({ children }) {
  return <StudentPortalLayout>{children}</StudentPortalLayout>;
}

// Show chatbot for logged-in students and faculty
function ChatbotGate() {
  const { user } = useAuthStore();
  if (!user || user.role === 'admin') return null;
  return <ChatbotWidget />;
}

export default function App() {
  useCodeRunnerWarmup();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NotificationsProvider>
          <SmoothScrollProvider>
            <Router>
              <Toaster position="top-right" toastOptions={{ style: { background: 'rgb(var(--bg-secondary))', color: 'rgb(var(--text-primary))', border: '1px solid rgb(var(--border-color))', borderRadius: '14px', fontSize: '14px', boxShadow: '0 18px 40px rgba(2,8,23,0.14)' } }} />
              <ChatbotGate />
              <Routes>
              {/* Public */}
              <Route path="/"                       element={<LandingPage />} />
              <Route path="/login"                  element={<LoginPage />} />
              <Route path="/register"               element={<RegisterPage />} />
              <Route path="/portfolio/:studentId"   element={<PublicPortfolio />} />

              {/* Admin */}
              <Route path="/admin"            element={<ProtectedRoute role="admin"><WrapLazy><AdminDashboard /></WrapLazy></ProtectedRoute>} />
              <Route path="/admin/users"      element={<ProtectedRoute role="admin"><WrapLazy><AdminUsers /></WrapLazy></ProtectedRoute>} />
              <Route path="/admin/bulk-upload"element={<ProtectedRoute role="admin"><WrapLazy><AdminBulkUpload /></WrapLazy></ProtectedRoute>} />
              <Route path="/admin/analytics"  element={<ProtectedRoute role="admin"><WrapLazy><AdminAnalytics /></WrapLazy></ProtectedRoute>} />
              <Route path="/admin/competitions"  element={<ProtectedRoute role="admin"><WrapLazy><FacultyCompetitions /></WrapLazy></ProtectedRoute>} />
              <Route path="/admin/media"      element={<ProtectedRoute role="admin"><WrapLazy><MediaSection /></WrapLazy></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><WrapLazy><ManageNotifications /></WrapLazy></ProtectedRoute>} />

              {/* Faculty */}
              <Route path="/faculty"               element={<ProtectedRoute role="faculty"><WrapLazy><FacultyDashboard /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/coding"        element={<Navigate to="/faculty/coding/practice" replace />} />
              <Route path="/faculty/coding/:mode"  element={<ProtectedRoute role="faculty"><WrapLazy><FacultyCoding /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/aptitude"      element={<Navigate to="/faculty/aptitude/practice" replace />} />
              <Route path="/faculty/aptitude/:mode" element={<ProtectedRoute role="faculty"><WrapLazy><FacultyAptitude /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/technical"     element={<Navigate to="/faculty/technical/practice" replace />} />
              <Route path="/faculty/technical/:mode" element={<ProtectedRoute role="faculty"><WrapLazy><FacultyTechnical /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/competitions"  element={<ProtectedRoute role="faculty"><WrapLazy><FacultyCompetitions /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/competitions/:competitionId" element={<ProtectedRoute role="faculty"><WrapLazy><FacultyCompetitionTestsPage /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/competitions/:competitionId/tests/:testId/edit" element={<ProtectedRoute role="faculty"><WrapLazy><FacultyCompetitionTestEditor /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/competitions/:competitionId/tests/:testId/results" element={<ProtectedRoute role="faculty"><WrapLazy><FacultyCompetitionTestResultsPage /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/:sectionType/tests/:testId/edit" element={<ProtectedRoute role="faculty"><WrapLazy><FacultySectionTestEditorPage /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/tests/:testId/results" element={<ProtectedRoute role="faculty"><WrapLazy><FacultyTestResultsPage /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/evaluation"    element={<ProtectedRoute role="faculty"><WrapLazy><FacultyEvaluation /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/media"         element={<ProtectedRoute role="faculty"><WrapLazy><FacultyMediaPage /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/notifications" element={<ProtectedRoute role="faculty"><WrapLazy><ManageNotifications /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/courses"       element={<ProtectedRoute role="faculty"><WrapLazy><FacultyCourses /></WrapLazy></ProtectedRoute>} />
              <Route path="/faculty/blogs"         element={<ProtectedRoute role="faculty"><WrapLazy><FacultyBlogEditor /></WrapLazy></ProtectedRoute>} />

              {/* Student */}
              <Route path="/student"                element={<ProtectedRoute role="student"><WrapLazy><StudentDashboard /></WrapLazy></ProtectedRoute>} />
              <Route path="/student/coding"         element={<Navigate to="/student/coding/practice" replace />} />
              <Route path="/student/coding/:mode"   element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentCoding /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/coding/:mode/section/:sectionId" element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentSectionTests /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/aptitude"       element={<Navigate to="/student/aptitude/practice" replace />} />
              <Route path="/student/aptitude/:mode" element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentAptitude /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/aptitude/:mode/section/:sectionId" element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentSectionTests /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/technical"      element={<Navigate to="/student/technical/practice" replace />} />
              <Route path="/student/technical/:mode" element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentTechnical /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/technical/:mode/section/:sectionId" element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentSectionTests /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/competitions"   element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentCompetitions /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/competitions/:competitionId" element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentCompetitionTests /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/competitions/:competitionId/tests/:testId" element={<ProtectedRoute role="student"><StudentShell><WrapLazy><CompetitionTestInterface /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/leaderboard"    element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentLeaderboard /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/profile"        element={<ProtectedRoute role="student"><WrapLazy><StudentProfile /></WrapLazy></ProtectedRoute>} />
              <Route path="/student/results"        element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentResults /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/analytics"      element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentAnalytics /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/media"          element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentMediaPage /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/bookmarks"      element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentBookmarks /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/achievements"   element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentAchievements /></WrapLazy></StudentShell></ProtectedRoute>} />
              <Route path="/student/courses"        element={<ProtectedRoute role="student"><StudentShell><WrapLazy><StudentCourses /></WrapLazy></StudentShell></ProtectedRoute>} />

              {/* Coding & Tests */}
              <Route path="/problem/:id"            element={<ProtectedRoute role="student"><WrapLazy><ProblemView /></WrapLazy></ProtectedRoute>} />
              <Route path="/code/:id"               element={<ProtectedRoute role="student"><WrapLazy><CodeEditor /></WrapLazy></ProtectedRoute>} />
              <Route path="/test/:id"               element={<ProtectedRoute role="student"><WrapLazy><TestInterface /></WrapLazy></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </SmoothScrollProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
