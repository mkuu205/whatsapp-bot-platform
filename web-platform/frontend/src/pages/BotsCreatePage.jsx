import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function BotsCreatePage({ user }) {
  const [botName, setBotName] = useState('');
  const [botType, setBotType] = useState('support');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Mock API call
      setTimeout(() => {
        setSuccess(`Bot "${botName}" created successfully! Redirecting to pairing...`);
        setTimeout(() => {
          navigate('/pairing');
        }, 2000);
      }, 1500);
    } catch (err) {
      setError('Failed to create bot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '20px',
      color: '#1f2937',
    },
    subtitle: {
      color: '#6b7280',
      marginBottom: '40px',
      fontSize: '18px',
    },
    card: {
      background: 'white',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
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
      fontSize: '16px',
      fontWeight: '600',
      color: '#374151',
    },
    input: {
      padding: '15px',
      border: '1px solid #d1d5db',
      borderRadius: '10px',
      fontSize: '16px',
    },
    select: {
      padding: '15px',
      border: '1px solid #d1d5db',
      borderRadius: '10px',
      fontSize: '16px',
      background: 'white',
    },
    optionGroup: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginTop: '10px',
    },
    option: {
      padding: '20px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    optionSelected: {
      borderColor: '#6366f1',
      background: 'rgba(99, 102, 241, 0.1)',
    },
    optionIcon: {
      fontSize: '32px',
      marginBottom: '10px',
    },
    optionTitle: {
      fontWeight: '600',
      marginBottom: '5px',
    },
    optionDesc: {
      fontSize: '14px',
      color: '#6b7280',
    },
    button: {
      padding: '18px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '18px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '20px',
    },
    error: {
      background: '#fee2e2',
      color: '#dc2626',
      padding: '15px',
      borderRadius: '10px',
    },
    success: {
      background: '#dcfce7',
      color: '#166534',
      padding: '15px',
      borderRadius: '10px',
    },
  };

  const botTypes = [
    {
      id: 'support',
      icon: '💬',
      title: 'Customer Support',
      description: 'Auto-reply to customer inquiries'
    },
    {
      id: 'marketing',
      icon: '📢',
      title: 'Marketing',
      description: 'Send broadcast messages'
    },
    {
      id: 'notify',
      icon: '🔔',
      title: 'Notifications',
      description: 'Send alerts and updates'
    },
    {
      id: 'custom',
      icon: '⚙️',
      title: 'Custom Bot',
      description: 'Configure your own rules'
    }
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create New WhatsApp Bot</h1>
      <p style={styles.subtitle}>Configure your bot settings below</p>

      <div style={styles.card}>
        {error && <div style={styles.error}>⚠️ {error}</div>}
        {success && <div style={styles.success}>✅ {success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Bot Name</label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="e.g., Customer Support Bot"
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Bot Type</label>
            <div style={styles.optionGroup}>
              {botTypes.map((type) => (
                <div
                  key={type.id}
                  style={{
                    ...styles.option,
                    ...(botType === type.id ? styles.optionSelected : {})
                  }}
                  onClick={() => setBotType(type.id)}
                >
                  <div style={styles.optionIcon}>{type.icon}</div>
                  <div style={styles.optionTitle}>{type.title}</div>
                  <div style={styles.optionDesc}>{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Creating Bot...' : 'Create Bot & Get Pairing Code'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default BotsCreatePage;
