import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CheckCircle2, AlertCircle, ScanLine, Send, Layers, X, Key, Wallet, User, Lock, Activity } from 'lucide-react';
import { ethers } from 'ethers';
import { Scanner } from '@yudiel/react-qr-scanner';

const BACKEND_URL = import.meta.env.PROD ? "https://monad-b768.onrender.com" : "";

export default function MerchantApp() {
  const [merchantWallet, setMerchantWallet] = useState(null);
  
  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [balance, setBalance] = useState(0);
  const [merchantBatch, setMerchantBatch] = useState([]);
  const [settlementStatus, setSettlementStatus] = useState('idle');
  const [scanStatus, setScanStatus] = useState('idle');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    if (merchantWallet) {
      fetchBalance();
    }
  }, [merchantWallet]);

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: merchantWallet.address })
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
          const wallet = new ethers.Wallet(data.privateKey);
          setMerchantWallet(wallet);
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

  const handleScan = async (text) => {
    if (text && text.length > 0) {
      const payloadString = text[0].rawValue;
      setIsScannerOpen(false);
      setScanStatus('scanning');
      
      setTimeout(async () => {
        try {
          const scannedVoucher = JSON.parse(payloadString);
          
          if (!scannedVoucher.signature || !scannedVoucher.amount || !scannedVoucher.nonce) {
            throw new Error("Invalid payload format");
          }

          const isDuplicate = merchantBatch.some(v => v.nonce === scannedVoucher.nonce);
          
          if (!isDuplicate) {
            const message = JSON.stringify({ 
              amount: scannedVoucher.amount, 
              nonce: scannedVoucher.nonce, 
              expiry: scannedVoucher.expiry, 
              contractAddress: CONTRACT_ADDRESS 
            });
            const recoveredAddress = ethers.verifyMessage(message, scannedVoucher.signature);

            if (recoveredAddress === scannedVoucher.payerAddress) {
              setMerchantBatch(prev => [...prev, scannedVoucher]);
              setScanStatus('success');
            } else {
              setScanStatus('error');
            }
          } else {
            setScanStatus('error');
          }
        } catch (e) {
          setScanStatus('error');
        }
        
        setTimeout(() => setScanStatus('idle'), 3000);
      }, 500);
    }
  };

  const settleBatch = async () => {
    if (merchantBatch.length === 0) return;
    setSettlementStatus('processing');
    try {
      const response = await fetch(`${BACKEND_URL}/api/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: merchantBatch, merchantAddress: merchantWallet.address })
      });
      const data = await response.json();
      if (data.success) {
        setMerchantBatch([]);
        setSettlementStatus('success');
        fetchBalance(); 
        setTimeout(() => setSettlementStatus('idle'), 3000);
      } else {
        setSettlementStatus('error');
        setTimeout(() => setSettlementStatus('idle'), 3000);
      }
    } catch (e) {
      setSettlementStatus('error');
      setTimeout(() => setSettlementStatus('idle'), 3000);
    }
  };

  if (!merchantWallet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
        <div className="max-w-md w-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-amber-500/20">
            <ScanLine className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-center brand-text text-white">Merchant POS</h2>
          <p className="text-zinc-400 text-center mb-8 text-sm">Sign in to manage your store terminal.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Username" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="password" 
                placeholder="Password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
            <button type="submit" disabled={authLoading} className="w-full bg-amber-600 hover:bg-amber-500 py-3 rounded-xl font-medium transition-all shadow-lg shadow-amber-900/20 mt-4 flex justify-center items-center gap-2 text-white border border-amber-500/50">
              {authLoading ? <Activity className="w-5 h-5 animate-spin" /> : (isRegistering ? "Create Account" : "Sign In")}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-zinc-400">
            {isRegistering ? "Already have an account?" : "Need an account?"}{" "}
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-amber-400 hover:text-amber-300 font-medium">
              {isRegistering ? "Sign In" : "Register"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
      
      <header className="max-w-md w-full flex flex-col items-center text-center mb-6 pb-6 border-b border-white/5 relative z-10">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
          <ScanLine className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold brand-text text-white mb-2">
          Monad Terminal
        </h1>
        <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-xl p-4 w-full mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Merchant Profile</span>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">{username}</span>
          </div>
          <p className="font-mono text-xs text-zinc-400 truncate">{merchantWallet.address}</p>
        </div>
      </header>

      <main className="max-w-md w-full space-y-6 relative z-10">
        
        {/* Merchant Dashboard */}
        <section className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-semibold brand-text flex items-center gap-2 text-white">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Store Balance
            </h2>
          </div>
          <div className="bg-zinc-950/80 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Total Settled</span>
            <span className="text-4xl font-bold text-white">${balance.toFixed(2)}</span>
          </div>
        </section>

        {/* Point of Sale Section */}
        <section className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold brand-text flex items-center gap-2 text-white">
              <ScanLine className="w-5 h-5 text-amber-400" />
              Point of Sale
            </h2>
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium border ${settlementStatus === 'processing' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
               {settlementStatus === 'processing' ? <Wifi className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
              {settlementStatus === 'processing' ? 'Connecting...' : 'Online'}
            </div>
          </div>

          <div className="bg-zinc-950/80 rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center min-h-[200px] mb-6 relative">
            {!isScannerOpen ? (
              <button
                onClick={() => setIsScannerOpen(true)}
                disabled={scanStatus !== 'idle' && scanStatus !== 'error' && scanStatus !== 'success'}
                className={`relative overflow-hidden group w-full max-w-xs flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg ${
                  scanStatus === 'idle' ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20 border border-amber-500/50' :
                  scanStatus === 'scanning' ? 'bg-zinc-800 text-zinc-300' :
                  scanStatus === 'success' ? 'bg-emerald-600 text-white border border-emerald-500/50' :
                  'bg-red-600 text-white border border-red-500/50'
                }`}
              >
                {scanStatus === 'idle' && <><ScanLine className="w-5 h-5" /> Open Camera to Scan</>}
                {scanStatus === 'scanning' && <><ScanLine className="w-5 h-5 animate-spin" /> Verifying Signature...</>}
                {scanStatus === 'success' && <><CheckCircle2 className="w-5 h-5" /> Payment Accepted</>}
                {scanStatus === 'error' && <><AlertCircle className="w-5 h-5" /> Invalid or Duplicate</>}
                
                {scanStatus === 'scanning' && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 opacity-75 animate-[scan_1s_ease-in-out_infinite]"></div>
                )}
              </button>
            ) : (
              <div className="w-full relative overflow-hidden rounded-2xl border-4 border-amber-500/30">
                <Scanner onScan={(text) => handleScan(text)} onError={(e) => console.log(e)} />
                <button 
                  onClick={() => setIsScannerOpen(false)}
                  className="absolute top-3 right-3 bg-zinc-900/80 text-white p-2 rounded-full backdrop-blur-md z-50 hover:bg-zinc-800 border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <p className="text-xs text-zinc-500 mt-4 text-center font-medium">
              Locally cryptographically verifies offline voucher signature.
            </p>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-end mb-3">
              <h3 className="font-semibold text-zinc-300 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Pending Batch
              </h3>
              <span className="text-sm text-zinc-400">
                Total: <span className="font-bold text-white text-lg ml-1">${merchantBatch.reduce((sum, v) => sum + v.amount, 0).toFixed(2)}</span>
              </span>
            </div>
            
            <div className="bg-zinc-950/80 border border-white/5 rounded-2xl flex-1 p-2 overflow-y-auto min-h-[150px] mb-4 space-y-2">
              {merchantBatch.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-600 font-medium">
                  No pending offline transactions.
                </div>
              ) : (
                merchantBatch.map((tx, idx) => (
                  <div key={idx} className="bg-zinc-900/80 border border-white/5 rounded-xl p-3 flex justify-between items-center animate-in fade-in">
                    <div>
                      <div className="text-white font-bold">${tx.amount.toFixed(2)}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1 truncate max-w-[150px]">{tx.nonce}</div>
                    </div>
                    <div className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Valid Sig
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={settleBatch}
              disabled={merchantBatch.length === 0 || settlementStatus === 'processing'}
              className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg border ${
                merchantBatch.length === 0 || settlementStatus === 'processing' 
                  ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-white/5' 
                  : settlementStatus === 'success'
                  ? 'bg-emerald-600 text-white shadow-emerald-900/20 border-emerald-500/50'
                  : settlementStatus === 'error'
                  ? 'bg-red-600 text-white border-red-500/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 border-emerald-500/50'
              }`}
            >
              {settlementStatus === 'idle' && <><Send className="w-5 h-5" /> Settle Batch on Monad</>}
              {settlementStatus === 'processing' && <><Layers className="w-5 h-5 animate-bounce" /> Submitting to Contract...</>}
              {settlementStatus === 'success' && <><CheckCircle2 className="w-5 h-5" /> Settlement Complete!</>}
              {settlementStatus === 'error' && <><AlertCircle className="w-5 h-5" /> Settlement Failed</>}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
