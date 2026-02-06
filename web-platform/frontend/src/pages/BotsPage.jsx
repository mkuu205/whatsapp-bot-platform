// web-platform/frontend/src/pages/BotsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

function BotsPage() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const response = await axios.get('/bots');
      setBots(response.data);
    } catch (error) {
      setError('Failed to load bots');
      console.error('Error fetching bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async (botId) => {
    if (!window.confirm('Are you sure you want to delete this bot?')) return;
    
    try {
      await axios.delete(`/bots/${botId}`);
      // Refresh list
      fetchBots();
    } catch (error) {
      alert('Failed to delete bot');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'offline': return '#6b7280';
      case 'pairing': return '#f59e0b';
      case 'deploying': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (bot) => {
    if (bot.session_status === 'online') return 'Online';
    if (bot.session_status === 'offline') return 'Offline';
    if (bot.session_status === 'pairing') return 'Pairing Required';
    if (bot.session_status === 'creds_uploaded') return 'Ready to Deploy';
    if (bot.session_status === 'deploying') return 'Deploying...';
    if (bot.session_status === 'deployed') return 'Deployed';
    return 'Inactive';
  };

  const getNextStep = (bot) => {
    if (!bot.session_status || bot.session_status === 'created') {
      return { label: 'Start Setup', path: `/pairing?botId=${bot.id}` };
    }
    if (bot.session_status === 'pairing') {
      return { label: 'Complete Pairing', path: `/pairing?botId=${bot.id}` };
    }
    if (bot.session_status === 'creds_uploaded') {
      return { label: 'Upload Credentials', path: `/bots/${bot.id}/upload-creds` };
    }
    if (bot.session_status === 'deploying' || bot.session_status === 'deployed') {
      return { label: 'Manage Bot', path: `/bots/${bot.id}` };
    }
    return { label: 'View Details', path: `/bots/${bot.id}` };
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading your bots...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>My WhatsApp Bots</h1>
        <Link to="/bots/create" style={styles.createButton}>
          + Create New Bot
        </Link>
      </div>

      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {bots.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🤖</div>
          <h2>No Bots Yet</h2>
          <p>Create your first WhatsApp bot to get started</p>
          <Link to="/bots/create" style={styles.createButton}>
            Create Your First Bot
          </Link>
        </div>
      ) : (
        <div style={styles.botsGrid}>
          {bots.map((bot) => {
            const nextStep = getNextStep(bot);
            const statusColor = getStatusColor(bot.session_status);
            
            return (
              <div key={bot.id} style={styles.botCard}>
                <div style={styles.botHeader}>
                  <div style={styles.botName}>
                    <span style={styles.botIcon}>🤖</span>
                    {bot.name}
                  </div>
                  <div style={{
                    ...styles.status,
                    background: `${statusColor}20`,
                    color: statusColor,
                    border: `1px solid ${statusColor}40`
                  }}>
                    {getStatusText(bot)}
                  </div>
                </div>
                
                <div style={styles.botInfo}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>WhatsApp:</span>
                    <span style={styles.infoValue}>
                      {bot.whatsapp_number || 'Not linked'}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Created:</span>
                    <span style={styles.infoValue}>
                      {new Date(bot.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Expires:</span>
                    <span style={{
                      ...styles.infoValue,
                      color: bot.expires_at && new Date(bot.expires_at) < new Date() ? '#ef4444' : 'inherit'
                    }}>
                      {bot.expires_at ? new Date(bot.expires_at).toLocaleDateString() : 'No expiry'}
                    </span>
                  </div>
                </div>
                
                <div style={styles.botActions}>
                  <Link to={nextStep.path} style={styles.actionButton}>
                    {nextStep.label}
                  </Link>
                  <Link to={`/bots/${bot.id}`} style={styles.actionButtonSecondary}>
                    Manage
                  </Link>
                  <button 
                    onClick={() => handleDeleteBot(bot.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
  },
  createButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  botsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '25px',
  },
  botCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  botHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  botName: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '20px',
    fontWeight: '600',
  },
  botIcon: {
    fontSize: '24px',
  },
  status: {
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
  botInfo: {
    marginBottom: '25px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  infoLabel: {
    color: '#6b7280',
  },
  infoValue: {
    fontWeight: '600',
  },
  botActions: {
    display: 'flex',
    gap: '10px',
  },
  actionButton: {
    flex: 2,
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    textAlign: 'center',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
  },
  actionButtonSecondary: {
    flex: 1,
    padding: '12px',
    background: '#f3f4f6',
    color: '#374151',
    textDecoration: 'none',
    textAlign: 'center',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
  },
  deleteButton: {
    flex: 1,
    padding: '12px',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default BotsPage;
