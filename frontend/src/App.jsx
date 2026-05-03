import { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage.jsx';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage/RegisterPage.jsx';
import PrivacyPage from './pages/PrivacyPage/PrivacyPage.jsx';
import TermsPage from './pages/TermsPage/TermsPage.jsx';
import DashboardPage from './pages/DashboardPage/DashboardPage.jsx';
import OnboardingPage from './pages/OnboardingPage/OnboardingPage.jsx';
import SettingsPage from './pages/SettingsPage/SettingsPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage.jsx';
import WorkspacePage from './pages/WorkspacePage/WorkspacePage.jsx';
import WorkspaceDetailPage from './pages/WorkspaceDetailPage/WorkspaceDetailPage.jsx';
import ManagerDashboardPage from './pages/ManagerDashboardPage/ManagerDashboardPage.jsx';
import JoinWorkspacePage from './pages/JoinWorkspacePage/JoinWorkspacePage.jsx';
import { applyTheme } from './utils/themeUtils.js';
import { settingsApi } from './api/settingsApi.js';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import './App.css';

function AppLoadingScreen() {
  return (
    <div className="app-loading-screen">
      <div className="app-loading-screen__spinner" />
      <div className="app-loading-screen__text">Loading CodeLens AI…</div>
    </div>
  );
}

function RootRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (user) {
    return <Navigate to={user.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
  }

  return <LandingPage />;
}

function AppShell() {
  const { user, isLoading } = useAuth();

  useLayoutEffect(() => {
    // Apply the current theme immediately, then hydrate user-specific settings once auth resolves.
    if (isLoading) {
      return;
    }

    (async () => {
      if (!user) {
        const theme = localStorage.getItem('codelens-theme') || 'dark';
        applyTheme(theme);
        return;
      }

      try {
        const settingsResponse = await settingsApi.getSettings();
        const data = settingsResponse?.settings;
        const theme = data?.theme || localStorage.getItem('codelens-theme') || 'dark';
        applyTheme(theme);
        if (data?.defaultPersona) localStorage.setItem('codelens-default-persona', data.defaultPersona);
        if (data?.preferredLanguage) localStorage.setItem('codelens-preferred-language', data.preferredLanguage);
        if (data?.emailNotifications) localStorage.setItem('codelens-email-notifications', JSON.stringify(data.emailNotifications));
        return;
      } catch (err) {
        // authenticated but settings fetch failed; fall back to local storage theme
      }

      const theme = localStorage.getItem('codelens-theme') || 'dark';
      applyTheme(theme);
    })();
  }, [isLoading, user]);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/workspace/:id" element={<WorkspaceDetailPage />} />
        <Route path="/workspace/:id/dashboard" element={<ManagerDashboardPage />} />
        <Route path="/join" element={<JoinWorkspacePage />} />
        <Route path="/join/:token" element={<JoinWorkspacePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

