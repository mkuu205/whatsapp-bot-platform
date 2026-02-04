// web-platform/frontend/src/pages/Admin.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function AdminPage({ user, logout }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [bots, setBots] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalBots: 0,
        onlineBots: 0,
        revenue: 0
    });

    useEffect(() => {
        if (user?.role === 'admin') {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [usersRes, botsRes, paymentsRes] = await Promise.all([
                axios.get(`${API_URL}/admin/users?page=1&limit=10`),
                axios.get(`${API_URL}/admin/bots`),
                axios.get(`${API_URL}/admin/payments`)
            ]);

            setUsers(usersRes.data.users);
            setBots(botsRes.data);
            setPayments(paymentsRes.data);

            // Calculate stats
            const onlineBots = botsRes.data.filter(b => b.session_status === 'online').length;
            const revenue = paymentsRes.data
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0);

            setStats({
                totalUsers: usersRes.data.pagination.total,
                totalBots: botsRes.data.length,
                onlineBots,
                revenue: revenue.toFixed(2)
            });

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const extendSubscription = async (userId, days) => {
        if (!window.confirm(`Extend subscription by ${days} days?`)) return;

        try {
            await axios.post(`${API_URL}/admin/extend-subscription`, {
                userId,
                days
            });
            alert('Subscription extended successfully');
            loadDashboardData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to extend subscription');
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Admin Dashboard</h1>
                <div className="admin-info">
                    <span>Logged in as: {user?.email}</span>
                    <button onClick={logout} className="logout-btn">Logout</button>
                </div>
            </div>

            <div className="admin-tabs">
                <button 
                    className={activeTab === 'dashboard' ? 'active' : ''}
                    onClick={() => setActiveTab('dashboard')}
                >
                    Dashboard
                </button>
                <button 
                    className={activeTab === 'users' ? 'active' : ''}
                    onClick={() => setActiveTab('users')}
                >
                    Users ({stats.totalUsers})
                </button>
                <button 
                    className={activeTab === 'bots' ? 'active' : ''}
                    onClick={() => setActiveTab('bots')}
                >
                    Bots ({stats.totalBots})
                </button>
                <button 
                    className={activeTab === 'payments' ? 'active' : ''}
                    onClick={() => setActiveTab('payments')}
                >
                    Payments
                </button>
            </div>

            {loading && <div className="loading">Loading...</div>}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && !loading && (
                <div className="dashboard-content">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>Total Users</h3>
                            <div className="stat-value">{stats.totalUsers}</div>
                        </div>
                        <div className="stat-card">
                            <h3>Total Bots</h3>
                            <div className="stat-value">{stats.totalBots}</div>
                        </div>
                        <div className="stat-card">
                            <h3>Online Bots</h3>
                            <div className="stat-value">{stats.onlineBots}</div>
                        </div>
                        <div className="stat-card">
                            <h3>Revenue</h3>
                            <div className="stat-value">${stats.revenue}</div>
                        </div>
                    </div>

                    <div className="recent-activity">
                        <h3>Recent Users</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Bots</th>
                                    <th>Subscription</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.slice(0, 5).map(user => (
                                    <tr key={user.id}>
                                        <td>{user.email}</td>
                                        <td>{user.phone || '-'}</td>
                                        <td>{user.bot_count}</td>
                                        <td>
                                            {user.subscription_ends ? 
                                                new Date(user.subscription_ends).toLocaleDateString() : 
                                                'No subscription'}
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => extendSubscription(user.id, 30)}
                                                className="btn-small"
                                            >
                                                +30 Days
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="users-content">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Subscription</th>
                                <th>Bots</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id.substring(0, 8)}...</td>
                                    <td>{user.email}</td>
                                    <td>{user.phone || '-'}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        {user.subscription_ends ? 
                                            `${new Date(user.subscription_ends).toLocaleDateString()}` : 
                                            <span className="expired">Expired</span>}
                                    </td>
                                    <td>
                                        <span className={`bot-count ${user.online_bots > 0 ? 'online' : ''}`}>
                                            {user.bot_count} ({user.online_bots} online)
                                        </span>
                                    </td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                onClick={() => extendSubscription(user.id, 30)}
                                                className="btn-small"
                                            >
                                                +30 Days
                                            </button>
                                            <button 
                                                onClick={() => extendSubscription(user.id, 7)}
                                                className="btn-small"
                                            >
                                                +7 Days
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bots Tab */}
            {activeTab === 'bots' && (
                <div className="bots-content">
                    <table>
                        <thead>
                            <tr>
                                <th>Bot ID</th>
                                <th>User</th>
                                <th>WhatsApp</th>
                                <th>Status</th>
                                <th>Settings</th>
                                <th>Last Active</th>
                                <th>Expires</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bots.map(bot => (
                                <tr key={bot.id}>
                                    <td>{bot.name}</td>
                                    <td>{bot.user_email}</td>
                                    <td>{bot.whatsapp_number || 'Not paired'}</td>
                                    <td>
                                        <span className={`status ${bot.session_status}`}>
                                            {bot.session_status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="settings-info">
                                            <span>Typing: {bot.settings?.autoTyping ? 'ON' : 'OFF'}</span>
                                            <span>Recording: {bot.settings?.autoRecording ? 'ON' : 'OFF'}</span>
                                        </div>
                                    </td>
                                    <td>{bot.last_active ? new Date(bot.last_active).toLocaleString() : 'Never'}</td>
                                    <td>{new Date(bot.expires_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
                <div className="payments-content">
                    <table>
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>User</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => (
                                <tr key={payment.id}>
                                    <td>{payment.transaction_id}</td>
                                    <td>{payment.user_email}</td>
                                    <td>${payment.amount}</td>
                                    <td>
                                        <span className={`status ${payment.status}`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td>{new Date(payment.created_at).toLocaleString()}</td>
                                    <td>{payment.payhero_ref || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminPage;
