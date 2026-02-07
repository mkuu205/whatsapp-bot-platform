
// web-platform/backend/src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

app.set("trust proxy", 1);
const app = express();

// Create temp directory for PDF receipts
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://whatsapp-bot-platform-frontend.onrender.com',
    credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api/', limiter);

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Supabase client for authentication
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Bot Hosting API URL
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3002';
const BOT_API_KEY = process.env.BOT_API_KEY;

// PayHero credentials
const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY;
const PAYHERO_MERCHANT_ID = process.env.PAYHERO_MERCHANT_ID;
const PAYHERO_WEBHOOK_SECRET = process.env.PAYHERO_WEBHOOK_SECRET;

// ==================== AUTHENTICATION MIDDLEWARE ====================

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            console.error('Supabase auth error:', error);
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        // Get user profile from our database
        const result = await pool.query(
            `SELECT u.*, 
                s.id as subscription_id, s.plan, s.plan_name, s.status as subscription_status,
                s.expires_at, s.is_active, s.created_at as subscription_created
             FROM users u
             LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
             WHERE u.id = $1`,
            [user.id]
        );
        
        if (result.rows.length === 0) {
            // User exists in Supabase but not in our database
            // Don't create automatically - user must complete registration
            return res.status(404).json({ 
                error: 'User profile not found. Please complete registration.',
                requires_registration: true 
            });
        }
        
        req.user = {
            id: result.rows[0].id,
            email: result.rows[0].email,
            phone: result.rows[0].phone,
            role: result.rows[0].role,
            status: result.rows[0].status,
            created_at: result.rows[0].created_at,
            subscription: result.rows[0].subscription_id ? {
                id: result.rows[0].subscription_id,
                plan: result.rows[0].plan,
                plan_name: result.rows[0].plan_name,
                status: result.rows[0].subscription_status,
                expires_at: result.rows[0].expires_at,
                is_active: result.rows[0].is_active
            } : null
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
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

// ==================== AUTHENTICATION ROUTES ====================

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        // Get user with subscription and bot count
        const result = await pool.query(
            `SELECT 
                u.*,
                s.plan, s.plan_name, s.status as subscription_status, s.expires_at,
                s.is_active as subscription_active, s.created_at as subscription_created,
                COUNT(b.id) as bot_count,
                COUNT(CASE WHEN b.session_status = 'online' THEN 1 END) as online_bots
             FROM users u
             LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
             LEFT JOIN bots b ON u.id = b.user_id
             WHERE u.id = $1
             GROUP BY u.id, s.id`,
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userData = result.rows[0];
        
        // Clean up response
        delete userData.password_hash;
        
        res.json({
            id: userData.id,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            status: userData.status,
            created_at: userData.created_at,
            subscription: userData.subscription_active ? {
                plan: userData.plan,
                plan_name: userData.plan_name,
                status: userData.subscription_status,
                expires_at: userData.expires_at,
                is_active: userData.subscription_active,
                days_remaining: userData.expires_at ? 
                    Math.ceil((new Date(userData.expires_at) - new Date()) / (1000 * 60 * 60 * 24)) : 0
            } : null,
            bot_count: parseInt(userData.bot_count) || 0,
            online_bots: parseInt(userData.online_bots) || 0
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// Check if user exists and create profile if needed
app.post('/api/auth/check-profile', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }
        
        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        // Check if user exists in our database
        const result = await pool.query(
            "SELECT id, email, phone, role, status, created_at FROM users WHERE id = $1",
            [user.id]
        );
        
        if (result.rows.length === 0) {
            // User doesn't exist - create profile
            await pool.query(
                `INSERT INTO users (id, email, phone, role, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [user.id, user.email, user.phone || null, 'user', 'active']
            );
            
            return res.json({
                success: true,
                user_created: true,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone || null,
                    role: 'user',
                    status: 'active'
                }
            });
        }
        
        // User exists
        const userData = result.rows[0];
        
        res.json({
            success: true,
            user_created: false,
            user: userData
        });
        
    } catch (error) {
        console.error('Check profile error:', error);
        res.status(500).json({ error: 'Failed to check user profile' });
    }
});

// Register user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, phone, name } = req.body;
        
        // Validate
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Register with Supabase
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            phone,
            options: {
                data: {
                    name: name || email.split('@')[0],
                    phone: phone
                }
            }
        });
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        // Create user in our database
        await pool.query(
            `INSERT INTO users (id, email, phone, role, status, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [data.user.id, email, phone || null, 'user', 'active']
        );
        
        // Create JWT for immediate login
        const token = jwt.sign(
            { userId: data.user.id },
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            { expiresIn: '30d' }
        );
        
        res.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                phone: data.user.phone,
                role: 'user'
            },
            token
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Login with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check if user exists in our database, create if not
        const result = await pool.query(
            `SELECT u.*,
                s.id as subscription_id, s.plan, s.plan_name, s.status as subscription_status,
                s.expires_at, s.is_active
             FROM users u
             LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
             WHERE u.id = $1`,
            [data.user.id]
        );
        
        let userData;
        
        if (result.rows.length === 0) {
            // Create user if doesn't exist
            await pool.query(
                `INSERT INTO users (id, email, phone, role, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [data.user.id, data.user.email, data.user.phone || null, 'user', 'active']
            );
            
            // Get the newly created user
            const newUserResult = await pool.query(
                `SELECT u.*,
                    s.id as subscription_id, s.plan, s.plan_name, s.status as subscription_status,
                    s.expires_at, s.is_active
                 FROM users u
                 LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
                 WHERE u.id = $1`,
                [data.user.id]
            );
            
            userData = newUserResult.rows[0];
        } else {
            userData = result.rows[0];
        }
        
        // Create JWT
        const token = jwt.sign(
            { userId: data.user.id },
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            { expiresIn: '30d' }
        );
        
        // Clean up response
        delete userData.password_hash;
        
        res.json({
            success: true,
            user: {
                ...userData,
                subscription: userData.subscription_id ? {
                    id: userData.subscription_id,
                    plan: userData.plan,
                    plan_name: userData.plan_name,
                    status: userData.subscription_status,
                    expires_at: userData.expires_at,
                    is_active: userData.is_active
                } : null
            },
            token
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Update user phone
app.put('/api/user/update-phone', authenticate, async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Phone number required' });
        }
        
        await pool.query(
            "UPDATE users SET phone = $1 WHERE id = $2",
            [phone, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Phone number updated'
        });
        
    } catch (error) {
        console.error('Update phone error:', error);
        res.status(500).json({ error: 'Failed to update phone number' });
    }
});

// ==================== PAYMENT & SUBSCRIPTION ROUTES ====================

// Get subscription status (FIXED ROUTE - was missing /api)
app.get('/api/subscription/status', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.*,
                COUNT(b.id) as bot_count
             FROM subscriptions s
             LEFT JOIN bots b ON s.user_id = b.user_id
             WHERE s.user_id = $1 AND s.is_active = true
             GROUP BY s.id`,
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(200).json({ 
                success: true,
                has_subscription: false,
                message: 'No active subscription'
            });
        }
        
        const subscription = result.rows[0];
        const now = new Date();
        const expiresAt = new Date(subscription.expires_at);
        
        res.json({
            success: true,
            has_subscription: true,
            subscription: {
                ...subscription,
                days_remaining: Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))),
                is_expired: expiresAt < now,
                can_create_bots: expiresAt > now && subscription.status === 'active'
            }
        });
    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Failed to check subscription' });
    }
});

