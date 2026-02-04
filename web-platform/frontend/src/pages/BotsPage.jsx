// web-platform/frontend/src/pages/BotsPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function BotsPage({ user }) {
  const bots = [
    { id: 1, name: 'Customer Support', status: 'online', phone: '+254712345678', messages: 1234 },
    { id: 2, name: 'Marketing Bot', status: 'offline', phone: '+254798765432', messages: 567 },
    { id: 3, name: 'Sales Assistant', status: 'online', phone: '+254711223344', messages: 890 },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>My WhatsApp Bots</h1>
        <Link to="/bots/create" style={styles.createButton}>
          + Create New Bot
        </Link>
      </div>

      <div style={styles.botsGrid}>
        {bots.map(bot => (
          <div key={bot.id} style={styles.botCard}>
            <div style={styles.botHeader}>
              <div style={styles.botName}>
                <span style={styles.botIcon}>🤖</span>
                {bot.name}
              </div>
              <div style={{
                ...styles.status,
                ...(bot.status === 'online' ? styles.online : styles.offline)
              }}>
                {bot.status}
              </div>
            </div>
            
            <div style={styles.botInfo}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Phone:</span>
                <span style={styles.infoValue}>{bot.phone}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Messages:</span>
                <span style={styles.infoValue}>{bot.messages.toLocaleString()}</span>
              </div>
            </div>
            
            <div style={styles.botActions}>
              <Link to={`/bots/${bot.id}`} style={styles.actionButton}>
                Manage
              </Link>
              <Link to={`/pairing?bot=${bot.id}`} style={{
                ...styles.actionButton,
                ...styles.primaryButton
              }}>
                Pair
              </Link>
            </div>
          </div>
        ))}
      </div>

      {bots.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🤖</div>
          <h2>No Bots Yet</h2>
          <p>Create your first WhatsApp bot to get started</p>
          <Link to="/bots/create" style={styles.createButton}>
            Create Your First Bot
          </Link>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
  },
  createButton: {
    padding: '15px 30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '16px',
  },
  botsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '30px',
  },
  botCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease',
  },
  botCardHover: {
    transform: 'translateY(-5px)',
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
  online: {
    background: '#dcfce7',
    color: '#166534',
  },
  offline: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  botInfo: {
    marginBottom: '25px',
  },
  infoItem: {
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
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
};

export default BotsPage;
