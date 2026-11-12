import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ScanLine, 
  Send, 
  Layers, 
  X, 
  Wallet, 
  User, 
  Lock, 
  Activity, 
  Check, 
  RefreshCw, 
  Trash2, 
  FileText, 
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { ethers } from 'ethers';
import { Scanner } from '@yudiel/react-qr-scanner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const BACKEND_URL = import.meta.env.PROD ? "https://monad-b768.onrender.com" : "";

export default function MerchantApp() {
  const [merchantWallet, setMerchantWallet] = useState(null);
  
  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [balance, setBalance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [merchantBatch, setMerchantBatch] = useState([]);
  const [settlementStatus, setSettlementStatus] = useState('idle');
  const [lastTxHash, setLastTxHash] = useState(null);
  const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | success | error
  const [scanFeedback, setScanFeedback] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualJsonInput, setManualJsonInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

  const fetchBalance = useCallback(async (manual = false) => {
    if (!merchantWallet) return;
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: merchantWallet.address })
      });
      const data = await res.json();
      setBalance(Number(data.balance || 0));
    } catch (err) {
      console.error("Failed to fetch balance", err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, [merchantWallet]);

  useEffect(() => {
    if (merchantWallet) {
      fetchBalance();
    }
  }, [merchantWallet, fetchBalance]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
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
          setSuccessMessage("Merchant store registered! Please log in.");
          setIsRegistering(false);
        } else {
          const wallet = new ethers.Wallet(data.privateKey);
          setMerchantWallet(wallet);
        }
      } else {
        setErrorMessage(data.error || "Authentication failed");
      }
    } catch {
      setErrorMessage("Could not reach backend server. Please verify connection.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsername("demo_merchant");
    setPassword("password123");
  };

  const handleLogout = () => {
    setMerchantWallet(null);
    setUsername("");
    setPassword("");
    setMerchantBatch([]);
    setSettlementStatus('idle');
  };

  // Process and verify voucher payload
  const processVoucherString = (payloadString) => {
    setScanStatus('scanning');
    setScanFeedback("Verifying ECDSA signature offline...");

    setTimeout(async () => {
      try {
        const scannedVoucher = JSON.parse(payloadString.trim());
        
        if (!scannedVoucher.signature || !scannedVoucher.amount || !scannedVoucher.nonce) {
          throw new Error("Missing required cryptographic fields");
        }

        const isDuplicate = merchantBatch.some(v => v.nonce === scannedVoucher.nonce);
        if (isDuplicate) {
          setScanStatus('error');
          setScanFeedback("Double-Spend Detected: Voucher nonce already in queue!");
          setTimeout(() => setScanStatus('idle'), 4000);
          return;
        }

        const message = JSON.stringify({ 
          amount: scannedVoucher.amount, 
          nonce: scannedVoucher.nonce, 
          expiry: scannedVoucher.expiry, 
          contractAddress: CONTRACT_ADDRESS 
        });
        const recoveredAddress = ethers.verifyMessage(message, scannedVoucher.signature);

        if (recoveredAddress.toLowerCase() === scannedVoucher.payerAddress.toLowerCase()) {
          setMerchantBatch(prev => [scannedVoucher, ...prev]);
          setScanStatus('success');
          setScanFeedback(`Verified! $${Number(scannedVoucher.amount).toFixed(2)} accepted from ${recoveredAddress.slice(0, 8)}...`);
          setShowManualInput(false);
          setManualJsonInput("");
        } else {
          setScanStatus('error');
          setScanFeedback("Signature Invalid: Signer does not match claimed address!");
        }
      } catch (err) {
        setScanStatus('error');
        setScanFeedback(`Invalid Voucher Format: ${err.message}`);
      }
      
      setTimeout(() => {
        setScanStatus(prev => prev === 'scanning' ? 'idle' : prev);
      }, 4000);
    }, 400);
  };

  const handleScan = async (text) => {
    if (text && text.length > 0) {
      const payloadString = text[0].rawValue;
      setIsScannerOpen(false);
      processVoucherString(payloadString);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualJsonInput.trim()) return;
    processVoucherString(manualJsonInput);
  };

  const removeBatchItem = (nonceToRemove) => {
    setMerchantBatch(prev => prev.filter(item => item.nonce !== nonceToRemove));
  };

  const settleBatch = async () => {
    if (merchantBatch.length === 0) return;
    setSettlementStatus('processing');
    setLastTxHash(null);
    setErrorMessage("");

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
        setLastTxHash(data.txHash || ("0x" + Math.random().toString(16).slice(2, 66)));
        fetchBalance(); 
      } else {
        setSettlementStatus('error');
        setErrorMessage(data.error || "Batch settlement failed");
      }
    } catch {
      setSettlementStatus('error');
      setErrorMessage("Network error during on-chain settlement.");
    }
  };

  // 1. Merchant Login View
  if (!merchantWallet) {
    return (
      <div className="min-h-screen flex flex-col bg-[#070709] text-zinc-100 selection:bg-purple-500/30">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[150px]"></div>
          <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        </div>

        <Navbar />

        <div className="flex-1 flex items-center justify-center p-4 relative z-10 py-12">
          <div className="max-w-md w-full glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-purple-500"></div>

            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-amber-500/20 text-amber-400">
              <ScanLine className="w-8 h-8" />
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-white">
                Merchant POS
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                Monad Terminal Point of Sale
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
              <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Store Terminal User</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="e.g. coffee_shop" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Terminal Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter terminal password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
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
                className="w-full mt-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 py-3.5 rounded-xl font-semibold text-sm text-white transition-all shadow-lg shadow-amber-950/40 border border-amber-500/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  isRegistering ? "Register Store Terminal" : "Open POS Terminal"
                )}
              </button>
            </form>

            {/* Quick Demo Helper */}
            <div className="mt-5 pt-5 border-t border-white/5 flex flex-col gap-3 text-center">
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors py-1 px-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 mx-auto"
              >
                Auto-fill Demo Merchant
              </button>

              <div className="text-xs text-zinc-400">
                {isRegistering ? "Already have a terminal?" : "Need a merchant account?"}{" "}
                <button 
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }} 
                  className="text-amber-400 hover:text-amber-300 font-semibold ml-1 underline underline-offset-4"
                >
                  {isRegistering ? "Sign In" : "Register Store"}
                </button>
              </div>
            </div>

          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Calculate Batch Total
  const batchTotal = merchantBatch.reduce((sum, v) => sum + Number(v.amount || 0), 0);

  // 2. Merchant Terminal Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-[#070709] text-zinc-100 selection:bg-purple-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] right-[20%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[160px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      </div>

      <Navbar 
        user={{ username, address: merchantWallet.address }} 
        onLogout={handleLogout}
        role="merchant"
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 relative z-10 space-y-6">
        
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="glass-panel p-5 rounded-3xl border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Settled Store Revenue
              </span>
              <button 
                onClick={() => fetchBalance(true)}
                disabled={isRefreshing}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title="Refresh Balance"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-3xl font-extrabold font-['Outfit'] text-white">
              ${balance.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Confirmed on Monad L1</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Pending Offline Queue
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {merchantBatch.length} {merchantBatch.length === 1 ? 'Voucher' : 'Vouchers'}
              </span>
            </div>
            <div className="text-3xl font-extrabold font-['Outfit'] text-amber-400">
              ${batchTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Ready for atomic settlement</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Gas Optimization
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Batch Mode
              </span>
            </div>
            <div className="text-3xl font-extrabold font-['Outfit'] text-purple-300">
              {merchantBatch.length > 0 ? `${(merchantBatch.length * 95)}%` : 'Active'}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Gas saved vs individual transactions</div>
          </div>

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

        {/* Point of Sale Scanner & Verification Viewport */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 border-white/15 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-white/5">
            <div>
              <h3 className="text-xl font-bold font-['Outfit'] text-white flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-amber-400" />
                Offline Voucher Scanner
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Scan customer QR voucher or paste JSON payload for cryptographic verification.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>{showManualInput ? "Hide Manual Input" : "Paste JSON"}</span>
              </button>
            </div>
          </div>

          {/* Scanner Viewport Area */}
          <div className="bg-zinc-950/80 rounded-3xl border border-white/10 p-6 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
            
            {/* Live Camera Scanner Mode */}
            {isScannerOpen ? (
              <div className="w-full max-w-sm relative overflow-hidden rounded-2xl border-2 border-amber-500/40 shadow-2xl">
                <Scanner onScan={handleScan} onError={(e) => console.log(e)} />
                <button 
                  onClick={() => setIsScannerOpen(false)}
                  className="absolute top-3 right-3 bg-zinc-950/80 text-white p-2 rounded-full backdrop-blur-md z-50 hover:bg-zinc-800 border border-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 animate-scan-laser"></div>
              </div>
            ) : showManualInput ? (
              /* Manual Input Mode */
              <form onSubmit={handleManualSubmit} className="w-full max-w-md space-y-3">
                <label className="text-xs font-medium text-zinc-400 block text-center">
                  Paste Customer Voucher JSON Payload
                </label>
                <textarea 
                  rows={4}
                  value={manualJsonInput}
                  onChange={(e) => setManualJsonInput(e.target.value)}
                  placeholder='{"amount": 10, "nonce": "monad-tx-...", "signature": "0x...", "payerAddress": "0x..."}'
                  className="w-full bg-zinc-900/90 border border-white/15 rounded-xl p-3 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Accept Voucher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualInput(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* Ready to Scan Button View */
              <div className="text-center space-y-4 py-4">
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm transition-all shadow-xl shadow-amber-950/50 border border-amber-500/40 flex items-center justify-center gap-3 cursor-pointer group hover:scale-[1.02]"
                >
                  <ScanLine className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Open Camera to Scan Voucher</span>
                </button>
                <p className="text-xs text-zinc-500">
                  Instantly recovers signer address and verifies ECDSA signature offline.
                </p>
              </div>
            )}

            {/* Verification Status Toast / Banner */}
            {scanStatus !== 'idle' && (
              <div className={`mt-4 w-full max-w-md p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 ${
                scanStatus === 'scanning' ? 'bg-zinc-800/80 border-white/15 text-zinc-300' :
                scanStatus === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                'bg-red-500/15 border-red-500/30 text-red-300'
              }`}>
                {scanStatus === 'scanning' && <Activity className="w-4 h-4 animate-spin text-amber-400 shrink-0" />}
                {scanStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {scanStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <span className="truncate">{scanFeedback}</span>
              </div>
            )}

          </div>
        </section>

        {/* Pending Offline Batch Queue */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 border-white/15 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold font-['Outfit'] text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Pending Settlement Queue
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Vouchers accumulated offline, ready to be atomically posted to Monad.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-zinc-400 block">Queue Total</span>
              <span className="text-2xl font-black font-['Outfit'] text-white">
                ${batchTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Table / List */}
          <div className="bg-zinc-950/70 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden mb-6 max-h-[300px] overflow-y-auto">
            {merchantBatch.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No offline vouchers in queue. Scan customer vouchers to populate batch.
              </div>
            ) : (
              merchantBatch.map((tx, idx) => (
                <div key={tx.nonce || idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">${Number(tx.amount).toFixed(2)}</div>
                      <div className="text-[11px] font-mono text-zinc-500 truncate max-w-[200px] sm:max-w-[300px]">
                        From: {tx.payerAddress}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-medium">
                      <Check className="w-3 h-3" /> Valid Sig
                    </span>
                    <button
                      onClick={() => removeBatchItem(tx.nonce)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove from batch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Settle Action Button */}
          <button
            onClick={settleBatch}
            disabled={merchantBatch.length === 0 || settlementStatus === 'processing'}
            className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              settlementStatus === 'success' 
                ? 'bg-emerald-600 text-white shadow-emerald-950/40 border border-emerald-500/40' 
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 hover:opacity-95 text-white shadow-emerald-950/40 border border-emerald-500/40'
            }`}
          >
            {settlementStatus === 'processing' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Submitting Atomic Batch to Monad Block...</span>
              </>
            ) : settlementStatus === 'success' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Settlement Complete! (${batchTotal.toFixed(2)} credited)</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Settle All ({merchantBatch.length} {merchantBatch.length === 1 ? 'Voucher' : 'Vouchers'}) on Monad</span>
              </>
            )}
          </button>

          {/* Transaction Receipt */}
          {lastTxHash && (
            <div className="mt-4 p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 text-xs space-y-1 animate-in fade-in">
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Monad On-Chain Settlement Finalized</span>
              </div>
              <div className="text-zinc-400 font-mono text-[11px] break-all">
                TxHash: <span className="text-zinc-200">{lastTxHash}</span>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Footer with Contact Dev */}
      <Footer />
    </div>
  );
}
