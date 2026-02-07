// web-platform/backend/src/server.js - COMPLETE FIXED VERSION
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

const app = express();

// Create temp directory for PDF receipts
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// ==================== DATABASE CONNECTION ====================
let pool;
let dbConnected = false;

try {
    console.log('🔧 Initializing database connection...');
    console.log('Database URL exists:', !!process.env.DATABASE_URL);
    
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    console.log('✅ Database pool created');
} catch (error) {
    console.error('❌ Database pool creation failed:', error.message);
    console.log('⚠️ Running in mock mode - database operations will be simulated');
}

// Test database connection
const testDatabase = async () => {
    if (!pool) {
        console.log('⚠️ No database pool available');
        return false;
    }
    
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Initialize database connection
(async () => {
    dbConnected = await testDatabase();
})();

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet());
app.use(cors({
    origin: [
        'https://whatsapp-bot-platform-frontend.onrender.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://whatsapp-bot-platform-q8tv.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ==================== SUPABASE CLIENT ====================
let supabase;
try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        console.log('✅ Supabase client initialized');
    } else {
        console.log('⚠️ Supabase credentials not found - using mock auth');
    }
} catch (error) {
    console.error('❌ Supabase initialization failed:', error.message);
}

// ==================== API CONFIGURATION ====================
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3002';
const BOT_API_KEY = process.env.BOT_API_KEY || 'test-api-key';

// PayHero credentials (optional for testing)
const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY;
const PAYHERO_MERCHANT_ID = process.env.PAYHERO_MERCHANT_ID;
const PAYHERO_WEBHOOK_SECRET = process.env.PAYHERO_WEBHOOK_SECRET;

console.log('🔧 Environment check:');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('- BACKEND_URL:', process.env.BACKEND_URL || 'http://localhost:3001');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Database connected:', dbConnected);
console.log('- Supabase initialized:', !!supabase);

// ==================== ENCRYPTION FUNCTIONS ====================
const encryptCredentials = (data, key) => {
    try {
        const cipher = crypto.createCipher('aes-256-gcm', key || 'dev-encryption-key');
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return JSON.stringify(data); // Fallback to plain JSON
    }
};

const decryptCredentials = (encrypted, key) => {
    try {
        const decipher = crypto.createDecipher('aes-256-gcm', key || 'dev-encryption-key');
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        try {
            // Try to parse as plain JSON
            return JSON.parse(encrypted);
        } catch {
            throw new Error('Failed to decrypt credentials');
        }
    }
};

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
        
        // If database is not connected, use mock authentication for testing
        if (!dbConnected) {
            console.log('⚠️ Using mock authentication - database not connected');
            
            // Verify JWT token
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
                
                req.user = {
                    id: decoded.userId || 'mock-user-id',
                    email: decoded.email || 'test@example.com',
                    phone: decoded.phone || '+254712345678',
                    role: decoded.role || 'user',
                    status: 'active',
                    subscription: null
                };
                
                return next();
            } catch (jwtError) {
                return res.status(401).json({ error: 'Invalid token' });
            }
        }
        
        // Verify token with Supabase (if available)
        if (supabase) {
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
                // User exists in Supabase but not in our database - create profile
                await pool.query(
                    `INSERT INTO users (id, email, phone, role, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [user.id, user.email, user.phone || null, 'user', 'active']
                );
                
                req.user = {
                    id: user.id,
                    email: user.email,
                    phone: user.phone || null,
                    role: 'user',
                    status: 'active',
                    subscription: null
                };
            } else {
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
            }
        } else {
            // Fallback to JWT verification if Supabase is not available
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
            
            req.user = {
                id: decoded.userId || 'mock-user-id',
                email: decoded.email || 'test@example.com',
                phone: decoded.phone || '+254712345678',
                role: decoded.role || 'user',
                status: 'active',
                subscription: null
            };
        }
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
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
        // If database is not connected, return mock user
        if (!dbConnected) {
            return res.json({
                id: req.user.id,
                email: req.user.email,
                phone: req.user.phone,
                role: req.user.role,
                status: req.user.status,
                created_at: new Date().toISOString(),
                subscription: null,
                bot_count: 0,
                online_bots: 0
            });
        }
        
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

// Register user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, phone, name } = req.body;
        
        // Validate
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // If database is not connected, use mock registration
        if (!dbConnected || !supabase) {
            console.log('⚠️ Using mock registration');
            
            // Create mock user
            const mockUser = {
                id: 'mock-user-' + Date.now(),
                email: email,
                phone: phone || '+254712345678',
                name: name || email.split('@')[0],
                role: 'user',
                status: 'active'
            };
            
            // Create JWT token
            const token = jwt.sign(
                { userId: mockUser.id, email: mockUser.email, phone: mockUser.phone },
                process.env.JWT_SECRET || 'dev-secret-key',
                { expiresIn: '30d' }
            );
            
            return res.json({
                success: true,
                user: mockUser,
                token
            });
        }
        
        // Register with Supabase (real registration)
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

// Login user - FIXED VERSION
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔑 Login attempt for:', email);
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // If database is not connected, use mock login
        if (!dbConnected || !supabase) {
            console.log('⚠️ Using mock login - database/supabase not available');
            
            // For demo purposes, accept any email/password
            // In production, you would validate against database
            const mockUser = {
                id: 'mock-user-id-' + Date.now(),
                email: email,
                phone: '+254712345678',
                role: 'user',
                status: 'active',
                subscription: null
            };
            
            // Create JWT token
            const token = jwt.sign(
                { userId: mockUser.id, email: mockUser.email },
                process.env.JWT_SECRET || 'dev-secret-key',
                { expiresIn: '30d' }
            );
            
            console.log('✅ Mock login successful for:', email);
            
            return res.json({
                success: true,
                user: mockUser,
                token
            });
        }
        
        // Real login with Supabase
        console.log('🔐 Attempting Supabase login...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            console.error('❌ Supabase login error:', error.message);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ Supabase login successful, user ID:', data.user.id);
        
        // Get user from our database
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
            console.log('👤 Creating new user in database...');
            await pool.query(
                `INSERT INTO users (id, email, phone, role, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [data.user.id, data.user.email, data.user.phone || null, 'user', 'active']
            );
            
            userData = {
                id: data.user.id,
                email: data.user.email,
                phone: data.user.phone || null,
                role: 'user',
                status: 'active'
            };
        } else {
            userData = result.rows[0];
            delete userData.password_hash;
        }
        
        // Create JWT
        const token = jwt.sign(
            { userId: data.user.id },
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            { expiresIn: '30d' }
        );
        
        console.log('🎉 Login complete, returning user data');
        
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
        console.error('💥 Login error:', error);
        res.status(500).json({ 
            error: 'Login failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update user phone
app.put('/api/user/update-phone', authenticate, async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Phone number required' });
        }
        
        // If database is not connected, mock success
        if (!dbConnected) {
            return res.json({
                success: true,
                message: 'Phone number updated (mock)'
            });
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

// ==================== TEST ROUTES ====================
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Backend is working!',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/test/login', (req, res) => {
    // Create a test token for development
    const testToken = jwt.sign(
        { 
            userId: 'test-user-' + Date.now(),
            email: 'test@example.com',
            role: 'user'
        },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '1h' }
    );
    
    res.json({
        success: true,
        token: testToken,
        user: {
            id: 'test-user-id',
            email: 'test@example.com',
            phone: '+254712345678',
            role: 'user',
            status: 'active'
        },
        message: 'Test token generated. Use this for testing.'
    });
});

// ==================== BOT MANAGEMENT ROUTES (MOCKED) ====================

// Create new bot
app.post('/api/bots/create', authenticate, async (req, res) => {
    try {
        const { name, phoneNumber, settings } = req.body;
        
        // Mock bot creation
        const mockBot = {
            id: 'bot-' + Date.now(),
            user_id: req.user.id,
            name: name || 'My WhatsApp Bot',
            whatsapp_number: phoneNumber,
            session_status: 'created',
            settings: settings || {},
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        };
        
        res.json({
            success: true,
            bot: mockBot,
            message: 'Bot created successfully (mock)'
        });
        
    } catch (error) {
        console.error('Create bot error:', error);
        res.status(500).json({ error: 'Failed to create bot' });
    }
});

// Get all user bots
app.get('/api/bots', authenticate, async (req, res) => {
    try {
        // Return mock bots
        const mockBots = [
            {
                id: 'bot-1',
                name: 'Support Bot',
                whatsapp_number: '+254712345678',
                session_status: 'online',
                settings: {},
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                last_active: new Date().toISOString()
            },
            {
                id: 'bot-2',
                name: 'Marketing Bot',
                whatsapp_number: '+254798765432',
                session_status: 'offline',
                settings: {},
                created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
                last_active: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        res.json(mockBots);
    } catch (error) {
        console.error('Get bots error:', error);
        res.status(500).json({ error: 'Failed to fetch bots' });
    }
});

// Get single bot details
app.get('/api/bots/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Return mock bot
        const mockBot = {
            id: id,
            name: 'My WhatsApp Bot',
            whatsapp_number: '+254712345678',
            session_status: 'online',
            settings: {},
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            last_active: new Date().toISOString(),
            user_email: req.user.email,
            runtime_status: {
                status: 'online',
                connected: true,
                last_message: '2 minutes ago',
                messages_today: 42
            }
        };
        
        res.json(mockBot);
    } catch (error) {
        console.error('Get bot error:', error);
        res.status(500).json({ error: 'Failed to fetch bot' });
    }
});

// Delete bot
app.delete('/api/bots/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        res.json({ 
            success: true, 
            message: 'Bot deleted successfully (mock)',
            bot_id: id
        });
        
    } catch (error) {
        console.error('Delete bot error:', error);
        res.status(500).json({ error: 'Failed to delete bot' });
    }
});

