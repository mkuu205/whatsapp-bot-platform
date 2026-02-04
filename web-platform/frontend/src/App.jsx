// web-platform/frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';

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

// API setup
const API_URL = process.env.REACT_APP_API_URL || 'https://whatsapp-bot-platform-q8tv.onrender.com/api';

axios.defaults.baseURL = API_URL;
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simple placeholder components (create these files or keep as placeholders)
const Navbar = ({ user, darkMode, toggleDarkMode }) => (
  <nav style={navbarStyles.nav}>
    <div style={navbarStyles.container}>
      <Link to="/" style={navbarStyles.logo}>
        <span style={navbarStyles.logoIcon}>🤖</span>
        WhatsApp Bot Platform
      </Link>
      <div style={navbarStyles.links}>
        {user ? (
          <>
            <Link to="/dashboard" style={navbarStyles.link}>Dashboard</Link>
            <Link to="/bots" style={navbarStyles.link}>My Bots</Link>
            <Link to="/settings" style={navbarStyles.link}>Settings</Link>
            {user.role === 'admin' && (
              <Link to="/admin" style={navbarStyles.adminLink}>Admin</Link>
            )}
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
              style={navbarStyles.logoutBtn}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={navbarStyles.link}>Login</Link>
            <Link to="/register" style={navbarStyles.registerBtn}>Get Started</Link>
          </>
        )}
        <button onClick={toggleDarkMode} style={navbarStyles.themeBtn}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  </nav>
);

const Sidebar = ({ user }) => (
  <div style={sidebarStyles.sidebar}>
    <div style={sidebarStyles.userInfo}>
      <div style={sidebarStyles.avatar}>
        {user?.email?.charAt(0).toUpperCase() || 'U'}
      </div>
      <div style={sidebarStyles.userDetails}>
        <div style={sidebarStyles.userName}>{user?.email || 'User'}</div>
        <div style={sidebarStyles.userRole}>{user?.role || 'Member'}</div>
      </div>
    </div>
    <nav style={sidebarStyles.nav}>
      <Link to="/dashboard" style={sidebarStyles.navLink}>📊 Dashboard</Link>
      <Link to="/bots" style={sidebarStyles.navLink}>🤖 My Bots</Link>
      <Link to="/pairing" style={sidebarStyles.navLink}>🔗 Pair Device</Link>
      <Link to="/payment" style={sidebarStyles.navLink}>💳 Upgrade</Link>
      <Link to="/settings" style={sidebarStyles.navLink}>⚙️ Settings</Link>
    </nav>
  </div>
);

