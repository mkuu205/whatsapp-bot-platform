// web-platform/backend/src/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const app = express();
app.set('trust proxy', 1);

/* ==================== BASIC MIDDLEWARE ==================== */

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://whatsapp-bot-platform-frontend.onrender.com',
  credentials: true
}));
app.use(express.json());

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

/* ==================== DATABASE ==================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ==================== SUPABASE ==================== */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* ==================== BOT / PAYMENT CONFIG ==================== */

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3002';
const BOT_API_KEY = process.env.BOT_API_KEY;

const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY;
const PAYHERO_MERCHANT_ID = process.env.PAYHERO_MERCHANT_ID;
const PAYHERO_WEBHOOK_SECRET = process.env.PAYHERO_WEBHOOK_SECRET;

/* ==================== AUTH MIDDLEWARE ==================== */

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing Authorization header' });

    const token = header.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const result = await pool.query(
      `SELECT u.*,
              s.id AS subscription_id,
              s.plan,
              s.plan_name,
              s.status AS subscription_status,
              s.expires_at,
              s.is_active
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
       WHERE u.id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User profile not found',
        requires_registration: true
      });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('AUTH ERROR:', err);
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

/* ==================== AUTH ROUTES ==================== */

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, phone, name } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone,
      options: {
        data: { name }
      }
    });

    if (error) return res.status(400).json({ error: error.message });

    await pool.query(
      `INSERT INTO users (id, email, phone, role, status, created_at)
       VALUES ($1, $2, $3, 'user', 'active', NOW())`,
      [data.user.id, email, phone || null]
    );

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        role: 'user'
      },
      session: data.session
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return res.status(401).json({ error: 'Invalid credentials' });

    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [data.user.id]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (id, email, phone, role, status, created_at)
         VALUES ($1, $2, $3, 'user', 'active', NOW())`,
        [data.user.id, data.user.email, data.user.phone || null]
      );
    }

    res.json({
      success: true,
      user: result.rows[0],
      session: data.session
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// CURRENT USER
app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json(req.user);
});

/* ==================== SUBSCRIPTIONS ==================== */

app.get('/api/subscription/status', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM subscriptions
     WHERE user_id = $1 AND is_active = true`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.json({ has_subscription: false });
  }

  res.json({ has_subscription: true, subscription: result.rows[0] });
});

/* ==================== PAYMENTS (PayHero) ==================== */

app.post('/api/payments/initiate', authenticate, async (req, res) => {
  try {
    const { amount, plan, planName, phoneNumber } = req.body;
    const reference = `PAY-${Date.now()}`;

    await pool.query(
      `INSERT INTO payments
       (user_id, reference, amount, plan, plan_name, phone_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [req.user.id, reference, amount, plan, planName, phoneNumber]
    );

    res.json({
      success: true,
      reference,
      checkout_url: `${process.env.FRONTEND_URL}/payment-success?ref=${reference}`
    });

  } catch (err) {
    console.error('PAYMENT ERROR:', err);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

/* ==================== BOTS ==================== */

app.post('/api/bots/create', authenticate, async (req, res) => {
  try {
    const { name, phoneNumber, settings } = req.body;

    const sub = await pool.query(
      `SELECT expires_at FROM subscriptions
       WHERE user_id = $1 AND is_active = true AND expires_at > NOW()`,
      [req.user.id]
    );

    if (sub.rows.length === 0) {
      return res.status(402).json({ error: 'Active subscription required' });
    }

    const bot = await pool.query(
      `INSERT INTO bots
       (user_id, name, whatsapp_number, settings, expires_at, session_status)
       VALUES ($1, $2, $3, $4, $5, 'created')
       RETURNING *`,
      [req.user.id, name, phoneNumber, settings || {}, sub.rows[0].expires_at]
    );

    await axios.post(`${BOT_API_URL}/api/bot/initialize`, {
      botId: bot.rows[0].id,
      userId: req.user.id
    }, {
      headers: { Authorization: `Bearer ${BOT_API_KEY}` }
    });

    res.json({ success: true, bot: bot.rows[0] });

  } catch (err) {
    console.error('BOT CREATE ERROR:', err);
    res.status(500).json({ error: 'Bot creation failed' });
  }
});

/* ==================== HEALTH ==================== */

app.get('/health', async (_, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'bot-platform-backend' });
});

/* ==================== START ==================== */

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
