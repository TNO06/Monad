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

// Endpoint to receive the merchant batch and settle on-chain
app.post("/api/settle", async (req, res) => {
  try {
    const { batch } = req.body;
    
    if (!batch || !Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Invalid or empty batch" });
    }

    console.log(`Received batch of ${batch.length} vouchers for settlement.`);

    // In a full implementation, the backend could locally verify signatures before sending to the blockchain
    // For this simulation, we pass it directly to the blockchain
    // We format the batch for the smart contract
    const formattedVouchers = batch.map(v => ({
      amount: ethers.parseUnits(v.amount.toString(), 18),
      nonce: v.nonce,
      expiry: Math.floor(new Date(v.expiry).getTime() / 1000),
      signature: v.signature
    }));

    console.log("Submitting to Monad contract...");
    
    // NOTE: This call will fail if the CONTRACT_ADDRESS is not a real deployed contract.
    // We will simulate success if the address is not set properly for hackathon demonstration purposes.
    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      console.log("Mocking settlement success (Contract not deployed).");
      return res.json({ success: true, message: "Mock settlement complete. Deploy contract to Monad for real execution." });
    }

    const tx = await monadPayContract.settleVouchers(formattedVouchers);
    console.log("Transaction submitted:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    return res.json({ 
      success: true, 
      txHash: tx.hash,
      message: "Successfully settled batch on Monad."
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