// Initiate payment with PayHero
app.post('/api/payments/initiate', authenticate, async (req, res) => {
    try {
        const { plan, amount, currency = 'USD', planName, phoneNumber, botId } = req.body;
        
        // Validate phone number
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        
        // Update user's phone number if provided
        if (phoneNumber) {
            await pool.query(
                "UPDATE users SET phone = $1 WHERE id = $2",
                [phoneNumber, req.user.id]
            );
        }
        
        // Check if user already has active subscription
        const subResult = await pool.query(
            `SELECT id FROM subscriptions 
             WHERE user_id = $1 AND is_active = true AND expires_at > NOW()`,
            [req.user.id]
        );
        
        if (subResult.rows.length > 0) {
            return res.status(400).json({ 
                error: 'You already have an active subscription',
                subscription: subResult.rows[0]
            });
        }
        
        // Create payment record
        const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        const paymentResult = await pool.query(
            `INSERT INTO payments 
                (user_id, reference, amount, currency, plan, plan_name, 
                 phone_number, status, metadata, bot_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
             RETURNING id, reference, created_at`,
            [
                req.user.id, 
                paymentRef, 
                amount, 
                currency, 
                plan, 
                planName || plan,
                phoneNumber,
                JSON.stringify({
                    user_id: req.user.id,
                    user_email: req.user.email,
                    timestamp: new Date().toISOString()
                }),
                botId || null
            ]
        );
        
        // PayHero API call
        const payheroPayload = {
            merchant_id: PAYHERO_MERCHANT_ID,
            amount: amount,
            currency: currency,
            reference: paymentRef,
            customer_email: req.user.email,
            customer_phone: phoneNumber,
            customer_id: req.user.id,
            callback_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payments/webhook`,
            redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?payment=success&ref=${paymentRef}`,
            metadata: {
                user_id: req.user.id,
                user_email: req.user.email,
                user_phone: phoneNumber,
                plan: plan,
                plan_name: planName || plan,
                payment_id: paymentResult.rows[0].id,
                bot_id: botId || null
            }
        };
        
        // Call PayHero API (real integration)
        let payheroResponse;
        try {
            payheroResponse = await axios.post(
                'https://api.payhero.co/v1/checkout/initialize',
                payheroPayload,
                {
                    headers: {
                        'Authorization': `Bearer ${PAYHERO_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            if (!payheroResponse.data.success) {
                throw new Error('PayHero initialization failed: ' + JSON.stringify(payheroResponse.data));
            }
        } catch (apiError) {
            // For development/testing, provide mock response
            console.log('PayHero API not configured, using mock response');
            payheroResponse = {
                data: {
                    success: true,
                    checkout_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?ref=${paymentRef}`,
                    transaction_id: `mock_${Date.now()}`
                }
            };
        }
        
        // Return payment info
        res.json({
            success: true,
            payment_id: paymentResult.rows[0].id,
            reference: paymentRef,
            checkout_url: payheroResponse.data.checkout_url,
            amount: amount,
            currency: currency,
            plan: plan,
            plan_name: planName || plan,
            phone_number: phoneNumber,
            expires_in: 1800, // 30 minutes
            message: 'Payment initialized successfully'
        });
        
    } catch (error) {
        console.error('Payment initiation error:', error);
        
        if (error.response) {
            res.status(400).json({
                error: 'Payment gateway error',
                details: error.response.data.message || 'Payment initialization failed'
            });
        } else if (error.code === 'ECONNREFUSED') {
            res.status(503).json({ error: 'Payment service unavailable' });
        } else {
            res.status(500).json({ 
                error: 'Failed to initiate payment',
                details: error.message 
            });
        }
    }
});

// PayHero webhook handler
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['payhero-signature'];
        const payload = JSON.parse(req.body.toString());
        
        // Verify webhook signature
        if (PAYHERO_WEBHOOK_SECRET) {
            const expectedSignature = crypto
                .createHmac('sha256', PAYHERO_WEBHOOK_SECRET)
                .update(JSON.stringify(payload))
                .digest('hex');
            
            if (signature !== expectedSignature) {
                console.error('Invalid webhook signature');
                return res.status(400).json({ error: 'Invalid signature' });
            }
        }
        
        const { event, data } = payload;
        
        if (event === 'payment.success') {
            const { reference, amount, currency, customer_id, metadata } = data;
            
            // Find payment
            const paymentResult = await pool.query(
                'SELECT * FROM payments WHERE reference = $1',
                [reference]
            );
            
            if (paymentResult.rows.length === 0) {
                console.error(`Payment not found: ${reference}`);
                return res.status(404).json({ error: 'Payment not found' });
            }
            
            const payment = paymentResult.rows[0];
            
            // Update payment status
            await pool.query(
                `UPDATE payments 
                 SET status = 'completed', 
                     payhero_ref = $1,
                     completed_at = NOW(),
                     metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
                 WHERE id = $3`,
                [data.transaction_id || reference, data, payment.id]
            );
            
            // Create or update subscription
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
            
            // Deactivate any existing subscriptions
            await pool.query(
                `UPDATE subscriptions 
                 SET is_active = false 
                 WHERE user_id = $1`,
                [payment.user_id]
            );
            
            // Create new subscription
            const subscriptionResult = await pool.query(
                `INSERT INTO subscriptions 
                    (user_id, plan, plan_name, amount, currency, status, 
                     is_active, expires_at, payment_id, phone_number)
                 VALUES ($1, $2, $3, $4, $5, 'active', true, $6, $7, $8)
                 RETURNING id`,
                [
                    payment.user_id, 
                    payment.plan, 
                    payment.plan_name,
                    amount, 
                    currency, 
                    expiresAt, 
                    payment.id,
                    payment.phone_number
                ]
            );
            
            console.log(`✅ Payment completed for user ${payment.user_id}`);
            
            // Activate any pending bots for this user
            try {
                const botsResult = await pool.query(
                    "SELECT id FROM bots WHERE user_id = $1 AND session_status IN ('created', 'pending')",
                    [payment.user_id]
                );
                
                for (const bot of botsResult.rows) {
                    await pool.query(
                        "UPDATE bots SET expires_at = $1 WHERE id = $2",
                        [expiresAt, bot.id]
                    );
                }
                
                // Notify bot runner about activated subscription
                try {
                    await axios.post(`${BOT_API_URL}/api/activate-user`, {
                        userId: payment.user_id
                    }, {
                        headers: { 'Authorization': `Bearer ${BOT_API_KEY}` }
                    });
                } catch (botError) {
                    console.error('Bot activation error:', botError.message);
                }
            } catch (error) {
                console.error('Bot activation error:', error);
            }
        }
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Get payment history
app.get('/api/payments/history', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                p.id,
                p.reference,
                p.amount,
                p.currency,
                p.plan,
                p.plan_name,
                p.status,
                p.created_at,
                p.completed_at,
                p.payhero_ref,
                s.expires_at as subscription_expires
             FROM payments p
             LEFT JOIN subscriptions s ON p.id = s.payment_id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

// Generate receipt PDF
app.get('/api/payments/:paymentId/receipt', authenticate, async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        // Fetch payment details
        const paymentResult = await pool.query(
            `SELECT 
                p.*,
                u.email as user_email,
                u.phone as user_phone,
                s.plan as subscription_plan,
                s.plan_name as subscription_plan_name,
                s.expires_at as subscription_expires
             FROM payments p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN subscriptions s ON p.id = s.payment_id
             WHERE p.id = $1 AND p.user_id = $2`,
            [paymentId, req.user.id]
        );
        
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const payment = paymentResult.rows[0];
        
        // Generate PDF receipt
        const doc = new PDFDocument({ margin: 50 });
        const fileName = `receipt_${paymentId}_${Date.now()}.pdf`;
        const filePath = path.join(tempDir, fileName);
        
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);
        
        // Receipt Header
        doc.fontSize(24)
           .fillColor('#6366f1')
           .text('PAYMENT RECEIPT', { align: 'center' })
           .moveDown();
        
        // Company Info
        doc.fontSize(10)
           .fillColor('#666666')
           .text('WhatsApp Bot Platform', { align: 'center' })
           .text('support@whatsappbot.com | +254 700 000 000', { align: 'center' })
           .moveDown();
        
        // Receipt Details Box
        doc.rect(50, 120, 500, 220).stroke('#dddddd');
        
        // Left Column
        doc.fontSize(12)
           .fillColor('#000000')
           .text('Receipt Number:', 60, 140)
           .fillColor('#666666')
           .text(payment.reference, 200, 140)
           
           .fillColor('#000000')
           .text('Date:', 60, 160)
           .fillColor('#666666')
           .text(new Date(payment.created_at).toLocaleDateString(), 200, 160)
           
           .fillColor('#000000')
           .text('Status:', 60, 180)
           .fillColor(payment.status === 'completed' ? '#10b981' : '#f59e0b')
           .text(payment.status.toUpperCase(), 200, 180)
           
           .fillColor('#000000')
           .text('Customer Email:', 60, 200)
           .fillColor('#666666')
           .text(payment.user_email, 200, 200)
           
           .fillColor('#000000')
           .text('Customer Phone:', 60, 220)
           .fillColor('#666666')
           .text(payment.user_phone || 'Not provided', 200, 220)
           
           .fillColor('#000000')
           .text('Transaction ID:', 60, 240)
           .fillColor('#666666')
           .text(payment.payhero_ref || payment.reference, 200, 240);
        
        // Right Column
        doc.fillColor('#000000')
           .text('Plan Name:', 300, 140)
           .fillColor('#666666')
           .text(payment.plan_name || payment.plan, 420, 140)
           
           .fillColor('#000000')
           .text('Amount:', 300, 160)
           .fillColor('#666666')
           .text(`$${payment.amount} ${payment.currency}`, 420, 160)
           
           .fillColor('#000000')
           .text('Payment Method:', 300, 180)
           .fillColor('#666666')
           .text('PayHero', 420, 180)
           
           .fillColor('#000000')
           .text('Payment Date:', 300, 200)
           .fillColor('#666666')
           .text(new Date(payment.completed_at || payment.created_at).toLocaleDateString(), 420, 200)
           
           .fillColor('#000000')
           .text('Subscription Expires:', 300, 220)
           .fillColor('#666666')
           .text(payment.subscription_expires ? 
                new Date(payment.subscription_expires).toLocaleDateString() : 
                'N/A', 420, 220);
        
        // Total Amount
        doc.moveTo(50, 280).lineTo(550, 280).stroke('#6366f1');
        
        doc.fontSize(18)
           .fillColor('#000000')
           .text('TOTAL PAID:', 300, 300)
           .fillColor('#6366f1')
           .fontSize(24)
           .text(`$${payment.amount} ${payment.currency}`, 450, 300, { align: 'right' });
        
        // Terms and Conditions
        doc.moveDown(3)
           .fontSize(10)
           .fillColor('#666666')
           .text('Terms & Conditions:', { underline: true })
           .moveDown(0.5)
           .text('1. This is an official receipt for payment made to WhatsApp Bot Platform.')
           .text('2. Subscription automatically renews unless cancelled.')
           .text('3. 30-day money-back guarantee applies.')
           .text('4. For any queries, contact support@whatsappbot.com');
        
        // Thank you message
        doc.moveDown(2)
           .fontSize(14)
           .fillColor('#6366f1')
           .text('Thank you for your purchase!', { align: 'center' });
        
        doc.end();
        
        writeStream.on('finish', () => {
            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Receipt_${payment.reference}.pdf"`);
            
            // Stream the PDF file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
            // Clean up after streaming
            fileStream.on('end', () => {
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting temp file:', err);
                });
            });
        });
        
    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).json({ error: 'Failed to generate receipt' });
    }
});

