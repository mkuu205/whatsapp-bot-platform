// web-platform/frontend/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

function Navbar({ darkMode, toggleDarkMode }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <nav className={`navbar ${darkMode ? 'dark' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">🤖</div>
          <div className="brand-text">
            <span className="brand-name">WhatsAppBot</span>
            <span className="brand-tagline">Platform</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          {user && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
          {user && <Link to="/bots" className="nav-link">My Bots</Link>}
          {user?.role === 'admin' && <Link to="/admin" className="nav-link admin-link">Admin</Link>}
        </div>

        {/* Right Side */}
        <div className="navbar-actions">
          {/* Dark Mode Toggle */}
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* User Menu */}
          {user ? (
            <div className="user-menu">
              <div className="user-avatar">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-dropdown">
                <div className="user-info">
                  <div className="user-name">{user.email || 'User'}</div>
                  <div className="user-role">{user.role || 'Member'}</div>
                </div>
                <Link to="/dashboard" className="dropdown-item">Dashboard</Link>
                <Link to="/bots" className="dropdown-item">My Bots</Link>
                <Link to="/settings" className="dropdown-item">Settings</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="dropdown-item admin-item">Admin Panel</Link>
                )}
                <button onClick={handleLogout} className="dropdown-item logout">
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">Sign In</Link>
              <Link to="/register" className="btn-register">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
