// web-platform/frontend/src/components/Layout.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      {/* Header/Navbar */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <Link to="/" style={styles.logoLink}>
            🤖 WhatsApp Bot Platform
          </Link>
        </div>
        
        <nav style={styles.nav}>
          {user ? (
            <>
              <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
              <Link to="/bots" style={styles.navLink}>My Bots</Link>
              <Link to="/payment" style={styles.navLink}>Pricing</Link>
              
              <div style={styles.userMenu}>
                <span style={styles.userEmail}>{user.email}</span>
                <div style={styles.dropdown}>
                  <Link to="/settings" style={styles.dropdownItem}>Settings</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" style={styles.dropdownItem}>Admin</Link>
                  )}
                  <button onClick={handleLogout} style={styles.dropdownItem}>
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/" style={styles.navLink}>Home</Link>
              <Link to="/payment" style={styles.navLink}>Pricing</Link>
              <Link to="/login" style={styles.navLink}>Login</Link>
              <Link to="/register" style={styles.primaryButton}>
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {children}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerSection}>
            <h4>WhatsApp Bot Platform</h4>
            <p>Automate your WhatsApp communication with AI-powered bots.</p>
          </div>
          <div style={styles.footerSection}>
            <h4>Quick Links</h4>
            <Link to="/" style={styles.footerLink}>Home</Link>
            <Link to="/bots" style={styles.footerLink}>My Bots</Link>
            <Link to="/payment" style={styles.footerLink}>Pricing</Link>
            <Link to="/login" style={styles.footerLink}>Login</Link>
          </div>
          <div style={styles.footerSection}>
            <h4>Legal</h4>
            <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
            <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
            <Link to="/refund" style={styles.footerLink}>Refund Policy</Link>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p>© {new Date().getFullYear()} WhatsApp Bot Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '70px',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700',
  },
  logoLink: {
    color: '#6366f1',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
  },
  navLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '16px',
    transition: 'color 0.3s ease',
  },
  navLinkHover: {
    color: '#6366f1',
  },
  primaryButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
  },
  userMenu: {
    position: 'relative',
    cursor: 'pointer',
  },
  userEmail: {
    padding: '8px 16px',
    background: '#f3f4f6',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    background: 'white',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    borderRadius: '8px',
    padding: '10px 0',
    minWidth: '150px',
    display: 'none',
  },
  userMenuHover: {
    '& $dropdown': {
      display: 'block',
    },
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 20px',
    color: '#374151',
    textDecoration: 'none',
    fontSize: '14px',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
  },
  dropdownItemHover: {
    background: '#f3f4f6',
  },
  main: {
    flex: 1,
    minHeight: 'calc(100vh - 140px)',
  },
  footer: {
    background: '#1f2937',
    color: 'white',
    padding: '40px 20px 20px',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '40px',
    marginBottom: '40px',
  },
  footerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  footerLink: {
    color: '#d1d5db',
    textDecoration: 'none',
    fontSize: '14px',
  },
  footerLinkHover: {
    color: 'white',
  },
  footerBottom: {
    borderTop: '1px solid #374151',
    paddingTop: '20px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
};

export default Layout;
