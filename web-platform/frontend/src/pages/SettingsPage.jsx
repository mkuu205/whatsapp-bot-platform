// web-platform/frontend/src/pages/SettingsPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function SettingsPage({ logout }) {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    whatsappNotifications: false,
    darkMode: false,
    autoTyping: true,
    autoRecording: false
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      // Call backend to delete account
      await axios.delete('/api/account');
      handleLogout();
    } catch (error) {
      alert('Failed to delete account');
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Settings</h1>
      
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Account Settings</h2>
        <div style={styles.card}>
          <div style={styles.infoRow}>
            <span style={styles.label}>Email</span>
            <span style={styles.value}>{user?.email || 'Not set'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Role</span>
            <span style={styles.value}>{user?.role || 'User'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Joined</span>
            <span style={styles.value}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Bot Settings</h2>
        <div style={styles.card}>
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} style={styles.toggleRow}>
              <div>
                <div style={styles.toggleLabel}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
                <div style={styles.toggleDescription}>
                  {getDescription(key)}
                </div>
              </div>
              <button
                onClick={() => handleToggle(key)}
                style={{
                  ...styles.toggleButton,
                  ...(value ? styles.toggleOn : styles.toggleOff)
                }}
              >
                <div style={{
                  ...styles.toggleCircle,
                  left: value ? 'calc(100% - 27px)' : '3px'
                }}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Danger Zone</h2>
        <div style={styles.card}>
          <button style={styles.dangerButton} onClick={handleLogout}>
            Logout
          </button>
          <button 
            style={{...styles.dangerButton, ...styles.deleteButton}}
            onClick={handleDeleteAccount}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function getDescription(key) {
  const descriptions = {
    emailNotifications: 'Receive email updates about your bots',
    whatsappNotifications: 'Get notifications on WhatsApp',
    darkMode: 'Enable dark theme',
    autoTyping: 'Show typing indicator in WhatsApp',
    autoRecording: 'Show recording indicator in WhatsApp'
  };
  return descriptions[key] || '';
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '30px',
  },
  title: {
    fontSize: '36px',
    fontWeight: '700',
    marginBottom: '40px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  label: {
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontWeight: '600',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  toggleLabel: {
    fontWeight: '600',
    marginBottom: '5px',
  },
  toggleDescription: {
    color: '#6b7280',
    fontSize: '14px',
  },
  toggleButton: {
    width: '60px',
    height: '30px',
    borderRadius: '15px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  toggleOn: {
    background: '#10b981',
  },
  toggleOff: {
    background: '#d1d5db',
  },
  toggleCircle: {
    position: 'absolute',
    top: '3px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'white',
    transition: 'all 0.3s ease',
  },
  dangerButton: {
    padding: '15px 25px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    marginRight: '15px',
  },
  deleteButton: {
    background: 'white',
    color: '#ef4444',
    border: '2px solid #ef4444',
  },
};

export default SettingsPage;
