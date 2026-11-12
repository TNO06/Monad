import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

// Read Supabase config from Vite environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("your-project")
);

// Initialize Supabase client if configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Fallback HTTP Backend URL (Render or Local)
const HTTP_BACKEND_URL = import.meta.env.PROD 
  ? "https://monad-b768.onrender.com" 
  : "";

const ADMIN_PASSWORD_FALLBACK = "monadadmin";

// ====================================================================
// AUTHENTICATION & WALLET APIs
// ====================================================================

/**
 * Register a new user and generate a Monad keypair
 */
export async function registerUser(username, password) {
  if (isSupabaseConfigured) {
    try {
      // 1. Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      if (existingUser) {
        return { success: false, error: "Username already exists. Please pick another." };
      }

      // 2. Generate random Monad wallet
      const wallet = ethers.Wallet.createRandom();

      // 3. Insert into Supabase
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          username: username.trim(),
          password: password,
          address: wallet.address,
          private_key: wallet.privateKey,
          balance: 100.00, // Welcome demo balance on Monad
          locked: 0.00,
          role: 'user'
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return { success: true, message: "Account created successfully with $100 starting balance!" };
    } catch (err) {
      return { success: false, error: err.message || "Registration failed" };
    }
  }

  // Fallback to HTTP server (Render/Local)
  const res = await fetch(`${HTTP_BACKEND_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return await res.json();
}

/**
 * Log in an existing user and retrieve private key for offline signing
 */
export async function loginUser(username, password) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: "Invalid username or password" };
      }

      if (data.password !== password) {
        return { success: false, error: "Invalid username or password" };
      }

      return {
        success: true,
        address: data.address,
        privateKey: data.private_key,
        role: data.role || 'user'
      };
    } catch (err) {
      return { success: false, error: err.message || "Login failed" };
    }
  }

  // Fallback to HTTP server
  const res = await fetch(`${HTTP_BACKEND_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return await res.json();
}

/**
 * Get account balances (on-chain available & locked offline allowance)
 */
export async function getAccount(address) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('balance, locked')
        .ilike('address', address)
        .maybeSingle();

      if (error || !data) {
        return { balance: 0, locked: 0 };
      }

      return {
        balance: Number(data.balance || 0),
        locked: Number(data.locked || 0)
      };
    } catch {
      return { balance: 0, locked: 0 };
    }
  }

  // Fallback to HTTP server
  const res = await fetch(`${HTTP_BACKEND_URL}/api/account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });
  return await res.json();
}

// ====================================================================
// OFFLINE PROTOCOL: LOCK / UNLOCK / SETTLE APIs
// ====================================================================

/**
 * Lock funds from on-chain balance into offline allowance vault
 */
export async function lockFunds(address, amount) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('lock_allowance', {
        p_address: address,
        p_amount: Number(amount)
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Fallback to HTTP server
  const res = await fetch(`${HTTP_BACKEND_URL}/api/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, amount })
  });
  return await res.json();
}

/**
 * Refund unspent offline allowance back to on-chain balance
 */
export async function unlockFunds(address, remainingAmount) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('unlock_allowance', {
        p_address: address,
        p_remaining: Number(remainingAmount)
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Fallback to HTTP server
  const res = await fetch(`${HTTP_BACKEND_URL}/api/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, remainingAmount })
  });
  return await res.json();
}

/**
 * Settle a batch of offline vouchers on Monad
 */
export async function settleBatch(batch, merchantAddress) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('settle_voucher_batch', {
        p_merchant: merchantAddress,
        p_vouchers: batch
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Fallback to HTTP server
  const res = await fetch(`${HTTP_BACKEND_URL}/api/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch, merchantAddress })
  });
  return await res.json();
}

// ====================================================================
// ADMIN APIs
// ====================================================================

/**
 * Fetch all registered users for administrative management
 */
export async function adminGetUsers(adminPassword) {
  if (isSupabaseConfigured) {
    if (adminPassword !== ADMIN_PASSWORD_FALLBACK) {
      return { success: false, error: "Unauthorized: Invalid Master Key" };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, address, balance, locked, role')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const formatted = (data || []).map(u => ({
        username: u.username,
        address: u.address,
        balance: Number(u.balance || 0),
        locked: Number(u.locked || 0),
        role: u.role || 'user'
      }));

      return { success: true, users: formatted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Fallback to HTTP server
  const res = await fetch(`${HTTP_BACKEND_URL}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminPassword })
  });
  return await res.json();
}

/**
 * Adjust/set a user's on-chain balance
 */
export async function adminFundUser(adminPassword, username, amount) {
  if (isSupabaseConfigured) {
    if (adminPassword !== ADMIN_PASSWORD_FALLBACK) {
      return { success: false, error: "Unauthorized: Invalid Master Key" };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ balance: Number(amount) })
        .eq('username', username)
        .select('balance')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, newBalance: Number(data.balance) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Fallback to HTTP server
  const res = await fetch(`${HTTP_BACKEND_URL}/api/admin/fund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminPassword, username, amount })
  });
  return await res.json();
}

/**
 * Delete a user from database
 */
export async function adminDeleteUser(adminPassword, username) {
  if (isSupabaseConfigured) {
    if (adminPassword !== ADMIN_PASSWORD_FALLBACK) {
      return { success: false, error: "Unauthorized: Invalid Master Key" };
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', username);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Fallback to HTTP server
  const res = await fetch(`${HTTP_BACKEND_URL}/api/admin/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminPassword, username })
  });
  return await res.json();
}