// Verify payment
app.get('/api/payments/:paymentId/verify', authenticate, async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        const result = await pool.query(
            `SELECT 
                p.*,
                u.email as user_email,
                s.expires_at as subscription_expires,
                s.plan as subscription_plan
             FROM payments p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN subscriptions s ON p.id = s.payment_id
             WHERE p.id = $1 AND p.user_id = $2`,
            [paymentId, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// ==================== BOT MANAGEMENT ROUTES ====================

// Create new bot
app.post('/api/bots/create', authenticate, async (req, res) => {
    try {
        const { name, phoneNumber, settings } = req.body;
        
        // Check if user has active subscription
        const subResult = await pool.query(
            `SELECT expires_at FROM subscriptions 
             WHERE user_id = $1 AND is_active = true AND expires_at > NOW()`,
            [req.user.id]
        );
        
        if (subResult.rows.length === 0) {
            return res.status(402).json({ 
                success: false,
                error: 'Active subscription required',
                code: 'SUBSCRIPTION_REQUIRED',
                redirect: '/payment'
            });
        }
        
        const subscriptionEnds = subResult.rows[0].expires_at;
        
        // Check bot limit
        const botCountResult = await pool.query(
            "SELECT COUNT(*) FROM bots WHERE user_id = $1",
            [req.user.id]
        );
        
        const botCount = parseInt(botCountResult.rows[0].count);
        const maxBots = req.user.role === 'admin' ? 50 : 
                       req.user.subscription?.plan === 'business' ? 10 :
                       req.user.subscription?.plan === 'pro' ? 3 : 1;
        
        if (botCount >= maxBots) {
            return res.status(400).json({ 
                success: false,
                error: `Maximum ${maxBots} bots allowed. Upgrade plan for more.`,
                upgrade_url: '/payment'
            });
        }
        
        // Create bot record
        const botResult = await pool.query(
            `INSERT INTO bots 
                (user_id, name, whatsapp_number, settings, expires_at, session_status) 
             VALUES ($1, $2, $3, $4, $5, 'created')
             RETURNING id, name, whatsapp_number, session_status, created_at`,
            [
                req.user.id, 
                name || 'My WhatsApp Bot', 
                phoneNumber,
                settings || {},
                subscriptionEnds
            ]
        );
        
        const bot = botResult.rows[0];
        
        // Initialize bot on bot runner
        try {
            await axios.post(`${BOT_API_URL}/api/bot/initialize`, {
                botId: bot.id,
                userId: req.user.id,
                name: bot.name
            }, {
                headers: { 'Authorization': `Bearer ${BOT_API_KEY}` }
            });
        } catch (botError) {
            console.warn('Bot runner initialization error:', botError.message);
            // Continue anyway
        }
        
        res.json({
            success: true,
            bot: bot,
            next_steps: [
                { step: 'payment', required: false, completed: true },
                { step: 'pair_device', required: true, completed: false },
                { step: 'upload_creds', required: true, completed: false },
                { step: 'deploy', required: true, completed: false }
            ]
        });
        
    } catch (error) {
        console.error('Create bot error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create bot' 
        });
    }
});

// Get all user bots
app.get('/api/bots', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                id, name, whatsapp_number, session_status, 
                settings, last_active, created_at, expires_at,
                pairing_code, pairing_qr, runner_instance_id
             FROM bots 
             WHERE user_id = $1 
             ORDER BY 
                 CASE 
                     WHEN session_status = 'online' THEN 1
                     WHEN session_status = 'pairing' THEN 2
                     WHEN session_status = 'creds_uploaded' THEN 3
                     WHEN session_status = 'deploying' THEN 4
                     WHEN session_status = 'created' THEN 5
                     ELSE 6
                 END,
                 created_at DESC`,
            [req.user.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get bots error:', error);
        res.status(500).json({ error: 'Failed to fetch bots' });
    }
});

// Get single bot details
app.get('/api/bots/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                b.*,
                u.email as user_email,
                s.plan as subscription_plan,
                s.expires_at as subscription_ends
             FROM bots b
             JOIN users u ON b.user_id = u.id
             LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
             WHERE b.id = $1 AND (b.user_id = $2 OR $3 = 'admin')`,
            [id, req.user.id, req.user.role]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        const bot = result.rows[0];
        
        // Get runtime status from bot runner
        try {
            const statusResponse = await axios.get(
                `${BOT_API_URL}/api/bot/${id}/status`,
                { headers: { 'Authorization': `Bearer ${BOT_API_KEY}` } }
            );
            
            bot.runtime_status = statusResponse.data;
        } catch (error) {
            bot.runtime_status = { status: 'offline', error: 'Cannot connect to bot runner' };
        }
        
        res.json(bot);
    } catch (error) {
        console.error('Get bot error:', error);
        res.status(500).json({ error: 'Failed to fetch bot' });
    }
});

