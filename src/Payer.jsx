import React, { useState, useEffect } from 'react';
import { Smartphone, WifiOff, Wifi, CheckCircle2, Wallet, Plus, Minus, Key } from 'lucide-react';
import { ethers } from 'ethers';
import QRCode from 'react-qr-code';

const BACKEND_URL = import.meta.env.PROD ? "https://monad-b768.onrender.com" : "";

export default function PayerApp() {
  const [payerWallet, setPayerWallet] = useState(null);
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  
  // Balances
  const [balance, setBalance] = useState(0);
  const [allowanceAmount, setAllowanceAmount] = useState(0); // Unused allowance remaining
  
  // Payment
  const [payAmount, setPayAmount] = useState(10);
  const [lockInput, setLockInput] = useState(50);
  const [voucher, setVoucher] = useState(null);
  const [nonceCounter, setNonceCounter] = useState(1);
  const [fundAmount, setFundAmount] = useState(10);

  const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Check balance whenever wallet or online status changes
  useEffect(() => {
    if (payerWallet && isOnline) {
      fetchBalance();
    }
  }, [payerWallet, isOnline]);

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: payerWallet.address })
      });
      const data = await res.json();
      setBalance(data.balance);
      // We don't overwrite allowanceAmount if it's already set locally during offline mode
    } catch (e) {
      console.error("Failed to fetch balance", e);
    }
  };

  const createRandomWallet = () => {
    const wallet = ethers.Wallet.createRandom();
    setPayerWallet(wallet);
  };

  const loginWithKey = () => {
    try {
      const wallet = new ethers.Wallet(privateKeyInput);
      setPayerWallet(wallet);
    } catch (e) {
      alert("Invalid Private Key!");
    }
  };

  const fundWallet = async (amount) => {
    if (!isOnline) return alert("Must be online to modify funds");
    try {
      const res = await fetch(`${BACKEND_URL}/api/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: payerWallet.address, amount })
      });
      const data = await res.json();
      setBalance(data.balance);
    } catch (e) {
      alert("Error funding wallet");
    }
  };

  const toggleOnlineMode = async () => {
    if (isOnline) {
      // Going Offline: Must lock allowance
      if (lockInput <= 0 || lockInput > balance) {
        return alert("Invalid lock amount or insufficient balance.");
      }
      try {
        const res = await fetch(`${BACKEND_URL}/api/lock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: payerWallet.address, amount: lockInput })
        });
        const data = await res.json();
        if (data.success) {
          setBalance(data.balance);
          setAllowanceAmount(lockInput);
          setIsOnline(false);
          setVoucher(null); // Clear previous vouchers
        } else {
          alert(data.error);
        }
      } catch (e) {
        alert("Error locking allowance");
      }
    } else {
      // Going Online: Refund remaining allowance
      try {
        const res = await fetch(`${BACKEND_URL}/api/unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: payerWallet.address, remainingAmount: allowanceAmount })
        });
        const data = await res.json();
        if (data.success) {
          setBalance(data.balance);
          setAllowanceAmount(0);
          setIsOnline(true);
          setVoucher(null);
        }
      } catch (e) {
        alert("Error refunding allowance. Please reconnect.");
      }
    }
  };

  const generateVoucher = async () => {
    if (isOnline) {
      alert("Please go offline to generate a voucher!");
      return;
    }
    if (payAmount <= 0 || payAmount > allowanceAmount) {
      alert("Invalid payment amount. Make sure it is less than your remaining offline allowance.");
      return;
    }

    const nonce = `tx-${Date.now()}-${nonceCounter}`;
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour expiry
    
    const message = JSON.stringify({ amount: payAmount, nonce, expiry, contractAddress: CONTRACT_ADDRESS });
    const signature = await payerWallet.signMessage(message);

    const newVoucher = {
      amount: payAmount,
      nonce,
      expiry,
      signature,
      payerAddress: payerWallet.address
    };

    setVoucher(newVoucher);
    setNonceCounter(prev => prev + 1);
    setAllowanceAmount(prev => prev - payAmount);
  };

  if (!payerWallet) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Login / Create Account</h2>
          <button onClick={createRandomWallet} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium mb-6 transition-colors">
            Create New Account
          </button>
          <div className="relative flex items-center py-5">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">Or Import</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>
          <input 
            type="text" 
            placeholder="Paste Private Key (0x...)" 
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 mb-4 text-white focus:outline-none focus:border-blue-500"
          />
          <button onClick={loginWithKey} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <Key className="w-4 h-4" /> Import Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="max-w-md w-full flex flex-col items-center text-center mb-8 pb-4 border-b border-slate-800">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Smartphone className="w-8 h-8 text-blue-400" />
          Monad Payer App
        </h1>
        <p className="text-slate-400 mt-2 text-sm">Generate offline payment vouchers securely.</p>
        <div className="mt-4 w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-left">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your Account Address</p>
          <p className="font-mono text-xs text-blue-400 truncate">{payerWallet.address}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider mt-2 mb-1">Your Private Key (DO NOT SHARE)</p>
          <p className="font-mono text-xs text-red-400 truncate">{payerWallet.privateKey}</p>
        </div>
      </header>

      <main className="max-w-md w-full">
        {/* Toggle Online/Offline Status */}
        <section className={`border rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6 transition-colors duration-500 ${isOnline ? 'bg-slate-900 border-slate-800' : 'bg-indigo-950/30 border-indigo-900'}`}>
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isOnline ? 'from-green-500 to-emerald-500' : 'from-slate-500 to-slate-400'}`}></div>
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Wallet className={`w-5 h-5 ${isOnline ? 'text-green-400' : 'text-slate-400'}`} />
              Wallet Status
            </h2>
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-medium ${isOnline ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-500 mb-1">Online Balance</p>
              <p className="text-2xl font-bold text-white">${balance.toFixed(2)}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-500 mb-1">Offline Allowance</p>
              <p className="text-2xl font-bold text-blue-400">${allowanceAmount.toFixed(2)}</p>
            </div>
          </div>

          {isOnline ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={fundAmount} 
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 w-24"
                />
                <button onClick={() => fundWallet(fundAmount)} className="flex-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                  <Plus className="w-4 h-4" /> Add
                </button>
                <button onClick={() => fundWallet(-fundAmount)} className="flex-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                  <Minus className="w-4 h-4" /> Remove
                </button>
              </div>
              
              <div className="pt-4 border-t border-slate-800">
                <p className="text-sm text-slate-400 mb-2">How much to lock for offline use?</p>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={lockInput}
                    onChange={(e) => setLockInput(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 w-24"
                    max={balance}
                  />
                  <button onClick={toggleOnlineMode} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors">
                    <WifiOff className="w-4 h-4" /> Go Offline & Lock
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={toggleOnlineMode} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors">
              <Wifi className="w-4 h-4" /> Go Online & Refund Unspent ($ {allowanceAmount})
            </button>
          )}
        </section>

        {/* Offline Payment Section */}
        <section className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-opacity duration-300 ${isOnline ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Make Offline Payment
            </h2>
          </div>

          <label className="block text-sm text-slate-400 mb-2">Payment Amount ($)</label>
          <div className="flex gap-3 mb-4">
            <input 
              type="number" 
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 w-full focus:outline-none focus:border-blue-500"
              min="1"
              max={allowanceAmount}
            />
            <button 
              onClick={generateVoucher}
              className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors text-white"
            >
              Generate QR
            </button>
          </div>

          {voucher && (
            <div className="mt-6 bg-white rounded-xl p-6 flex flex-col items-center justify-center relative shadow-inner animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-slate-900 font-bold mb-1">Pay ${voucher.amount.toFixed(2)}</h3>
              <p className="text-slate-500 text-xs mb-4">Show this QR to the Merchant Scanner</p>
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-2">
                <QRCode value={JSON.stringify(voucher)} size={192} level="L" />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
