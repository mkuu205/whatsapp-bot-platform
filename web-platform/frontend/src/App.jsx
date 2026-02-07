// web-platform/frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import HomePage from './pages/HomePage';
import BotsCreatePage from './pages/BotsCreatePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import PaymentPage from './pages/PaymentPage';
import PairingPage from './pages/PairingPage';
import BotsPage from './pages/BotsPage';
import SettingsPage from './pages/SettingsPage';
import BotDetailsPage from './pages/BotDetailsPage';
import UploadCredsPage from './pages/UploadCredsPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// API setup
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

axios.defaults.baseURL = API_URL;
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loader}></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

// Main App Content Component (inside Router)
function AppContent() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loader}></div>
        <p>Initializing Bot Platform...</p>
      </div>
    );
  }

  return (
    <div className="app" style={darkMode ? styles.darkTheme : styles.lightTheme}>
      <Navbar user={user} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <main style={styles.mainContent}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/bots" element={
            <ProtectedRoute>
              <BotsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/bots/create" element={
            <ProtectedRoute>
              <BotsCreatePage />
            </ProtectedRoute>
          } />
          
          <Route path="/bots/:id" element={
            <ProtectedRoute>
              <BotDetailsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/pairing" element={
            <ProtectedRoute>
              <PairingPage />
            </ProtectedRoute>
          } />
          
          <Route path="/bots/:id/upload-creds" element={
            <ProtectedRoute>
              <UploadCredsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/payment" element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage logout={handleLogout} />
            </ProtectedRoute>
          } />
          
          {/* Admin Only Routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          } />
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

// Main App Wrapper
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

// 404 Page
function NotFoundPage() {
  return (
    <div style={notFoundStyles.container}>
      <div style={notFoundStyles.content}>
        <h1>404</h1>
        <p>Page Not Found</p>
        <a href="/" style={notFoundStyles.button}>Go Home</a>
      </div>
    </div>
  );
}

// Styles
const styles = {
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  loader: {
    width: '50px',
    height: '50px',
    border: '5px solid rgba(255,255,255,0.3)',
    borderTop: '5px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  darkTheme: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    minHeight: '100vh',
  },
  lightTheme: {
    backgroundColor: '#ffffff',
    color: '#1f2937',
    minHeight: '100vh',
  },
  mainContent: {
    minHeight: 'calc(100vh - 140px)',
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
};

const notFoundStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    textAlign: 'center',
  },
  content: {
    maxWidth: '500px',
  },
  button: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '50px',
    fontWeight: '600',
  },
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
}

export default App;
