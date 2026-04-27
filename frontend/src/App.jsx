import { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage/DashboardPage.jsx';
import SettingsPage from './pages/SettingsPage/SettingsPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage.jsx';
import WorkspacePage from './pages/WorkspacePage/WorkspacePage.jsx';
import WorkspaceDetailPage from './pages/WorkspaceDetailPage/WorkspaceDetailPage.jsx';
import ManagerDashboardPage from './pages/ManagerDashboardPage/ManagerDashboardPage.jsx';
import JoinWorkspacePage from './pages/JoinWorkspacePage/JoinWorkspacePage.jsx';
import { applyTheme } from './utils/themeUtils.js';
import './App.css';

export default function App() {
  useLayoutEffect(() => {
    // Apply theme immediately on app load
    const theme = localStorage.getItem('codelens-theme') || 'dark';
    applyTheme(theme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
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

