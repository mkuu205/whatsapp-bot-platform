// web-platform/frontend/src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';

function AdminPage({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBots: 0,
    totalRevenue: 0,
    activeSubscriptions: 0
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data
    setTimeout(() => {
      setStats({
        totalUsers: 42,
        totalBots: 87,
        totalRevenue: 1250,
        activeSubscriptions: 38
      });
      setUsers([
        { id: 1, email: 'user1@example.com', bots: 2, status: 'active', joined: '2024-01-15' },
        { id: 2, email: 'user2@example.com', bots: 1, status: 'active', joined: '2024-01-20' },
        { id: 3, email: 'user3@example.com', bots: 3, status: 'expired', joined: '2024-01-10' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.email || 'Admin'}</p>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading admin data...</div>
      ) : (
        <>
          {/* Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <h3 style={styles.statValue}>{stats.totalUsers}</h3>
              <p style={styles.statLabel}>Total Users</p>
            </div>
            <div style={styles.statCard}>
              <h3 style={styles.statValue}>{stats.totalBots}</h3>
              <p style={styles.statLabel}>Total Bots</p>
            </div>
            <div style={styles.statCard}>
              <h3 style={styles.statValue}>${stats.totalRevenue}</h3>
              <p style={styles.statLabel}>Revenue</p>
            </div>
            <div style={styles.statCard}>
              <h3 style={styles.statValue}>{stats.activeSubscriptions}</h3>
              <p style={styles.statLabel}>Active Subs</p>
            </div>
          </div>

          {/* Users Table */}
          <div style={styles.section}>
            <h2>Recent Users</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Bots</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.bots}</td>
                    <td>
                      <span style={{
                        ...styles.status,
                        ...(user.status === 'active' ? styles.active : styles.expired)
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td>{user.joined}</td>
                    <td>
                      <button style={styles.actionBtn}>View</button>
                      <button style={styles.actionBtn}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Admin Actions */}
          <div style={styles.section}>
            <h2>Admin Actions</h2>
            <div style={styles.actions}>
              <button style={styles.adminBtn}>View All Payments</button>
              <button style={styles.adminBtn}>Manage Subscriptions</button>
              <button style={styles.adminBtn}>System Settings</button>
              <button style={styles.adminBtn}>Backup Database</button>
            </div>
          </div>
        </>
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
    marginBottom: '40px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '700',
    margin: '0 0 10px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '16px',
  },
  section: {
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  th: {
    textAlign: 'left',
    padding: '15px',
    borderBottom: '2px solid #e5e7eb',
    color: '#374151',
    fontWeight: '600',
  },
  td: {
    padding: '15px',
    borderBottom: '1px solid #e5e7eb',
  },
  status: {
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
  active: {
    background: '#dcfce7',
    color: '#166534',
  },
  expired: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  actionBtn: {
    padding: '8px 16px',
    margin: '0 5px',
    background: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    marginTop: '20px',
  },
  adminBtn: {
    padding: '15px 25px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
};

export default AdminPage;