// Pair bot with WhatsApp
app.post('/api/bots/:id/pair', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate bot ownership
        const botResult = await pool.query(
            `SELECT b.*, s.is_active as subscription_active
             FROM bots b
             LEFT JOIN subscriptions s ON b.user_id = s.user_id AND s.is_active = true
             WHERE b.id = $1 AND b.user_id = $2`,
            [id, req.user.id]
        );
        
        if (botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        const bot = botResult.rows[0];
        
        // Check subscription
        if (!bot.subscription_active) {
            return res.status(402).json({ 
                error: 'Active subscription required to pair bot' 
            });
        }
        
        // Call bot runner for pairing
        const pairResponse = await axios.post(`${BOT_API_URL}/api/bot/pair`, {
            botId: id,
            userId: req.user.id,
            phoneNumber: bot.whatsapp_number
        }, {
            headers: { 'Authorization': `Bearer ${BOT_API_KEY}` },
            timeout: 15000
        });
        
        if (pairResponse.data.success) {
            // Update bot status
            await pool.query(
                `UPDATE bots 
                 SET session_status = 'pairing',
                     pairing_code = $1,
                     pairing_qr = $2,
                     pairing_started = NOW()
                 WHERE id = $3`,
                [
                    pairResponse.data.pairing_code,
                    pairResponse.data.qr_code || pairResponse.data.qr_data,
                    id
                ]
            );
            
            res.json({
                success: true,
                pairing_code: pairResponse.data.pairing_code,
                qr_code: pairResponse.data.qr_code || pairResponse.data.qr_data,
                message: 'Scan QR code with WhatsApp to link your device',
                expires_in: 120,
                next_step: 'upload_creds'
            });
        } else {
            res.status(400).json(pairResponse.data);
        }
        
    } catch (error) {
        console.error('Pairing error:', error);
        
        // Update bot status
        await pool.query(
            "UPDATE bots SET session_status = 'pairing_failed' WHERE id = $1",
            [req.params.id]
        );
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            res.status(503).json({ 
                success: false,
                error: 'Bot runner service unavailable' 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Failed to generate pairing code' 
            });
        }
    }
});

