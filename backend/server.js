require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// Set up Monad Provider and Wallet
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz/"; 
const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);

// The Merchant's private key to submit the settled batch
const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; 
const merchantWallet = new ethers.Wallet(MERCHANT_PRIVATE_KEY, provider);

// Contract address & ABI
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"; 
const contractAbi = [
  "function settleVouchers(tuple(uint256 amount, string nonce, uint256 expiry, bytes signature)[] vouchers) external"
];
const _monadPayContract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, merchantWallet);

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Optional Supabase DB Connection
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://")) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (supabase) {
  console.log("⚡ Supabase database connection enabled on backend.");
} else {
  console.log("ℹ️  Running in-memory simulation mode (provide SUPABASE_URL & SUPABASE_KEY to persist).");
}

// In-memory database fallback
let users = {}; 
let wallets = {}; 
let allowances = {}; 

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "monadadmin";

// Create an admin user by default for testing in-memory
const adminWallet = ethers.Wallet.createRandom();
users["admin"] = { password: "password", address: adminWallet.address, privateKey: adminWallet.privateKey, role: "admin" };
wallets[adminWallet.address] = 999999;
allowances[adminWallet.address] = 0;

// Endpoint to register a new user
app.post("/api/register", async (req, res) => {
  const { username, password: userPassword } = req.body;
  if (!username || !userPassword) return res.status(400).json({ error: "Username and password required" });

  const wallet = ethers.Wallet.createRandom();

  if (supabase) {
    try {
      const { data: existing } = await supabase.from('users').select('username').eq('username', username.trim()).maybeSingle();
      if (existing) return res.status(400).json({ error: "Username already exists" });

      const { error: insertErr } = await supabase.from('users').insert({
        username: username.trim(),
        password: userPassword,
        address: wallet.address,
        private_key: wallet.privateKey,
        balance: 100,
        locked: 0,
        role: "user"
      });
      if (insertErr) return res.status(500).json({ error: insertErr.message });
      return res.json({ success: true, message: "Account created successfully with $100 starting balance!" });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (users[username]) return res.status(400).json({ error: "Username already exists" });
  users[username] = {
    password: userPassword,
    address: wallet.address,
    privateKey: wallet.privateKey,
    role: "user"
  };
  wallets[wallet.address] = 100;
  allowances[wallet.address] = 0;

  return res.json({ success: true, message: "Account created successfully!" });
});

// Endpoint to login
app.post("/api/login", async (req, res) => {
  const { username, password: userPassword } = req.body;

  if (supabase) {
    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('username', username.trim()).maybeSingle();
      if (error || !user || user.password !== userPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      return res.json({
        success: true,
        address: user.address,
        privateKey: user.private_key,
        role: user.role || 'user'
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const user = users[username];
  if (!user || user.password !== userPassword) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  return res.json({ 
    success: true, 
    address: user.address, 
    privateKey: user.privateKey,
    role: user.role
  });
});

// Endpoint to get account details
app.post("/api/account", async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address required" });

  if (supabase) {
    try {
      const { data: user } = await supabase.from('users').select('balance, locked').ilike('address', address).maybeSingle();
      return res.json({ balance: Number(user?.balance || 0), locked: Number(user?.locked || 0) });
    } catch {
      return res.json({ balance: 0, locked: 0 });
    }
  }

  return res.json({ balance: wallets[address] || 0, locked: allowances[address] || 0 });
});

// --- ADMIN ENDPOINTS ---

app.post("/api/admin/users", async (req, res) => {
  const { adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });

  if (supabase) {
    try {
      const { data: list, error } = await supabase.from('users').select('username, address, balance, locked, role').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, users: list });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const userList = Object.keys(users).map(username => {
    const u = users[username];
    return {
      username,
      address: u.address,
      balance: wallets[u.address],
      locked: allowances[u.address],
      role: u.role
    };
  });
  return res.json({ success: true, users: userList });
});

app.post("/api/admin/fund", async (req, res) => {
  const { adminPassword, username, amount } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });

  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').update({ balance: Number(amount) }).eq('username', username).select('balance').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, newBalance: Number(data.balance) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const user = users[username];
  if (!user) return res.status(404).json({ error: "User not found" });

  wallets[user.address] = Number(amount);
  return res.json({ success: true, newBalance: wallets[user.address] });
});

app.post("/api/admin/delete", async (req, res) => {
  const { adminPassword, username } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });

  if (supabase) {
    try {
      const { error } = await supabase.from('users').delete().eq('username', username);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const user = users[username];
  if (!user) return res.status(404).json({ error: "User not found" });
  delete wallets[user.address];
  delete allowances[user.address];
  delete users[username];
  return res.json({ success: true });
});

// --- PAYMENT ENDPOINTS ---

app.post("/api/lock", async (req, res) => {
  const { address, amount } = req.body;
  const lockAmount = Number(amount);

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('lock_allowance', { p_address: address, p_amount: lockAmount });
      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (wallets[address] >= lockAmount) {
    wallets[address] -= lockAmount;
    allowances[address] = (allowances[address] || 0) + lockAmount;
    return res.json({ success: true, locked: allowances[address], balance: wallets[address] });
  } else {
    return res.status(400).json({ success: false, error: "Insufficient balance to lock" });
  }
});

app.post("/api/unlock", async (req, res) => {
  const { address, remainingAmount } = req.body;

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('unlock_allowance', { p_address: address, p_remaining: Number(remainingAmount) });
      if (error) return res.status(400).json({ success: false, error: error.message });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (allowances[address] !== undefined) {
    wallets[address] += Number(remainingAmount);
    allowances[address] = 0;
    return res.json({ success: true, balance: wallets[address] });
  } else {
    return res.status(400).json({ success: false, error: "No allowance to unlock" });
  }
});

app.post("/api/settle", async (req, res) => {
  try {
    const { batch, merchantAddress } = req.body;
    if (!batch || !Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Invalid or empty batch" });
    }
    if (!merchantAddress) {
      return res.status(400).json({ error: "Merchant address required" });
    }

    if (supabase) {
      const { data, error } = await supabase.rpc('settle_voucher_batch', { p_merchant: merchantAddress, p_vouchers: batch });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    let totalSettled = 0;
    for (const v of batch) {
      const payer = v.payerAddress;
      const amount = Number(v.amount);
      if (allowances[payer] !== undefined && allowances[payer] >= amount) {
        allowances[payer] -= amount;
        totalSettled += amount;
      }
    }

    if (wallets[merchantAddress] === undefined) wallets[merchantAddress] = 0;
    wallets[merchantAddress] += totalSettled;

    return res.json({ 
      success: true, 
      txHash: "0x" + Math.random().toString(16).slice(2, 66),
      message: `Successfully settled batch. Total processed: $${totalSettled} added to your account!`
    });
  } catch (error) {
    return res.status(500).json({ error: "Settlement failed", details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
