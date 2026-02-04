-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    subscription_ends TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Bots table
CREATE TABLE bots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) DEFAULT 'My Bot',
    whatsapp_number VARCHAR(20),
    pairing_code VARCHAR(20),
    pairing_code_formatted VARCHAR(20),
    session_status VARCHAR(20) DEFAULT 'pending',
    
    -- Settings as JSONB
    settings JSONB DEFAULT '{
        "autoTyping": false,
        "autoRecording": false,
        "autorecordtype": false,
        "statusMessage": "Available"
    }'::jsonb,
    
    session_data TEXT,
    last_active TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Payments table
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    transaction_id VARCHAR(255) UNIQUE,
    payhero_ref VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Commands log
CREATE TABLE commands_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    command VARCHAR(50),
    parameters TEXT,
    response TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes
CREATE INDEX idx_bots_user_id ON bots(user_id);
CREATE INDEX idx_bots_session_status ON bots(session_status);
CREATE INDEX idx_bots_expires_at ON bots(expires_at);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_users_subscription_ends ON users(subscription_ends);