// Upload credentials
app.post('/api/bots/:id/credentials', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { credentials, password } = req.body;
        
        if (!credentials) {
            return res.status(400).json({ error: 'Credentials required' });
        }
        
        // Validate bot ownership
        const botResult = await pool.query(
            "SELECT id FROM bots WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );
        
        if (botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        // Validate credentials JSON
        let credsData;
        try {
            credsData = typeof credentials === 'string' 
                ? JSON.parse(credentials) 
                : credentials;
            
            // Basic WhatsApp credentials validation
            if (!credsData.clientId || !credsData.serverToken || !credsData.clientToken) {
                return res.status(400).json({ 
                    error: 'Invalid credentials format. Missing required fields.' 
                });
            }
        } catch (parseError) {
            return res.status(400).json({ 
                error: 'Invalid JSON format in credentials' 
            });
        }
        
        // Encrypt and store credentials
        const encryptedCreds = encryptCredentials(credsData, process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production');
        
        await pool.query(
            `UPDATE bots 
             SET credentials_encrypted = $1,
                 credentials_password = $2,
                 creds_uploaded_at = NOW(),
                 session_status = 'creds_uploaded'
             WHERE id = $3`,
            [encryptedCreds, password || null, id]
        );
        
        // Notify bot runner
        try {
            await axios.post(`${BOT_API_URL}/api/bot/${id}/credentials-ready`, {
                botId: id,
                userId: req.user.id
            }, {
                headers: { 'Authorization': `Bearer ${BOT_API_KEY}` }
            });
        } catch (notifyError) {
            console.warn('Failed to notify bot runner:', notifyError.message);
        }
        
        res.json({
            success: true,
            message: 'Credentials stored securely'
        });
        
    } catch (error) {
        console.error('Store credentials error:', error);
        res.status(500).json({ error: 'Failed to store credentials' });
    }
});

// Deploy bot
app.post('/api/bots/:id/deploy', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify bot ownership and credentials
        const botResult = await pool.query(
            `SELECT b.*, s.is_active as subscription_active
             FROM bots b
             LEFT JOIN subscriptions s ON b.user_id = s.user_id AND s.is_active = true
             WHERE b.id = $1 AND b.user_id = $2`,
            [id, req.user.id]
        );
        
        if (botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        const bot = botResult.rows[0];
        
        // Check subscription
        if (!bot.subscription_active) {
            return res.status(402).json({ 
                error: 'Active subscription required to deploy bot' 
            });
        }
        
        // Check if credentials are uploaded
        if (!bot.credentials_encrypted || bot.session_status !== 'creds_uploaded') {
            return res.status(400).json({ 
                error: 'Please upload credentials first before deployment' 
            });
        }
        
        // Update bot status to deploying
        await pool.query(
            "UPDATE bots SET session_status = 'deploying' WHERE id = $1",
            [id]
        );
        
        // Call bot runner to deploy
        const deployResponse = await axios.post(`${BOT_API_URL}/api/bot/deploy`, {
            botId: id,
            userId: req.user.id,
            phoneNumber: bot.whatsapp_number
        }, {
            headers: { 
                'Authorization': `Bearer ${BOT_API_KEY}` 
            },
            timeout: 60000
        });
        
        if (deployResponse.data.success) {
            // Update bot status
            await pool.query(
                `UPDATE bots 
                 SET session_status = 'deployed',
                     deployed_at = NOW(),
                     runner_instance_id = $1
                 WHERE id = $2`,
                [deployResponse.data.instanceId || null, id]
            );
            
            res.json({
                success: true,
                message: 'Bot deployed successfully',
                instance_id: deployResponse.data.instanceId,
                status_url: `/api/bots/${id}/deployment-status`
            });
        } else {
            // Deployment failed
            await pool.query(
                "UPDATE bots SET session_status = 'deploy_failed' WHERE id = $1",
                [id]
            );
            
            res.status(500).json({
                success: false,
                error: 'Deployment failed',
                details: deployResponse.data.error
            });
        }
        
    } catch (error) {
        console.error('Deploy error:', error);
        
        // Update bot status
        await pool.query(
            "UPDATE bots SET session_status = 'deploy_failed' WHERE id = $1",
            [req.params.id]
        );
        
        if (error.response) {
            res.status(error.response.status).json({
                success: false,
                error: 'Deployment failed',
                details: error.response.data
            });
        } else if (error.code === 'ECONNREFUSED') {
            res.status(503).json({ 
                success: false,
                error: 'Bot runner service unavailable' 
            });
        } else if (error.code === 'ETIMEDOUT') {
            res.status(504).json({ 
                success: false,
                error: 'Deployment timeout' 
            });
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Deployment failed unexpectedly' 
            });
        }
    }
});