// ==================== SUBSCRIPTION ROUTES (MOCKED) ====================

// Get subscription status
app.get('/api/subscription/status', authenticate, async (req, res) => {
    try {
        // Return mock subscription
        const mockSubscription = {
            has_subscription: true,
            subscription: {
                id: 'sub-' + Date.now(),
                plan: 'pro',
                plan_name: 'Professional Plan',
                amount: 24.99,
                currency: 'USD',
                status: 'active',
                is_active: true,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
                days_remaining: 30,
                is_expired: false,
                can_create_bots: true
            }
        };
        
        res.json(mockSubscription);
    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Failed to check subscription' });
    }
});

// ==================== PAYMENT ROUTES (MOCKED) ====================

// Initiate payment
app.post('/api/payments/initiate', authenticate, async (req, res) => {
    try {
        const { plan, amount, currency = 'USD', planName, phoneNumber, botId } = req.body;
        
        const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        res.json({
            success: true,
            payment_id: 'pay-' + Date.now(),
            reference: paymentRef,
            checkout_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?ref=${paymentRef}`,
            amount: amount,
            currency: currency,
            plan: plan,
            plan_name: planName || plan,
            phone_number: phoneNumber,
            expires_in: 1800,
            message: 'Payment initialized successfully (mock)'
        });
        
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
});

// Get payment history
app.get('/api/payments/history', authenticate, async (req, res) => {
    try {
        // Return mock payment history
        const mockPayments = [
            {
                id: 'pay-1',
                reference: 'PAY-123456789',
                amount: 24.99,
                currency: 'USD',
                plan: 'pro',
                plan_name: 'Professional Plan',
                status: 'completed',
                created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                payhero_ref: 'PH123456',
                subscription_expires: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'pay-2',
                reference: 'PAY-987654321',
                amount: 9.99,
                currency: 'USD',
                plan: 'basic',
                plan_name: 'Basic Plan',
                status: 'completed',
                created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                completed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                payhero_ref: 'PH654321',
                subscription_expires: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        res.json(mockPayments);
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

// ==================== HEALTH CHECK ====================
app.get('/health', async (req, res) => {
    try {
        const healthStatus = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'bot-platform-backend',
            version: '1.0.0',
            database: dbConnected ? 'connected' : 'disconnected',
            environment: process.env.NODE_ENV || 'development',
            endpoints: {
                login: '/api/auth/login',
                register: '/api/auth/register',
                me: '/api/auth/me',
                bots: '/api/bots',
                subscription: '/api/subscription/status',
                payments: '/api/payments/history'
            }
        };
        
        res.json(healthStatus);
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Bot Platform Backend API',
        status: 'running',
        version: '1.0.0',
        documentation: {
            health: '/health',
            test: '/api/test',
            login: 'POST /api/auth/login',
            register: 'POST /api/auth/register',
            user_info: 'GET /api/auth/me',
            bots: 'GET /api/bots',
            subscription: 'GET /api/subscription/status'
        },
        note: 'API endpoints are prefixed with /api'
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: {
            auth: ['POST /api/auth/login', 'POST /api/auth/register', 'GET /api/auth/me'],
            bots: ['GET /api/bots', 'POST /api/bots/create', 'GET /api/bots/:id', 'DELETE /api/bots/:id'],
            subscription: ['GET /api/subscription/status'],
            payments: ['GET /api/payments/history', 'POST /api/payments/initiate'],
            test: ['GET /api/test', 'GET /api/test/login']
        }
    });
});

// Global 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        message: 'Check / for available endpoints'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Global error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`
    🚀 WhatsApp Bot Platform Backend
    =================================
    📡 Server running on port: ${PORT}
    🌐 Environment: ${process.env.NODE_ENV || 'development'}
    🗄️  Database: ${dbConnected ? '✅ Connected' : '⚠️ Disconnected (using mock data)'}
    🔐 Authentication: ${supabase ? '✅ Supabase' : '⚠️ Mock'}
    
    📚 API Documentation:
    - Health check: http://localhost:${PORT}/health
    - Test endpoint: http://localhost:${PORT}/api/test
    - Login: POST http://localhost:${PORT}/api/auth/login
    - Register: POST http://localhost:${PORT}/api/auth/register
    
    🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
    🔗 Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}
    
    ⚠️  Note: Running with mock data for testing.
        Set up database for full functionality.
    =================================
    `);
});

module.exports = app;
