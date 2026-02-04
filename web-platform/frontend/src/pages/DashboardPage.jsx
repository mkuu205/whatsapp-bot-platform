// web-platform/frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

function DashboardPage({ user }) {
  const [stats, setStats] = useState({
    totalBots: 0,
    activeBots: 0,
    messagesToday: 0,
    subscriptionDays: 30
  });

  const [recentBots, setRecentBots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now
    setTimeout(() => {
      setStats({
        totalBots: 3,
        activeBots: 2,
        messagesToday: 156,
        subscriptionDays: 27
      });
      setRecentBots([
        { id: 1, name: 'Support Bot', status: 'online', lastActive: '2 mins ago' },
        { id: 2, name: 'Marketing Bot', status: 'offline', lastActive: '1 hour ago' },
        { id: 3, name: 'Sales Bot', status: 'online', lastActive: 'Just now' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Welcome back, {user?.name || 'User'}! 👋</h1>
          <p>Here's what's happening with your WhatsApp bots today.</p>
        </div>
        <div className="welcome-actions">
          <Link to="/bots/create" className="btn-primary">
            + Deploy New Bot
          </Link>
          <Link to="/payment" className="btn-secondary">
            Upgrade Plan
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalBots}</div>
            <div className="stat-label">Total Bots</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeBots}</div>
            <div className="stat-label">Active Now</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <div className="stat-value">{stats.messagesToday}</div>
            <div className="stat-label">Messages Today</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-value">{stats.subscriptionDays}</div>
            <div className="stat-label">Days Left</div>
          </div>
        </div>
      </div>

      {/* Recent Bots */}
      <div className="recent-bots">
        <div className="section-header">
          <h2>Your WhatsApp Bots</h2>
          <Link to="/bots" className="view-all">View All →</Link>
        </div>
        
        <div className="bots-grid">
          {recentBots.map(bot => (
            <div key={bot.id} className="bot-card">
              <div className="bot-header">
                <div className="bot-name">{bot.name}</div>
                <div className={`bot-status ${bot.status}`}>
                  <span className="status-dot"></span>
                  {bot.status}
                </div>
              </div>
              <div className="bot-info">
                <div className="info-item">
                  <span className="info-label">Last Active:</span>
                  <span className="info-value">{bot.lastActive}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Messages:</span>
                  <span className="info-value">1,234</span>
                </div>
              </div>
              <div className="bot-actions">
                <Link to={`/bots/${bot.id}`} className="action-btn">Manage</Link>
                <Link to={`/pairing?bot=${bot.id}`} className="action-btn primary">Pair</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/pairing" className="action-card">
            <div className="action-icon">🔗</div>
            <div className="action-title">Link WhatsApp</div>
            <div className="action-desc">Pair new device</div>
          </Link>
          
          <Link to="/bots/create" className="action-card">
            <div className="action-icon">🤖</div>
            <div className="action-title">Create Bot</div>
            <div className="action-desc">Deploy new bot</div>
          </Link>
          
          <Link to="/settings" className="action-card">
            <div className="action-icon">⚙️</div>
            <div className="action-title">Settings</div>
            <div className="action-desc">Configure platform</div>
          </Link>
          
          <Link to="/payment" className="action-card">
            <div className="action-icon">💳</div>
            <div className="action-title">Upgrade</div>
            <div className="action-desc">Get more features</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