const Footer = () => (
  <footer style={footerStyles.footer}>
    <div style={footerStyles.container}>
      <p>© 2024 WhatsApp Bot Platform. All rights reserved.</p>
      <div style={footerStyles.links}>
        <Link to="/terms" style={footerStyles.link}>Terms</Link>
        <Link to="/privacy" style={footerStyles.link}>Privacy</Link>
        <Link to="/contact" style={footerStyles.link}>Contact</Link>
      </div>
    </div>
  </footer>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);

    // Simple user check - for now, use mock user if token exists
    if (token) {
      try {
        // Try to decode token (even if it's mock)
        const mockUser = {
          id: '123',
          email: 'admin@example.com',
          role: 'admin',
          name: 'Admin User'
        };
        setUser(mockUser);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
    
    // Check if backend is alive
    axios.get('/health').catch(err => {
      console.log('Backend might be offline or warming up');
    });
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loader}>
          <div style={styles.loaderCircle}></div>
          <p style={styles.loaderText}>Initializing Bot Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={darkMode ? styles.darkTheme : styles.lightTheme}>
      <Router>
        <Navbar user={user} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <div style={styles.mainContainer}>
          {user && <Sidebar user={user} />}
          <div style={user ? styles.contentWithSidebar : styles.content}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/bots/create" element={user ? <BotsCreatePage user={user} /> : <Navigate to="/login" />} />
              <Route path="/login" element={!user ? <LoginPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
              <Route path="/register" element={!user ? <RegisterPage setUser={setUser} /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={user ? <DashboardPage user={user} /> : <Navigate to="/login" />} />
              <Route path="/admin" element={user?.role === 'admin' ? <AdminPage user={user} /> : <Navigate to="/dashboard" />} />
              <Route path="/payment" element={<PaymentPage user={user} />} />
              <Route path="/pairing" element={user ? <PairingPage user={user} /> : <Navigate to="/login" />} />
              <Route path="/bots" element={user ? <BotsPage user={user} /> : <Navigate to="/login" />} />
              <Route path="/settings" element={user ? <SettingsPage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </div>
        <Footer />
      </Router>
      
      {/* Add CSS animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .app {
          min-height: 100vh;
          transition: background-color 0.3s, color 0.3s;
        }
      `}</style>
    </div>
  );
}

// Styles
const styles = {
  loadingScreen: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  loader: {
    textAlign: 'center',
    color: 'white',
  },
  loaderCircle: {
    width: '50px',
    height: '50px',
    border: '5px solid rgba(255,255,255,0.3)',
    borderTop: '5px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  loaderText: {
    fontSize: '18px',
    fontWeight: '500',
  },
  darkTheme: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
  },
  lightTheme: {
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  mainContainer: {
    display: 'flex',
    minHeight: 'calc(100vh - 140px)',
  },
  content: {
    flex: 1,
    padding: '30px',
    animation: 'fadeIn 0.5s ease-out',
  },
  contentWithSidebar: {
    flex: 1,
    padding: '30px',
    marginLeft: '250px',
    animation: 'fadeIn 0.5s ease-out',
  },
};

// Navbar Styles
const navbarStyles = {
  nav: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '24px',
    fontWeight: '700',
    textDecoration: 'none',
    color: '#6366f1',
  },
  logoIcon: {
    fontSize: '28px',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  link: {
    color: '#6b7280',
    textDecoration: 'none',
    fontWeight: '500',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
  },
  adminLink: {
    color: '#f59e0b',
    textDecoration: 'none',
    fontWeight: '600',
    padding: '8px 12px',
    borderRadius: '6px',
  },
  registerBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: '600',
  },
  logoutBtn: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  themeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
  },
};

// Sidebar Styles
const sidebarStyles = {
  sidebar: {
    width: '250px',
    background: '#f8fafc',
    borderRight: '1px solid #e5e7eb',
    position: 'fixed',
    left: 0,
    top: '60px',
    bottom: 0,
    padding: '20px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  avatar: {
    width: '50px',
    height: '50px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '20px',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    fontSize: '16px',
  },
  userRole: {
    fontSize: '14px',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  navLink: {
    padding: '12px 15px',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
  },
};

// Footer Styles
const footerStyles = {
  footer: {
    background: '#f8fafc',
    borderTop: '1px solid #e5e7eb',
    padding: '20px 0',
    marginTop: 'auto',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  links: {
    display: 'flex',
    gap: '20px',
  },
  link: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

// 404 Page Component
function NotFoundPage() {
  return (
    <div style={notFoundStyles.container}>
      <div style={notFoundStyles.content}>
        <h1 style={notFoundStyles.title}>404</h1>
        <p style={notFoundStyles.subtitle}>Page Not Found</p>
        <p style={notFoundStyles.message}>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" style={notFoundStyles.button}>
          Go Home
        </Link>
      </div>
    </div>
  );
}

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
  title: {
    fontSize: '120px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '32px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#4f46e5',
  },
  message: {
    fontSize: '18px',
    color: '#6b7280',
    marginBottom: '40px',
    lineHeight: '1.6',
  },
  button: {
    display: 'inline-block',
    padding: '15px 40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '50px',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)',
  },
};

export default App;

