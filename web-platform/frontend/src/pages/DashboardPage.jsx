// web-platform/frontend/src/pages/DashboardPage.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios'; // Import the custom axios instance
import { useAuth } from '../contexts/AuthContext';

function DashboardPage() {
  const [stats, setStats] = useState({
    totalBots: 0,
    activeBots: 0,
    subscriptionDays: 0,
    subscriptionStatus: 'inactive'
  });
  const [recentBots, setRecentBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('📊 Fetching dashboard data...');
      
      // Fetch user subscription - FIXED: using api instance with base URL
      const subscriptionRes = await api.get('/api/subscription/status');
      console.log('✅ Subscription data:', subscriptionRes.data);
      setSubscription(subscriptionRes.data);

      // Fetch user bots - FIXED: using api instance with base URL
      const botsRes = await api.get('/api/bots');
      console.log('✅ Bots data:', botsRes.data);
      const bots = botsRes.data || [];
      
      // Calculate stats
      const activeBots = bots.filter(b => b.session_status === 'online').length;
      const daysLeft = subscriptionRes.data.has_subscription 
        ? subscriptionRes.data.subscription.days_remaining 
        : 0;

      setStats({
        totalBots: bots.length,
        activeBots,
        subscriptionDays: daysLeft,
        subscriptionStatus: subscriptionRes.data.has_subscription ? 'active' : 'inactive'
      });

      // Get recent bots (last 3)
      setRecentBots(bots.slice(0, 3));
      
    } catch (error) {
      console.error('❌ Dashboard data error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Set mock data for development if API fails
      if (error.response?.status === 404) {
        console.log('⚠️ Using mock data for development');
        setMockDashboardData();
      }
    } finally {
      setLoading(false);
    }
  };

  // Mock data function for development
  const setMockDashboardData = () => {
    setSubscription({
      has_subscription: true,
      subscription: {
        days_remaining: 30,
        is_expired: false,
        is_active: true
      }
    });
    
    setStats({
      totalBots: 2,
      activeBots: 1,
      subscriptionDays: 30,
      subscriptionStatus: 'active'
    });
    
    setRecentBots([
      {
        id: 'bot-1',
        name: 'Support Bot',
        whatsapp_number: '+254712345678',
        session_status: 'online',
        created_at: new Date().toISOString()
      },
      {
        id: 'bot-2',
        name: 'Marketing Bot',
        whatsapp_number: '+254798765432',
        session_status: 'offline',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'pairing': return '#f59e0b';
      case 'creds_uploaded': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getNextAction = (bot) => {
    if (!bot.session_status || bot.session_status === 'created') {
      return { label: 'Setup', path: `/pairing?botId=${bot.id}` };
    }
    if (bot.session_status === 'pairing') {
      return { label: 'Pair', path: `/pairing?botId=${bot.id}` };
    }
    if (bot.session_status === 'creds_uploaded') {
      return { label: 'Deploy', path: `/bots/${bot.id}/upload-creds` };
    }
    return { label: 'Manage', path: `/bots/${bot.id}` };
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Welcome Section */}
      <div style={styles.welcomeSection}>
        <div style={styles.welcomeContent}>
          <h1 style={styles.welcomeTitle}>
            Welcome back, {user?.email?.split('@')[0] || 'User'}! 👋
          </h1>
          <p style={styles.welcomeSubtitle}>
            {subscription?.has_subscription 
              ? `Your subscription has ${stats.subscriptionDays} days remaining`
              : 'Get started by subscribing to create bots'}
          </p>
        </div>
        <div style={styles.welcomeActions}>
          <Link to="/bots/create" style={styles.primaryButton}>
            + Create New Bot
          </Link>
          {!subscription?.has_subscription && (
            <Link to="/payment" style={styles.secondaryButton}>
              💳 Subscribe Now
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🤖</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.totalBots}</div>
            <div style={styles.statLabel}>Total Bots</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🟢</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.activeBots}</div>
            <div style={styles.statLabel}>Active Now</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏰</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.subscriptionDays}</div>
            <div style={styles.statLabel}>Days Left</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔧</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>
              {subscription?.has_subscription ? 'Active' : 'Inactive'}
            </div>
            <div style={styles.statLabel}>Subscription</div>
          </div>
        </div>
      </div>

      {/* Recent Bots Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Your WhatsApp Bots</h2>
          <Link to="/bots" style={styles.viewAllLink}>
            View All →
          </Link>
        </div>
        
        {recentBots.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🤖</div>
            <h3>No Bots Yet</h3>
            <p>Create your first WhatsApp bot to get started</p>
            <Link to="/bots/create" style={styles.createButton}>
              Create Your First Bot
            </Link>
          </div>
        ) : (
          <div style={styles.botsGrid}>
            {recentBots.map((bot) => {
              const nextAction = getNextAction(bot);
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
                      {bot.session_status || 'inactive'}
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
                  </div>
                  
                  <div style={styles.botActions}>
                    <Link to={nextAction.path} style={styles.actionButton}>
                      {nextAction.label}
                    </Link>
                    <Link to={`/bots/${bot.id}`} style={styles.secondaryAction}>
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2>Quick Actions</h2>
        <div style={styles.quickActions}>
          {stats.totalBots === 0 ? (
            // Only show Create Bot when no bots exist
            <Link to="/bots/create" style={styles.quickAction}>
              <div style={styles.quickActionIcon}>🤖</div>
              <div>
                <div style={styles.quickActionTitle}>Create Bot</div>
                <div style={styles.quickActionDesc}>Deploy your first WhatsApp bot</div>
              </div>
            </Link>
          ) : (
            // Show multiple actions when bots exist
            <>
              <Link to="/bots/create" style={styles.quickAction}>
                <div style={styles.quickActionIcon}>🤖</div>
                <div>
                  <div style={styles.quickActionTitle}>Create Bot</div>
                  <div style={styles.quickActionDesc}>Deploy new WhatsApp bot</div>
                </div>
              </Link>
              
              <Link to="/pairing" style={styles.quickAction}>
                <div style={styles.quickActionIcon}>🔗</div>
                <div>
                  <div style={styles.quickActionTitle}>Pair Device</div>
                  <div style={styles.quickActionDesc}>Link new WhatsApp number</div>
                </div>
              </Link>
              
              {!subscription?.has_subscription && (
                <Link to="/payment" style={styles.quickAction}>
                  <div style={styles.quickActionIcon}>💳</div>
                  <div>
                    <div style={styles.quickActionTitle}>Upgrade</div>
                    <div style={styles.quickActionDesc}>Get more features</div>
                  </div>
                </Link>
              )}
              
              <Link to="/settings" style={styles.quickAction}>
                <div style={styles.quickActionIcon}>⚙️</div>
                <div>
                  <div style={styles.quickActionTitle}>Settings</div>
                  <div style={styles.quickActionDesc}>Configure platform</div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
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
  welcomeSection: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '20px',
    padding: '40px',
    marginBottom: '30px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: '36px',
    marginBottom: '10px',
  },
  welcomeSubtitle: {
    opacity: 0.9,
    fontSize: '18px',
  },
  welcomeActions: {
    display: 'flex',
    gap: '15px',
  },
  primaryButton: {
    padding: '14px 28px',
    background: 'white',
    color: '#6366f1',
    textDecoration: 'none',
    borderRadius: '50px',
    fontWeight: '600',
    fontSize: '16px',
  },
  secondaryButton: {
    padding: '14px 28px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '50px',
    fontWeight: '600',
    fontSize: '16px',
    border: '2px solid white',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  statIcon: {
    fontSize: '40px',
    width: '70px',
    height: '70px',
    background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '5px',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '14px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
  },
  viewAllLink: {
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '600',
  },
  emptyState: {
    background: '#f8fafc',
    borderRadius: '15px',
    padding: '40px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  createButton: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  botsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
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
    fontSize: '18px',
    fontWeight: '600',
  },
  botIcon: {
    fontSize: '24px',
  },
  status: {
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  botInfo: {
    marginBottom: '25px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: '14px',
  },
  infoValue: {
    fontWeight: '600',
    fontSize: '14px',
  },
  botActions: {
    display: 'flex',
    gap: '10px',
  },
  actionButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textDecoration: 'none',
    textAlign: 'center',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
  },
  secondaryAction: {
    flex: 1,
    padding: '10px',
    background: '#f3f4f6',
    color: '#374151',
    textDecoration: 'none',
    textAlign: 'center',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
  },
  quickAction: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '1px solid transparent',
    transition: 'all 0.3s ease',
  },
  quickActionHover: {
    borderColor: '#6366f1',
    transform: 'translateY(-5px)',
  },
  quickActionIcon: {
    fontSize: '32px',
  },
  quickActionTitle: {
    fontWeight: '600',
    marginBottom: '5px',
  },
  quickActionDesc: {
    fontSize: '14px',
    color: '#6b7280',
  },
};

export default DashboardPage;
