// web-platform/backend/src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Bot Hosting API URL
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3002';
const BOT_API_KEY = process.env.BOT_API_KEY;

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user exists
        const result = await pool.query(
            'SELECT id, role FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        req.user = result.rows[0];
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const authenticateAdmin = async (req, res, next) => {
    await authenticate(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};

// Routes

// 1. Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, phone } = req.body;
        
        // Validate
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Check if user exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, phone, password_hash) 
             VALUES ($1, $2, $3) 
             RETURNING id, email, phone, role, created_at`,
            [email, phone, hashedPassword]
        );
        
        // Create JWT
        const token = jwt.sign(
            { userId: result.rows[0].id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        
        res.json({
            user: result.rows[0],
            token
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create JWT
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        
        // Remove password hash from response
        delete user.password_hash;
        
        res.json({
            user,
            token
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// 2. Payment Routes (PayHero Integration)
app.post('/api/payments/create', authenticate, async (req, res) => {
    try {
        const { amount, plan } = req.body;
        
        // In production, integrate with PayHero API
        // This is a mock implementation
        const transactionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create payment record
        await pool.query(
            `INSERT INTO payments (user_id, amount, transaction_id, status) 
             VALUES ($1, $2, $3, 'pending')`,
            [req.user.id, amount, transactionId]
        );
        
        // Mock PayHero response
        const checkoutUrl = `${process.env.FRONTEND_URL}/payment-success?transaction=${transactionId}`;
        
        res.json({
            success: true,
            transactionId,
            checkoutUrl,
            message: 'Payment initialized'
        });
        
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: 'Payment failed' });
    }
});

// PayHero webhook
app.post('/api/webhook/payhero', async (req, res) => {
    try {
        const { event, data } = req.body;
        
        if (event === 'payment.success') {
            const { transaction_id, customer_email } = data;
            
            // Find payment
            const paymentResult = await pool.query(
                'SELECT * FROM payments WHERE transaction_id = $1',
                [transaction_id]
            );
            
            if (paymentResult.rows.length > 0) {
                const payment = paymentResult.rows[0];
                
                // Update payment status
                await pool.query(
                    "UPDATE payments SET status = 'completed', payhero_ref = $1 WHERE id = $2",
                    [data.reference || transaction_id, payment.id]
                );
                
                // Extend user subscription (30 days)
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);
                
                await pool.query(
                    "UPDATE users SET subscription_ends = $1 WHERE id = $2",
                    [expiresAt, payment.user_id]
                );
                
                console.log(`✅ Payment completed for user ${payment.user_id}`);
            }
        }
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// 3. Bot Management Routes
app.post('/api/bots/create', authenticate, async (req, res) => {
    try {
        const { name } = req.body;
        
        // Check user subscription
        const userResult = await pool.query(
            "SELECT subscription_ends FROM users WHERE id = $1",
            [req.user.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const subscriptionEnds = userResult.rows[0].subscription_ends;
        if (!subscriptionEnds || new Date(subscriptionEnds) < new Date()) {
            return res.status(402).json({ error: 'Subscription required' });
        }
        
        // Check max bots per user (limit to 3 for example)
        const botCountResult = await pool.query(
            "SELECT COUNT(*) FROM bots WHERE user_id = $1",
            [req.user.id]
        );
        
        if (parseInt(botCountResult.rows[0].count) >= 3) {
            return res.status(400).json({ error: 'Maximum 3 bots allowed per user' });
        }
        
        // Create bot record
        const botResult = await pool.query(
            `INSERT INTO bots (user_id, name, expires_at) 
             VALUES ($1, $2, $3) 
             RETURNING id, name, session_status, created_at`,
            [req.user.id, name || 'My Bot', subscriptionEnds]
        );
        
        // Trigger bot hosting to create session
        try {
            await axios.post(`${BOT_API_URL}/api/bot/create`, {
                botId: botResult.rows[0].id,
                userId: req.user.id
            }, {
                headers: { 'Authorization': `Bearer ${BOT_API_KEY}` }
            });
        } catch (botError) {
            console.error('Bot creation error:', botError);
            // Continue anyway, bot will be created when needed
        }
        
        res.json({
            success: true,
            bot: botResult.rows[0],
            message: 'Bot created successfully'
        });
        
    } catch (error) {
        console.error('Create bot error:', error);
        res.status(500).json({ error: 'Failed to create bot' });
    }
});

// Add this route for bot creation
app.post('/api/bots/:id/create-session', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Call bot hosting API
    const botResponse = await axios.post(`${process.env.BOT_API_URL}/api/bot/create`, {
      botId: id,
      userId: req.user.id
    }, {
      headers: { 'Authorization': `Bearer ${process.env.BOT_API_KEY}` }
    });
    
    res.json(botResponse.data);
  } catch (error) {
    console.error('Bot session creation error:', error);
    res.status(500).json({ error: 'Failed to create bot session' });
  }
});

app.post('/api/bots/:id/pair', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number required' });
        }
        
        // Validate bot ownership
        const botResult = await pool.query(
            "SELECT * FROM bots WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );
        
        if (botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        // Call bot hosting API to generate pairing code
        const response = await axios.post(`${BOT_API_URL}/api/pair`, {
            botId: id,
            phoneNumber
        }, {
            headers: { 'Authorization': `Bearer ${BOT_API_KEY}` }
        });
        
        if (response.data.success) {
            // Update bot status
            await pool.query(
                "UPDATE bots SET session_status = 'pending', whatsapp_number = $1 WHERE id = $2",
                [phoneNumber, id]
            );
        }
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Pairing error:', error);
        res.status(500).json({ error: 'Failed to generate pairing code' });
    }
});

app.get('/api/bots', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, whatsapp_number, session_status, settings, last_active, created_at, expires_at FROM bots WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        
        // Get status from bot hosting for each bot
        const botsWithStatus = await Promise.all(
            result.rows.map(async (bot) => {
                try {
                    const statusResponse = await axios.get(`${BOT_API_URL}/api/bot/${bot.id}/status`, {
                        headers: { 'Authorization': `Bearer ${BOT_API_KEY}` }
                    });
                    
                    return {
                        ...bot,
                        runtimeStatus: statusResponse.data.status
                    };
                } catch (error) {
                    return {
                        ...bot,
                        runtimeStatus: 'offline'
                    };
                }
            })
        );
        
        res.json(botsWithStatus);
        
    } catch (error) {
        console.error('Get bots error:', error);
        res.status(500).json({ error: 'Failed to fetch bots' });
    }
});

app.delete('/api/bots/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify ownership
        const botResult = await pool.query(
            "SELECT id FROM bots WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );
        
        if (botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        // Stop bot on hosting
        try {
            await axios.post(`${BOT_API_URL}/api/bot/${id}/stop`, {}, {
                headers: { 'Authorization': `Bearer ${BOT_API_KEY}` }
            });
        } catch (error) {
            console.error('Stop bot error:', error);
        }
        
        // Delete from database
        await pool.query("DELETE FROM bots WHERE id = $1", [id]);
        
        res.json({ success: true, message: 'Bot deleted successfully' });
        
    } catch (error) {
        console.error('Delete bot error:', error);
        res.status(500).json({ error: 'Failed to delete bot' });
    }
});

// 4. Admin Routes
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const result = await pool.query(
            `SELECT 
                u.id, u.email, u.phone, u.role, u.status, 
                u.subscription_ends, u.created_at,
                COUNT(b.id) as bot_count,
                SUM(CASE WHEN b.session_status = 'online' THEN 1 ELSE 0 END) as online_bots
             FROM users u
             LEFT JOIN bots b ON u.id = b.user_id
             GROUP BY u.id
             ORDER BY u.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        
        const totalResult = await pool.query("SELECT COUNT(*) FROM users");
        
        res.json({
            users: result.rows,
            pagination: {
                page,
                limit,
                total: parseInt(totalResult.rows[0].count),
                pages: Math.ceil(totalResult.rows[0].count / limit)
            }
        });
        
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/admin/bots', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                b.*,
                u.email as user_email,
                u.phone as user_phone
             FROM bots b
             JOIN users u ON b.user_id = u.id
             ORDER BY b.created_at DESC`
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Admin bots error:', error);
        res.status(500).json({ error: 'Failed to fetch bots' });
    }
});

app.get('/api/admin/payments', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                p.*,
                u.email as user_email
             FROM payments p
             JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC`
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Admin payments error:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

app.post('/api/admin/extend-subscription', authenticateAdmin, async (req, res) => {
    try {
        const { userId, days } = req.body;
        
        if (!userId || !days) {
            return res.status(400).json({ error: 'User ID and days required' });
        }
        
        const userResult = await pool.query(
            "SELECT subscription_ends FROM users WHERE id = $1",
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        let newEndDate;
        const currentEnd = userResult.rows[0].subscription_ends;
        
        if (currentEnd) {
            newEndDate = new Date(currentEnd);
            newEndDate.setDate(newEndDate.getDate() + parseInt(days));
        } else {
            newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + parseInt(days));
        }
        
        await pool.query(
            "UPDATE users SET subscription_ends = $1 WHERE id = $2",
            [newEndDate, userId]
        );
        
        // Also update bot expiration
        await pool.query(
            "UPDATE bots SET expires_at = $1 WHERE user_id = $2",
            [newEndDate, userId]
        );
        
        res.json({
            success: true,
            message: `Subscription extended by ${days} days`,
            newEndDate
        });
        
    } catch (error) {
        console.error('Extend subscription error:', error);
        res.status(500).json({ error: 'Failed to extend subscription' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'bot-platform-backend'
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Web backend running on port ${PORT}`);
});

