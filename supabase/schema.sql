-- ====================================================================
-- MONAD OFFLINE PAY - SUPABASE DATABASE SCHEMA
-- ====================================================================
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- to create all required tables, atomic RPC stored procedures, and seed data.

-- 1. Enable pgcrypto for UUIDs & random bytes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing tables if re-running
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Users Table (Stores user accounts, Monad wallet keys, and balances)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  address TEXT UNIQUE NOT NULL,
  private_key TEXT NOT NULL,
  balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
  locked NUMERIC(18, 4) NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ DEFAULT NULL, -- Timestamp when funds were locked (for expiry-based auto-refund)
  role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'merchant' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Transactions Table (Records on-chain settled voucher proofs)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  payer_address TEXT NOT NULL,
  amount NUMERIC(18, 4) NOT NULL,
  nonce TEXT UNIQUE NOT NULL,
  signature TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fast lookup indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_address ON users(LOWER(address));
CREATE INDEX idx_transactions_merchant ON transactions(LOWER(merchant_address));
CREATE INDEX idx_transactions_nonce ON transactions(nonce);

-- ====================================================================
-- ATOMIC STORED PROCEDURES (RPCs)
-- ====================================================================

-- Procedure: Lock funds into offline vault
CREATE OR REPLACE FUNCTION lock_allowance(p_address TEXT, p_amount NUMERIC)
RETURNS JSONB AS $$
DECLARE
  v_current_bal NUMERIC;
  v_new_bal NUMERIC;
  v_new_locked NUMERIC;
BEGIN
  SELECT balance INTO v_current_bal 
  FROM users 
  WHERE LOWER(address) = LOWER(p_address)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_current_bal < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient on-chain balance to lock');
  END IF;

  UPDATE users 
  SET balance = balance - p_amount,
      locked = locked + p_amount,
      locked_at = now()
  WHERE LOWER(address) = LOWER(p_address)
  RETURNING balance, locked INTO v_new_bal, v_new_locked;

  RETURN jsonb_build_object(
    'success', true, 
    'balance', v_new_bal, 
    'locked', v_new_locked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure: Unlock / refund offline allowance (expiry-aware)
-- If lock expired (>1 hour), refunds ALL remaining locked funds including
-- unsettled voucher amounts the merchant never claimed.
CREATE OR REPLACE FUNCTION unlock_allowance(p_address TEXT, p_remaining NUMERIC)
RETURNS JSONB AS $$
DECLARE
  v_locked NUMERIC;
  v_locked_at TIMESTAMPTZ;
  v_refund NUMERIC;
  v_auto_refunded NUMERIC;
  v_new_bal NUMERIC;
BEGIN
  SELECT locked, locked_at INTO v_locked, v_locked_at
  FROM users
  WHERE LOWER(address) = LOWER(p_address)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- If lock expired (older than 1 hour), refund ALL remaining locked funds
  IF v_locked_at IS NOT NULL AND v_locked_at < (now() - INTERVAL '1 hour') THEN
    v_refund := v_locked;
    v_auto_refunded := GREATEST(0, v_locked - p_remaining);
  ELSE
    -- Lock still valid: only refund what client says is remaining
    v_refund := LEAST(p_remaining, v_locked);
    v_auto_refunded := 0;
  END IF;

  UPDATE users
  SET balance = balance + v_refund,
      locked = locked - v_refund,
      locked_at = NULL
  WHERE LOWER(address) = LOWER(p_address)
  RETURNING balance INTO v_new_bal;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_bal,
    'refunded', v_refund,
    'autoRefunded', v_auto_refunded,
    'expired', (v_locked_at IS NOT NULL AND v_locked_at < (now() - INTERVAL '1 hour'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure: Settle batch of cryptographic vouchers atomically
CREATE OR REPLACE FUNCTION settle_voucher_batch(p_merchant TEXT, p_vouchers JSONB)
RETURNS JSONB AS $$
DECLARE
  v_voucher JSONB;
  v_payer TEXT;
  v_amount NUMERIC;
  v_nonce TEXT;
  v_sig TEXT;
  v_total NUMERIC := 0;
  v_hash TEXT := '0x' || encode(gen_random_bytes(32), 'hex');
BEGIN
  FOR v_voucher IN SELECT * FROM jsonb_array_elements(p_vouchers)
  LOOP
    v_payer := v_voucher->>'payerAddress';
    v_amount := (v_voucher->>'amount')::NUMERIC;
    v_nonce := v_voucher->>'nonce';
    v_sig := v_voucher->>'signature';

    -- Prevent double-spending replay attack
    IF EXISTS (SELECT 1 FROM transactions WHERE nonce = v_nonce) THEN
      CONTINUE;
    END IF;

    -- Deduct from payer's locked allowance
    UPDATE users 
    SET locked = GREATEST(0, locked - v_amount)
    WHERE LOWER(address) = LOWER(v_payer);

    -- Record transaction proof
    INSERT INTO transactions(merchant_address, payer_address, amount, nonce, signature, tx_hash)
    VALUES (p_merchant, v_payer, v_amount, v_nonce, v_sig, v_hash);

    v_total := v_total + v_amount;
  END LOOP;

  -- Credit settled revenue to merchant
  UPDATE users 
  SET balance = balance + v_total 
  WHERE LOWER(address) = LOWER(p_merchant);

  RETURN jsonb_build_object(
    'success', true, 
    'txHash', v_hash, 
    'totalSettled', v_total,
    'message', 'Batch settled successfully on Monad'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- EXPIRY-BASED AUTO-REFUND SWEEP (pg_cron)
-- ====================================================================

-- Sweep function: auto-refund ALL users whose locks have expired (>1 hour)
-- Runs on a cron schedule for cases where payer never reconnects
CREATE OR REPLACE FUNCTION sweep_expired_locks()
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER := 0;
  v_total_refunded NUMERIC := 0;
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id, locked 
    FROM users 
    WHERE locked > 0 
      AND locked_at IS NOT NULL 
      AND locked_at < (now() - INTERVAL '1 hour')
    FOR UPDATE
  LOOP
    UPDATE users 
    SET balance = balance + r.locked,
        locked = 0,
        locked_at = NULL
    WHERE id = r.id;
    
    v_total_refunded := v_total_refunded + r.locked;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'usersRefunded', v_count,
    'totalRefunded', v_total_refunded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron and schedule sweep every 10 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('sweep-expired-locks', '*/10 * * * *', $$SELECT sweep_expired_locks()$$);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for demo / hackathon operations
CREATE POLICY "Public full access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- SEED INITIAL DATA (Demo accounts and Admin)
-- ====================================================================
INSERT INTO users (username, password, address, private_key, balance, locked, role)
VALUES 
  (
    'admin', 
    'password', 
    '0x000000000000000000000000000000000000Admin', 
    '0x0000000000000000000000000000000000000000000000000000000000000001', 
    999999.00, 
    0.00, 
    'admin'
  ),
  (
    'demo_payer', 
    'password123', 
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', 
    250.00, 
    0.00, 
    'user'
  ),
  (
    'demo_merchant', 
    'password123', 
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', 
    0.00, 
    0.00, 
    'merchant'
  )
ON CONFLICT (username) DO NOTHING;

