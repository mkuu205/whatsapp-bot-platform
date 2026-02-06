// web-platform/frontend/src/pages/BotsCreatePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

function BotsCreatePage() {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [botType, setBotType] = useState('support');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First check subscription status
      const subscriptionRes = await axios.get('/subscription/status');
      
      if (!subscriptionRes.data.has_subscription || subscriptionRes.data.subscription?.is_expired) {
        setError('Active subscription required. Please upgrade your plan first.');
        setLoading(false);
        return;
      }

      // Create bot
      const response = await axios.post('/bots/create', {
        name,
        phoneNumber,
        type: botType
      });

      if (response.data.success) {
        const botId = response.data.bot.id;
        
        // Redirect to payment if needed, otherwise to pairing
        if (!subscriptionRes.data.subscription?.is_active) {
          navigate('/payment', { state: { botId } });
        } else {
          navigate(`/pairing?botId=${botId}`);
        }
      } else {
        setError(response.data.error || 'Failed to create bot');
      }
    } catch (error) {
      console.error('Create bot error:', error);
      
      if (error.response?.status === 402) {
        setError('Subscription required. Please upgrade your plan first.');
        navigate('/payment');
      } else {
        setError(error.response?.data?.error || 'Failed to create bot. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const botTypes = [
    { id: 'support', icon: '💬', name: 'Support', desc: 'Customer service automation' },
    { id: 'marketing', icon: '📢', name: 'Marketing', desc: 'Broadcast & campaigns' },
    { id: 'notification', icon: '🔔', name: 'Notification', desc: 'Alerts & updates' },
    { id: 'custom', icon: '⚙️', name: 'Custom', desc: 'Full customization' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Create New WhatsApp Bot</h1>
        <p>Configure your bot settings and get started</p>
      </div>

      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      <div style={styles.card}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Bot Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Support Bot"
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>WhatsApp Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+254712345678"
              style={styles.input}
              required
              disabled={loading}
            />
            <small style={styles.help}>Include country code. This number will be linked to your bot.</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Bot Type</label>
            <div style={styles.typeGrid}>
              {botTypes.map((type) => (
                <div
                  key={type.id}
                  style={{
                    ...styles.typeCard,
                    ...(botType === type.id ? styles.typeCardSelected : {})
                  }}
                  onClick={() => setBotType(type.id)}
                >
                  <div style={styles.typeIcon}>{type.icon}</div>
                  <div style={styles.typeName}>{type.name}</div>
                  <div style={styles.typeDesc}>{type.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Creating Bot...' : 'Create Bot & Continue'}
          </button>
        </form>
      </div>

      <div style={styles.info}>
        <h3>What happens next?</h3>
        <ol style={styles.steps}>
          <li><strong>Create Bot</strong> - Bot will be created in our system</li>
          <li><strong>Payment</strong> - Pay for subscription (if not already active)</li>
          <li><strong>Pair Device</strong> - Link your WhatsApp with QR code</li>
          <li><strong>Upload Credentials</strong> - Upload credentials.json from WhatsApp</li>
          <li><strong>Deploy</strong> - Bot will be automatically deployed and ready</li>
        </ol>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontWeight: '600',
    fontSize: '16px',
  },
  input: {
    padding: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '16px',
  },
  help: {
    color: '#6b7280',
    fontSize: '14px',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginTop: '10px',
  },
  typeCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  typeCardSelected: {
    borderColor: '#6366f1',
    background: 'rgba(99, 102, 241, 0.1)',
  },
  typeIcon: {
    fontSize: '32px',
    marginBottom: '10px',
  },
  typeName: {
    fontWeight: '600',
    marginBottom: '5px',
  },
  typeDesc: {
    fontSize: '12px',
    color: '#6b7280',
  },
  button: {
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
  },
  info: {
    background: '#f8fafc',
    padding: '25px',
    borderRadius: '15px',
  },
  steps: {
    marginLeft: '20px',
    lineHeight: '2',
  },
};

export default BotsCreatePage;