// Bot runner retrieves credentials
app.get('/api/bots/:id/credentials', async (req, res) => {
    try {
        const { id } = req.params;
        const apiKey = req.headers['authorization']?.replace('Bearer ', '');
        
        // Verify API key
        if (apiKey !== BOT_API_KEY) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        // Get encrypted credentials
        const result = await pool.query(
            `SELECT 
                credentials_encrypted,
                credentials_password,
                session_status
             FROM bots WHERE id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        const bot = result.rows[0];
        
        if (!bot.credentials_encrypted) {
            return res.status(404).json({ error: 'Credentials not uploaded' });
        }
        
        // Decrypt credentials
        const decryptedCreds = decryptCredentials(
            bot.credentials_encrypted, 
            process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production'
        );
        
        res.json({
            success: true,
            credentials: decryptedCreds,
            requires_password: !!bot.credentials_password,
            status: bot.session_status
        });
        
    } catch (error) {
        console.error('Get credentials error:', error);
        res.status(500).json({ error: 'Failed to retrieve credentials' });
    }
});

// Bot runner updates deployment status
app.post('/api/bots/:id/deployment-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, instanceId, error, qrCode } = req.body;
        const apiKey = req.headers['authorization']?.replace('Bearer ', '');
        
        if (apiKey !== BOT_API_KEY) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        // Update bot status based on bot runner feedback
        let dbStatus = status;
        if (status === 'qr_required') {
            dbStatus = 'pairing';
        } else if (status === 'authenticated') {
            dbStatus = 'online';
        } else if (status === 'failed') {
            dbStatus = 'deploy_failed';
        }
        
        await pool.query(
            `UPDATE bots 
             SET session_status = $1,
                 runner_instance_id = $2,
                 last_active = NOW(),
                 pairing_qr = $3
             WHERE id = $4`,
            [dbStatus, instanceId, qrCode, id]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Deployment status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Delete bot
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
        
        // Stop bot on runner
        try {
            await axios.post(`${BOT_API_URL}/api/bot/${id}/stop`, {}, {
                headers: { 'Authorization': `Bearer ${BOT_API_KEY}` },
                timeout: 10000
            });
            
            // Delete from runner
            await axios.delete(`${BOT_API_URL}/api/bot/${id}`, {
                headers: { 'Authorization': `Bearer ${BOT_API_KEY}` }
            });
        } catch (runnerError) {
            console.warn('Bot runner cleanup failed:', runnerError.message);
        }
        
        // Delete from database
        await pool.query("DELETE FROM bots WHERE id = $1", [id]);
        
        res.json({ 
            success: true, 
            message: 'Bot deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete bot error:', error);
        res.status(500).json({ error: 'Failed to delete bot' });
    }
});

// Bot action proxy (start, stop, restart, send)
app.post('/api/bots/:id/action/:action', authenticate, async (req, res) => {
    try {
        const { id, action } = req.params;
        const validActions = ['start', 'stop', 'restart', 'status', 'send'];
        
        if (!validActions.includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }
        
        // Verify bot ownership
        const botResult = await pool.query(
            "SELECT id FROM bots WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );
        
        if (botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        // Proxy to bot runner
        const botResponse = await axios.post(
            `${BOT_API_URL}/api/bot/${id}/${action}`,
            req.body,
            {
                headers: { 
                    'Authorization': `Bearer ${BOT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Update local status if action is start/stop
        if (action === 'start' || action === 'stop') {
            const newStatus = action === 'start' ? 'online' : 'offline';
            await pool.query(
                "UPDATE bots SET session_status = $1 WHERE id = $2",
                [newStatus, id]
            );
        }
        
        res.json(botResponse.data);
    } catch (error) {
        console.error('Bot action error:', error);
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: `Failed to ${action} bot` });
        }
    }
});

