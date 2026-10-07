# Monad Offline Pay

A zero-connectivity offline payment solution built for the Monad Metropolis hackathon. It enables users to make secure cryptocurrency payments even when completely disconnected from the internet.

## Architecture

1. **Smart Contract (`contracts/MonadOfflinePay.sol`)**: Handles locking an allowance on-chain.
2. **Payer Device (Frontend)**: Generates signed vouchers (using Ethers.js) when offline.
3. **Merchant Device (Frontend)**: Verifies signatures offline and batches them.
4. **Backend (`backend/server.js`)**: Receives settled batches when the merchant is online and submits them to the Monad network.

## Setup

### 1. Backend

Navigate to the `backend` folder and start the server:

```bash
cd backend
npm install
node server.js
```

### 2. Frontend

In the root folder, run the Vite dev server:

```bash
npm install
npm run dev
```

### 3. Smart Contract

To deploy for real use, deploy `contracts/MonadOfflinePay.sol` to the Monad network and update `CONTRACT_ADDRESS` in `backend/.env` and `src/App.jsx`.
