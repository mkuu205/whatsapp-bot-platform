// backend/scripts/migrate.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        subscription_ends TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created users table');
    
    // Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL,
        plan_name VARCHAR(100),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP NOT NULL,
        payment_id UUID,
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, is_active) WHERE is_active = true
      )
    `);
    console.log('✅ Created subscriptions table');
    
    // Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reference VARCHAR(100) UNIQUE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        plan VARCHAR(50),
        plan_name VARCHAR(100),
        phone_number VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        payhero_ref VARCHAR(100),
        metadata JSONB,
        bot_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);
    console.log('✅ Created payments table');
    
    // Bots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        whatsapp_number VARCHAR(20),
        session_status VARCHAR(50) DEFAULT 'created',
        settings JSONB DEFAULT '{}',
        credentials_encrypted TEXT,
        credentials_password VARCHAR(100),
        pairing_code VARCHAR(10),
        pairing_qr TEXT,
        pairing_started TIMESTAMP,
        creds_uploaded_at TIMESTAMP,
        deployed_at TIMESTAMP,
        runner_instance_id VARCHAR(100),
        expires_at TIMESTAMP,
        last_active TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created bots table');
    
    // Bot messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
        from_number VARCHAR(20),
        message_text TEXT,
        message_type VARCHAR(20),
        direction VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created bot_messages table');
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON subscriptions(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_bots_user ON bots(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
      CREATE INDEX IF NOT EXISTS idx_bot_messages_bot_id ON bot_messages(bot_id);
    `);
    console.log('✅ Created indexes');
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