// ==================== ENCRYPTION FUNCTIONS ====================

const encryptCredentials = (data, key) => {
    const cipher = crypto.createCipher('aes-256-gcm', key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const decryptCredentials = (encrypted, key) => {
    try {
        const decipher = crypto.createDecipher('aes-256-gcm', key);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (error) {
        throw new Error('Failed to decrypt credentials');
    }
};

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const result = await pool.query(
            `SELECT 
                u.id, u.email, u.phone, u.role, u.status, 
                u.created_at,
                s.expires_at as subscription_ends,
                COUNT(b.id) as bot_count,
                SUM(CASE WHEN b.session_status = 'online' THEN 1 ELSE 0 END) as online_bots
             FROM users u
             LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
             LEFT JOIN bots b ON u.id = b.user_id
             GROUP BY u.id, s.expires_at
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

// ==================== HEALTH CHECK ====================

app.get('/health', async (req, res) => {
    try {
        // Test database connection
        await pool.query('SELECT 1');
        
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            service: 'bot-platform-backend',
            version: '1.0.0'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            error: error.message 
        });
    }
});

// Add a route for the frontend to check if API is accessible
app.get('/api/status', async (req, res) => {
    res.json({
        status: 'online',
        service: 'whatsapp-bot-platform-backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🤖 Bot Runner URL: ${BOT_API_URL}`);
});

