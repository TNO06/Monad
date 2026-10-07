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
let wallets = {}; // address -> balance
let allowances = {}; // address -> lockedAmount

// Endpoint to create/get an account
app.post("/api/account", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address required" });
  
  if (wallets[address] === undefined) {
    wallets[address] = 100; // New users get 100 fake Monad/USD
    allowances[address] = 0;
  }
  return res.json({ balance: wallets[address], locked: allowances[address] || 0 });
});

// Endpoint to add/reduce balance
app.post("/api/fund", (req, res) => {
  const { address, amount } = req.body;
  if (wallets[address] !== undefined) {
    wallets[address] += Number(amount);
    if (wallets[address] < 0) wallets[address] = 0; // Prevent negative balances
  }
  return res.json({ balance: wallets[address] });
});

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
    // In a real system, the contract determines the exact remaining amount after settlement.
    // For this simulation, we refund what the user claims they didn't spend.
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
    const { batch } = req.body;
    
    if (!batch || !Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Invalid or empty batch" });
    }

    console.log(`Received batch of ${batch.length} vouchers for settlement.`);

    let totalSettled = 0;

    // Process each voucher
    for (const v of batch) {
      const payer = v.payerAddress;
      const amount = Number(v.amount);
      
      // If they have locked allowance, deduct from it
      if (allowances[payer] !== undefined && allowances[payer] >= amount) {
        allowances[payer] -= amount;
        totalSettled += amount;
      }
    }

    return res.json({ 
      success: true, 
      txHash: "0x" + Math.random().toString(16).slice(2, 66), // Fake tx hash
      message: `Successfully settled batch on Monad. Total processed: $${totalSettled}`
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
