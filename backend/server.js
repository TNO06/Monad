require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

// Set up Monad Provider and Wallet
// For hackathon, we use a testnet or local node URL
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz/"; 
const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);

// The Merchant's private key to submit the settled batch
const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default anvil account 0 for local dev if needed
const merchantWallet = new ethers.Wallet(MERCHANT_PRIVATE_KEY, provider);

// Contract address & ABI
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"; // Update after deployment
const contractAbi = [
  "function settleVouchers(tuple(uint256 amount, string nonce, uint256 expiry, bytes signature)[] vouchers) external"
];
const monadPayContract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, merchantWallet);

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple in-memory database for hackathon simulation
let users = {}; // username -> { password, address, privateKey, role }
let wallets = {}; // address -> balance
let allowances = {}; // address -> lockedAmount

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "monadadmin";

// Create an admin user by default for testing
const adminWallet = ethers.Wallet.createRandom();
users["admin"] = { password: "password", address: adminWallet.address, privateKey: adminWallet.privateKey, role: "admin" };
wallets[adminWallet.address] = 999999;
allowances[adminWallet.address] = 0;

// Endpoint to register a new user
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  if (users[username]) return res.status(400).json({ error: "Username already exists" });

  const wallet = ethers.Wallet.createRandom();
  users[username] = {
    password,
    address: wallet.address,
    privateKey: wallet.privateKey,
    role: "user"
  };
  
  wallets[wallet.address] = 0; // Starts with 0. Admin must fund.
  allowances[wallet.address] = 0;

  return res.json({ success: true, message: "Account created successfully!" });
});

// Endpoint to login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  return res.json({ 
    success: true, 
    address: user.address, 
    privateKey: user.privateKey,
    role: user.role
  });
});

// Endpoint to get account details (balance & allowance)
app.post("/api/account", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address required" });
  return res.json({ balance: wallets[address] || 0, locked: allowances[address] || 0 });
});

// --- ADMIN ENDPOINTS ---

// Get all users
app.post("/api/admin/users", (req, res) => {
  const { adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });

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

// Fund a user (Admin only)
app.post("/api/admin/fund", (req, res) => {
  const { adminPassword, username, amount } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
  
  const user = users[username];
  if (!user) return res.status(404).json({ error: "User not found" });

  wallets[user.address] = Number(amount);
  return res.json({ success: true, newBalance: wallets[user.address] });
});

// Delete a user (Admin only)
app.post("/api/admin/delete", (req, res) => {
  const { adminPassword, username } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
  
  const user = users[username];
  if (!user) return res.status(404).json({ error: "User not found" });
  
  // Clean up
  delete wallets[user.address];
  delete allowances[user.address];
  delete users[username];
  
  return res.json({ success: true });
});

// --- PAYMENT ENDPOINTS ---

// Endpoint to lock allowance for offline use
app.post("/api/lock", (req, res) => {
  const { address, amount } = req.body;
  const lockAmount = Number(amount);
  
  if (wallets[address] >= lockAmount) {
    wallets[address] -= lockAmount;
    allowances[address] = (allowances[address] || 0) + lockAmount;
    return res.json({ success: true, locked: allowances[address], balance: wallets[address] });
  } else {
    return res.status(400).json({ success: false, error: "Insufficient balance to lock" });
  }
});

// Endpoint to refund unused offline allowance
app.post("/api/unlock", (req, res) => {
  const { address, remainingAmount } = req.body;
  
  if (allowances[address] !== undefined) {
    wallets[address] += Number(remainingAmount);
    allowances[address] = 0;
    return res.json({ success: true, balance: wallets[address] });
  } else {
    return res.status(400).json({ success: false, error: "No allowance to unlock" });
  }
});

// Endpoint to receive the merchant batch and settle on-chain
app.post("/api/settle", async (req, res) => {
  try {
    const { batch, merchantAddress } = req.body;
    
    if (!batch || !Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Invalid or empty batch" });
    }
    if (!merchantAddress) {
      return res.status(400).json({ error: "Merchant address required" });
    }

    console.log(`Received batch of ${batch.length} vouchers for settlement to ${merchantAddress}`);

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
    console.error("Error settling batch:", error);
    return res.status(500).json({ error: "Settlement failed", details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
