import React, { useState, useEffect } from 'react';
import { Smartphone, WifiOff, Wifi, CheckCircle2, Wallet, Plus, Minus, Key, User, Lock, ArrowRight, Activity } from 'lucide-react';
import { ethers } from 'ethers';
import QRCode from 'react-qr-code';

const BACKEND_URL = import.meta.env.PROD ? "https://monad-b768.onrender.com" : "";

export default function PayerApp() {
  const [payerWallet, setPayerWallet] = useState(null);
  
  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  
  // Balances
  const [balance, setBalance] = useState(0);
  const [allowanceAmount, setAllowanceAmount] = useState(0); 
  
  // Payment
  const [payAmount, setPayAmount] = useState(10);
  const [lockInput, setLockInput] = useState(50);
  const [voucher, setVoucher] = useState(null);
  const [nonceCounter, setNonceCounter] = useState(1);

  const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

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
    } catch (e) {
      console.error("Failed to fetch balance", e);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const endpoint = isRegistering ? "/api/register" : "/api/login";
    
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (data.success) {
        if (isRegistering) {
          alert("Account created! Please log in.");
          setIsRegistering(false);
        } else {
          // Recreate wallet instance from the private key provided by backend
          const wallet = new ethers.Wallet(data.privateKey);
          setPayerWallet(wallet);
        }
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Authentication failed. Check connection.");
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleOnlineMode = async () => {
    if (isOnline) {
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
          setVoucher(null); 
        } else {
          alert(data.error);
        }
      } catch (e) {
        alert("Error locking allowance");
      }
    } else {
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
      alert("Invalid payment amount.");
      return;
    }

    const nonce = `tx-${Date.now()}-${nonceCounter}`;
    const expiry = new Date(Date.now() + 3600000).toISOString();
    
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-blue-500/30">
            <Smartphone className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-center brand-text text-white">Customer Portal</h2>
          <p className="text-slate-400 text-center mb-8 text-sm">Sign in to manage your offline wallet.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Username" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="password" 
                placeholder="Password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button type="submit" disabled={authLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 mt-4 flex justify-center items-center gap-2">
              {authLoading ? <Activity className="w-5 h-5 animate-spin" /> : (isRegistering ? "Create Account" : "Sign In")}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-400">
            {isRegistering ? "Already have an account?" : "Need an account?"}{" "}
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-400 hover:text-blue-300 font-medium">
              {isRegistering ? "Sign In" : "Register"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      
      <header className="max-w-md w-full flex flex-col items-center text-center mb-8 pb-6 border-b border-white/5 relative z-10">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
          <Smartphone className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold brand-text text-white mb-2">
          Monad Pay
        </h1>
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-xl p-4 w-full mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Account</span>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{username}</span>
          </div>
          <p className="font-mono text-xs text-slate-400 truncate">{payerWallet.address}</p>
        </div>
      </header>

      <main className="max-w-md w-full relative z-10 space-y-6">
        {/* Toggle Online/Offline Status */}
        <section className={`backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-500 border ${isOnline ? 'bg-slate-900/40 border-white/10' : 'bg-indigo-950/30 border-indigo-500/20 shadow-indigo-900/20'}`}>
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isOnline ? 'from-emerald-400 to-teal-500' : 'from-indigo-500 to-purple-500'}`}></div>
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold brand-text flex items-center gap-2">
              <Wallet className={`w-5 h-5 ${isOnline ? 'text-emerald-400' : 'text-indigo-400'}`} />
              Wallet Status
            </h2>
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
              <p className="text-xs text-slate-500 mb-1">Online Balance</p>
              <p className="text-3xl font-bold text-white">${balance.toFixed(2)}</p>
            </div>
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
              <p className="text-xs text-slate-500 mb-1">Offline Allowance</p>
              <p className={`text-3xl font-bold ${allowanceAmount > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>${allowanceAmount.toFixed(2)}</p>
            </div>
          </div>

          {isOnline ? (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-slate-400 mb-3 text-center">Lock funds securely to spend without internet.</p>
              <div className="flex gap-3">
                <input 
                  type="number" 
                  value={lockInput}
                  onChange={(e) => setLockInput(e.target.value)}
                  className="bg-slate-950/50 border border-slate-700/50 text-white rounded-xl px-4 py-3 w-1/3 focus:outline-none focus:border-indigo-500 text-center text-lg font-medium"
                  max={balance}
                />
                <button onClick={toggleOnlineMode} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-lg shadow-indigo-900/20">
                  <WifiOff className="w-5 h-5" /> Lock & Go Offline
                </button>
              </div>
            </div>
          ) : (
            <button onClick={toggleOnlineMode} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-lg shadow-emerald-900/20">
              <Wifi className="w-5 h-5" /> Go Online & Refund (${allowanceAmount})
            </button>
          )}
        </section>

        {/* Offline Payment Section */}
        <section className={`bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-500 ${isOnline ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold brand-text flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Send Payment
            </h2>
          </div>

          <div className="flex gap-3 mb-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input 
                type="number" 
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="bg-slate-950/50 border border-slate-700/50 text-white rounded-xl pl-8 pr-4 py-4 w-full focus:outline-none focus:border-blue-500 text-xl font-bold"
                min="1"
                max={allowanceAmount}
              />
            </div>
            <button 
              onClick={generateVoucher}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-4 rounded-xl font-medium transition-colors text-white shadow-lg shadow-blue-900/20 flex items-center justify-center"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-6 text-center">Amount must be less than offline allowance.</p>

          {voucher && (
            <div className="mt-4 bg-white rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-inner animate-in zoom-in-95 duration-300">
              <div className="absolute -top-3 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">Ready to Scan</div>
              <h3 className="text-slate-900 text-3xl font-black mb-1 mt-2">${voucher.amount.toFixed(2)}</h3>
              <p className="text-slate-500 text-xs mb-6 font-medium">Show this QR to the Merchant</p>
              <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 mb-2">
                <QRCode value={JSON.stringify(voucher)} size={180} level="L" />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
