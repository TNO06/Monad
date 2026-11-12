import React, { useState, useEffect, useCallback } from 'react';
import { 
  Smartphone, 
  WifiOff, 
  Wifi, 
  CheckCircle2, 
  Wallet, 
  User, 
  Lock, 
  ArrowRight, 
  Activity, 
  Copy, 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { ethers } from 'ethers';
import QRCode from 'react-qr-code';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { 
  registerUser, 
  loginUser, 
  getAccount, 
  lockFunds, 
  unlockFunds 
} from './services/api';

export default function PayerApp() {
  const [payerWallet, setPayerWallet] = useState(null);
  
  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isOnline, setIsOnline] = useState(true);
  
  // Balances
  const [balance, setBalance] = useState(0);
  const [allowanceAmount, setAllowanceAmount] = useState(0); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Payment
  const [payAmount, setPayAmount] = useState(10);
  const [lockInput, setLockInput] = useState(50);
  const [voucher, setVoucher] = useState(null);
  const [nonceCounter, setNonceCounter] = useState(1);
  const [copiedVoucher, setCopiedVoucher] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [history, setHistory] = useState([]);

  const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

  const fetchBalance = useCallback(async (manual = false) => {
    if (!payerWallet) return;
    if (manual) setIsRefreshing(true);
    try {
      const data = await getAccount(payerWallet.address);
      setBalance(Number(data.balance || 0));
      if (data.locked !== undefined) {
        setAllowanceAmount(Number(data.locked || 0));
      }
    } catch (err) {
      console.error("Failed to fetch balance", err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, [payerWallet]);

  useEffect(() => {
    if (payerWallet && isOnline) {
      fetchBalance();
    }
  }, [payerWallet, isOnline, fetchBalance]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      const data = isRegistering 
        ? await registerUser(username, password)
        : await loginUser(username, password);
      
      if (data.success) {
        if (isRegistering) {
          setSuccessMessage(data.message || "Account created successfully! Please sign in.");
          setIsRegistering(false);
        } else {
          const wallet = new ethers.Wallet(data.privateKey);
          setPayerWallet(wallet);
        }
      } else {
        setErrorMessage(data.error || "Authentication failed");
      }
    } catch {
      setErrorMessage("Could not connect to database. Please check configuration.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsername("demo_payer");
    setPassword("password123");
  };

  const handleLogout = () => {
    setPayerWallet(null);
    setUsername("");
    setPassword("");
    setVoucher(null);
    setHistory([]);
    setIsOnline(true);
  };

  const toggleOnlineMode = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (isOnline) {
      const numLock = Number(lockInput);
      if (numLock <= 0 || numLock > balance) {
        setErrorMessage(`Please enter a valid amount between $1 and $${balance.toFixed(2)}`);
        return;
      }
      try {
        const data = await lockFunds(payerWallet.address, numLock);
        if (data.success) {
          setBalance(data.balance);
          setAllowanceAmount(numLock);
          setIsOnline(false);
          setVoucher(null); 
        } else {
          setErrorMessage(data.error || "Lock failed");
        }
      } catch {
        setErrorMessage("Network error while locking allowance.");
      }
    } else {
      try {
        const data = await unlockFunds(payerWallet.address, allowanceAmount);
        if (data.success) {
          setBalance(data.balance);
          setAllowanceAmount(0);
          setIsOnline(true);
          setVoucher(null);
          
          // Show auto-refund details if expired lock refunded unsettled vouchers
          if (data.expired && data.autoRefunded > 0) {
            setSuccessMessage(
              `Vault unlocked! $${Number(data.refunded).toFixed(2)} refunded to your balance ` +
              `(including $${Number(data.autoRefunded).toFixed(2)} auto-recovered from expired unsettled vouchers).`
            );
          } else {
            setSuccessMessage(`Vault unlocked! $${Number(data.refunded || allowanceAmount).toFixed(2)} refunded to your on-chain balance.`);
          }
        } else {
          setErrorMessage(data.error || "Unlock failed");
        }
      } catch {
        setErrorMessage("Error refunding allowance. Please verify connection.");
      }
    }
  };

  const generateVoucher = async () => {
    setErrorMessage("");
    if (isOnline) {
      setErrorMessage("Please lock allowance and activate Offline Mode first.");
      return;
    }
    if (payAmount <= 0 || payAmount > allowanceAmount) {
      setErrorMessage(`Payment must be between $1 and your available allowance ($${allowanceAmount.toFixed(2)})`);
      return;
    }

    try {
      const nonce = `monad-tx-${Date.now().toString(36)}-${nonceCounter}`;
      const expiry = new Date(Date.now() + 3600000).toISOString();
      
      const message = JSON.stringify({ 
        amount: payAmount, 
        nonce, 
        expiry, 
        contractAddress: CONTRACT_ADDRESS 
      });
      const signature = await payerWallet.signMessage(message);

      const newVoucher = {
        amount: payAmount,
        nonce,
        expiry,
        signature,
        payerAddress: payerWallet.address,
        timestamp: new Date().toLocaleTimeString()
      };

      setVoucher(newVoucher);
      setHistory(prev => [newVoucher, ...prev]);
      setNonceCounter(prev => prev + 1);
      setAllowanceAmount(prev => Math.max(0, prev - payAmount));
    } catch {
      setErrorMessage("Failed to generate cryptographic signature.");
    }
  };

  const copyVoucherJSON = () => {
    if (!voucher) return;
    navigator.clipboard.writeText(JSON.stringify(voucher));
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

  // 1. Authentication View
  if (!payerWallet) {
    return (
      <div className="min-h-screen flex flex-col bg-[#070709] text-zinc-100 selection:bg-purple-500/30">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[150px]"></div>
          <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        </div>

        <Navbar />

        <div className="flex-1 flex items-center justify-center p-4 relative z-10 py-12">
          <div className="max-w-md w-full glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-purple-500"></div>

            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-emerald-500/20 text-emerald-400">
              <Smartphone className="w-8 h-8" />
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-white">
                Customer Portal
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                Access your Monad offline payment vault
              </p>
            </div>

            {/* Error or Success notification */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="e.g. alice" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={authLoading} 
                className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3.5 rounded-xl font-semibold text-sm text-white transition-all shadow-lg shadow-emerald-950/40 border border-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  isRegistering ? "Create Account & Generate Wallet" : "Sign In to Vault"
                )}
              </button>
            </form>

            {/* Quick Demo Helper */}
            <div className="mt-5 pt-5 border-t border-white/5 flex flex-col gap-3 text-center">
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors py-1 px-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mx-auto"
              >
                Auto-fill Demo Credentials
              </button>

              <div className="text-xs text-zinc-400">
                {isRegistering ? "Already have an account?" : "Need an account?"}{" "}
                <button 
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }} 
                  className="text-emerald-400 hover:text-emerald-300 font-semibold ml-1 underline underline-offset-4"
                >
                  {isRegistering ? "Sign In" : "Register New Account"}
                </button>
              </div>
            </div>

          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // 2. Authenticated Customer Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-[#070709] text-zinc-100 selection:bg-purple-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[5%] left-[20%] w-[600px] h-[600px] rounded-full blur-[160px] transition-all duration-700 ${isOnline ? 'bg-emerald-500/10' : 'bg-amber-500/15'}`}></div>
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      </div>

      <Navbar 
        user={{ username, address: payerWallet.address }} 
        onLogout={handleLogout}
        role="customer"
      />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 relative z-10 space-y-6">
        
        {/* Network & Protocol Status Bar */}
        <div className="flex items-center justify-between bg-zinc-900/60 backdrop-blur-md border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'}`}></div>
            <div>
              <span className="text-xs font-semibold text-white block">
                {isOnline ? 'Connected to Monad' : 'Offline Vault Mode Active'}
              </span>
              <span className="text-[11px] text-zinc-500">
                {isOnline ? 'Can lock allowance or settle balances' : 'Generate cryptographic vouchers offline'}
              </span>
            </div>
          </div>

          <button
            onClick={() => fetchBalance(true)}
            disabled={!isOnline || isRefreshing}
            className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 border border-white/5 text-zinc-400 hover:text-white transition-all disabled:opacity-30"
            title="Refresh On-Chain Balance"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage("")} className="text-zinc-500 hover:text-zinc-300 text-xs ml-2">Dismiss</button>
          </div>
        )}

        {/* Success Banner (auto-refund notifications etc.) */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-zinc-500 hover:text-zinc-300 text-xs ml-2">Dismiss</button>
          </div>
        )}

        {/* Dual Balance Cards */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* On-Chain Balance */}
          <div className="glass-panel p-5 rounded-3xl relative overflow-hidden border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                On-Chain
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Online
              </span>
            </div>
            <div className="text-3xl font-bold font-['Outfit'] text-white">
              ${balance.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Available to lock</div>
          </div>

          {/* Offline Vault Allowance */}
          <div className={`glass-panel p-5 rounded-3xl relative overflow-hidden transition-all ${allowanceAmount > 0 ? 'border-amber-500/30 shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)]' : 'border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Offline Vault
              </span>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${allowanceAmount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-500 border-white/5'}`}>
                Allowance
              </span>
            </div>
            <div className={`text-3xl font-bold font-['Outfit'] ${allowanceAmount > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
              ${allowanceAmount.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Ready to spend</div>
          </div>

        </div>

        {/* Mode & Allowance Controller */}
        <section className={`glass-panel rounded-3xl p-6 transition-all relative overflow-hidden ${isOnline ? 'border-white/10' : 'border-amber-500/30 bg-amber-950/10'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-['Outfit'] text-white text-base flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
              {isOnline ? 'Offline Allowance Vault' : 'Active Offline Session'}
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              {isOnline ? 'Step 1: Lock Funds' : 'Step 2: Sign Vouchers'}
            </span>
          </div>

          {isOnline ? (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deposit and lock funds into your offline cryptographic vault before disconnecting.
              </p>

              {/* Amount Presets */}
              <div className="flex items-center gap-2">
                {[10, 25, 50, 100].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setLockInput(amt)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      lockInput === amt 
                        ? 'bg-purple-600/30 border-purple-500/50 text-purple-200' 
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setLockInput(Math.floor(balance))}
                  className="py-1.5 px-3 rounded-xl text-xs font-medium bg-zinc-900/60 border border-white/5 text-zinc-400 hover:text-white"
                >
                  Max
                </button>
              </div>

              {/* Lock Input & Action */}
              <div className="flex gap-3">
                <div className="relative w-32">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">$</span>
                  <input 
                    type="number" 
                    value={lockInput}
                    onChange={(e) => setLockInput(Number(e.target.value))}
                    max={balance}
                    min={1}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-8 pr-3 py-3 text-white text-base font-semibold focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <button 
                  onClick={toggleOnlineMode}
                  disabled={balance <= 0}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-amber-950/40 border border-amber-500/40 disabled:opacity-40 cursor-pointer"
                >
                  <WifiOff className="w-4 h-4" />
                  <span>Lock & Activate Offline Vault</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                <span>Vault active with <strong>${allowanceAmount.toFixed(2)}</strong> allowance.</span>
                <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full">Offline Safe</span>
              </div>

              <button 
                onClick={toggleOnlineMode}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all border border-white/10 cursor-pointer"
              >
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Reconnect to Monad & Refund Unused (${allowanceAmount.toFixed(2)})</span>
              </button>
            </div>
          )}
        </section>

        {/* Offline Payment Voucher Generation */}
        <section className={`glass-panel rounded-3xl p-6 transition-all ${isOnline ? 'opacity-50 pointer-events-none' : 'border-white/15'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-['Outfit'] text-white text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Generate Payment Voucher
            </h3>
            {isOnline && (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Unlock vault first
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Payment Amount Presets */}
            <div className="flex items-center gap-2">
              {[5, 10, 20, 50].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPayAmount(amt)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    payAmount === amt 
                      ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-200' 
                      : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Payment Input & Generate Button */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-lg font-bold">$</span>
                <input 
                  type="number" 
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  min={1}
                  max={allowanceAmount}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-xl font-bold text-white focus:outline-none focus:border-emerald-500/50 font-['Outfit']"
                />
              </div>

              <button 
                onClick={generateVoucher}
                disabled={isOnline || allowanceAmount < payAmount || payAmount <= 0}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-emerald-950/40 border border-emerald-500/40 disabled:opacity-40 cursor-pointer"
              >
                <span>Sign Voucher</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 text-center">
              Signs an ECDSA message using your local private key with zero network access.
            </p>
          </div>

          {/* Generated Voucher Display */}
          {voucher && (
            <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/15 rounded-3xl p-6 flex flex-col items-center relative shadow-2xl">
                
                <div className="absolute -top-3 px-3 py-1 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Ready for Merchant Scan</span>
                </div>

                <div className="text-center my-3">
                  <span className="text-xs text-zinc-400">Offline Payment Voucher</span>
                  <div className="text-4xl font-extrabold font-['Outfit'] text-white">
                    ${voucher.amount.toFixed(2)}
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="p-3.5 bg-white rounded-2xl shadow-xl my-3 border border-zinc-200">
                  <QRCode value={JSON.stringify(voucher)} size={190} level="L" />
                </div>

                {/* Expiry / Nonce */}
                <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2 mb-4 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Valid 60m
                  </span>
                  <span>•</span>
                  <span>{voucher.nonce}</span>
                </div>

                {/* Copy JSON Button for Demo without Camera */}
                <button
                  onClick={copyVoucherJSON}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-xs font-medium text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedVoucher ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Voucher Payload Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Voucher JSON (for manual demo scan)</span>
                    </>
                  )}
                </button>

                {/* Cryptographic Details Drawer */}
                <div className="w-full mt-4 pt-3 border-t border-white/5">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex items-center justify-between text-[11px] text-zinc-500 hover:text-zinc-300 py-1"
                  >
                    <span>Cryptographic Signature Proof</span>
                    {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showDetails && (
                    <div className="mt-2 p-3 rounded-xl bg-zinc-950 border border-white/5 font-mono text-[10px] text-zinc-400 space-y-1.5 break-all">
                      <div><span className="text-zinc-600">Payer:</span> {voucher.payerAddress}</div>
                      <div><span className="text-zinc-600">Nonce:</span> {voucher.nonce}</div>
                      <div><span className="text-zinc-600">Signature:</span> {voucher.signature.slice(0, 32)}...</div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </section>

        {/* Voucher History Section */}
        {history.length > 0 && (
          <section className="glass-panel rounded-3xl p-6">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Session Vouchers ({history.length})
            </h4>
            <div className="space-y-2">
              {history.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs">
                  <div>
                    <span className="font-bold text-white">${item.amount.toFixed(2)}</span>
                    <span className="text-zinc-500 font-mono ml-2 text-[11px]">{item.nonce}</span>
                  </div>
                  <span className="text-emerald-400 font-mono text-[11px]">{item.timestamp}</span>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Footer with Contact Dev */}
      <Footer />
    </div>
  );
}
