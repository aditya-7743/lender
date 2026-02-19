import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LangProvider, useLang } from './context/LangContext';
import { PinProvider, usePin, PinLockScreen } from './context/PinContext';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerDetail from './pages/CustomerDetail';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import MyPlan from './pages/MyPlan';
import CustomerProfile from './pages/CustomerProfile';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function BottomNav() {
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      path: '/', label: 'Ledger', icon: (active) => (
        <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="22" height="22">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      path: '/plan', label: 'My Plan', icon: (active) => (
        <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="22" height="22">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    },
    {
      path: '/settings', label: 'More', icon: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )
    },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const active = location.pathname === tab.path;
        return (
          <button key={tab.path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(tab.path)}>
            {tab.icon(active)}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const { pinEnabled, unlocked } = usePin();
  const { checkPin } = usePin();
  const location = useLocation();

  // Show PIN lock if needed
  if (user && pinEnabled && !unlocked) {
    return <PinLockScreen onUnlock={() => { }} />;
  }

  const showNav = user && !['/login'].includes(location.pathname) && !location.pathname.startsWith('/customer/');

  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/customer/:id" element={<PrivateRoute><CustomerDetail /></PrivateRoute>} />
        <Route path="/customer/:id/profile" element={<PrivateRoute><CustomerProfile /></PrivateRoute>} />
        <Route path="/plan" element={<PrivateRoute><MyPlan /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/">
      <LangProvider>
        <PinProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </PinProvider>
      </LangProvider>
    </BrowserRouter>
  );
}
