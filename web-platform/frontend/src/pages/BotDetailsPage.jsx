// web-platform/frontend/src/pages/BotDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function BotDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBotDetails();
  }, [id]);

  const fetchBotDetails = async () => {
    try {
      const response = await axios.get(`/bots/${id}`);
      setBot(response.data);
    } catch (error) {
      setError('Failed to load bot details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const response = await axios.post(`/bots/${id}/action/${action}`);
      alert(`${action} action successful!`);
      fetchBotDetails(); // Refresh data
    } catch (error) {
      alert(`Failed to ${action} bot: ${error.response?.data?.error || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/bots/${id}`);
      alert('Bot deleted successfully!');
      navigate('/bots');
    } catch (error) {
      alert('Failed to delete bot');
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading bot details...</p>
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div style={styles.error}>
        <h2>Bot Not Found</h2>
        <p>{error || 'The bot you are looking for does not exist.'}</p>
        <Link to="/bots" style={styles.button}>Back to Bots</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{bot.name}</h1>
          <div style={styles.breadcrumb}>
            <Link to="/bots">My Bots</Link> / {bot.name}
          </div>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={() => handleAction('start')}
            disabled={actionLoading || bot.session_status === 'online'}
            style={styles.actionButton}
          >
            Start
          </button>
          <button 
            onClick={() => handleAction('stop')}
            disabled={actionLoading || bot.session_status !== 'online'}
            style={{...styles.actionButton, ...styles.stopButton}}
          >
            Stop
          </button>
          <button 
            onClick={handleDelete}
            style={{...styles.actionButton, ...styles.deleteButton}}
          >
            Delete
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3>Bot Information</h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <label>Status</label>
              <div style={{
                ...styles.status,
                ...(bot.session_status === 'online' ? styles.online : {}),
                ...(bot.session_status === 'offline' ? styles.offline : {}),
                ...(bot.session_status === 'pairing' ? styles.pairing : {})
              }}>
                {bot.session_status || 'inactive'}
              </div>
            </div>
            <div style={styles.infoItem}>
              <label>WhatsApp Number</label>
              <div>{bot.whatsapp_number || 'Not paired'}</div>
            </div>
            <div style={styles.infoItem}>
              <label>Created</label>
              <div>{new Date(bot.created_at).toLocaleString()}</div>
            </div>
            <div style={styles.infoItem}>
              <label>Last Active</label>
              <div>{bot.last_active ? new Date(bot.last_active).toLocaleString() : 'Never'}</div>
            </div>
            <div style={styles.infoItem}>
              <label>Expires</label>
              <div style={{
                color: bot.expires_at && new Date(bot.expires_at) < new Date() ? '#ef4444' : 'inherit'
              }}>
                {bot.expires_at ? new Date(bot.expires_at).toLocaleDateString() : 'No expiry'}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h3>Quick Actions</h3>
          <div style={styles.quickActions}>
            {bot.session_status === 'pairing' && (
              <Link to={`/pairing?botId=${id}`} style={styles.quickAction}>
                <div style={styles.quickActionIcon}>🔗</div>
                <div style={styles.quickActionText}>
                  <div style={styles.quickActionTitle}>Complete Pairing</div>
                  <div style={styles.quickActionDesc}>Finish linking WhatsApp</div>
                </div>
              </Link>
            )}
            
            {bot.session_status === 'creds_uploaded' && (
              <Link to={`/bots/${id}/upload-creds`} style={styles.quickAction}>
                <div style={styles.quickActionIcon}>📁</div>
                <div style={styles.quickActionText}>
                  <div style={styles.quickActionTitle}>Upload Credentials</div>
                  <div style={styles.quickActionDesc}>Upload credentials.json</div>
                </div>
              </Link>
            )}

            <Link to={`/pairing?botId=${id}`} style={styles.quickAction}>
              <div style={styles.quickActionIcon}>🔄</div>
              <div style={styles.quickActionText}>
                <div style={styles.quickActionTitle}>Re-pair Device</div>
                <div style={styles.quickActionDesc}>Link new WhatsApp number</div>
              </div>
            </Link>

            <button onClick={() => handleAction('restart')} style={styles.quickAction}>
              <div style={styles.quickActionIcon}>⚡</div>
              <div style={styles.quickActionText}>
                <div style={styles.quickActionTitle}>Restart Bot</div>
                <div style={styles.quickActionDesc}>Restart bot service</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {bot.runtime_status && (
        <div style={styles.card}>
          <h3>Runtime Status</h3>
          <pre style={styles.code}>
            {JSON.stringify(bot.runtime_status, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
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
    textAlign: 'center',
    padding: '60px 20px',
  },
  button: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '12px 24px',
    background: '#6366f1',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '32px',
    marginBottom: '10px',
  },
  breadcrumb: {
    color: '#6b7280',
    fontSize: '14px',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '10px 20px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  stopButton: {
    background: '#f59e0b',
  },
  deleteButton: {
    background: '#ef4444',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '25px',
    marginBottom: '25px',
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  status: {
    display: 'inline-block',
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  online: {
    background: '#dcfce7',
    color: '#166534',
  },
  offline: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  pairing: {
    background: '#fef3c7',
    color: '#92400e',
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px',
  },
  quickAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    background: '#f8fafc',
    borderRadius: '10px',
    textDecoration: 'none',
    color: 'inherit',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  quickActionIcon: {
    fontSize: '24px',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontWeight: '600',
    marginBottom: '5px',
  },
  quickActionDesc: {
    fontSize: '14px',
    color: '#6b7280',
  },
  code: {
    background: '#1f2937',
    color: '#e5e7eb',
    padding: '20px',
    borderRadius: '10px',
    overflow: 'auto',
    marginTop: '20px',
    fontSize: '14px',
  },
};

export default BotDetailsPage;
