import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CheckCircle2, AlertCircle, ScanLine, Send, Layers, X, Key, Wallet } from 'lucide-react';
import { ethers } from 'ethers';
import { Scanner } from '@yudiel/react-qr-scanner';

const BACKEND_URL = import.meta.env.PROD ? "https://monad-b768.onrender.com" : "";

export default function MerchantApp() {
  const [merchantWallet, setMerchantWallet] = useState(null);
  const [privateKeyInput, setPrivateKeyInput] = useState("");
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

  const createRandomWallet = () => {
    const wallet = ethers.Wallet.createRandom();
    setMerchantWallet(wallet);
  };

  const loginWithKey = () => {
    try {
      const wallet = new ethers.Wallet(privateKeyInput);
      setMerchantWallet(wallet);
    } catch (e) {
      alert("Invalid Private Key!");
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
        fetchBalance(); // Refresh balance after settling!
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
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Merchant Login</h2>
          <button onClick={createRandomWallet} className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-medium mb-6 transition-colors">
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
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 mb-4 text-white focus:outline-none focus:border-purple-500"
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
      <header className="max-w-md w-full flex flex-col items-center text-center mb-6 pb-4 border-b border-slate-800">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <ScanLine className="w-8 h-8 text-purple-400" />
          Monad Merchant App
        </h1>
        <p className="text-slate-400 mt-2 text-sm">Scan offline vouchers and settle online.</p>
      </header>

      <main className="max-w-md w-full space-y-6">
        
        {/* Merchant Dashboard */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-semibold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Store Balance
            </h2>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Total Settled</span>
            <span className="text-3xl font-bold text-white">${balance.toFixed(2)}</span>
          </div>
          <div className="mt-4 text-xs text-slate-500 font-mono bg-slate-950 p-2 rounded">
            Addr: <span className="text-purple-400">{merchantWallet.address}</span>
          </div>
        </section>

        {/* Point of Sale Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-purple-400" />
              Point of Sale
            </h2>
            <div className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
               {settlementStatus === 'processing' ? <Wifi className="w-3 h-3 text-green-400 animate-pulse" /> : <WifiOff className="w-3 h-3 text-red-400" />}
              {settlementStatus === 'processing' ? 'Connecting...' : 'Online'}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[200px] mb-6 relative">
            {!isScannerOpen ? (
              <button
                onClick={() => setIsScannerOpen(true)}
                disabled={scanStatus !== 'idle' && scanStatus !== 'error' && scanStatus !== 'success'}
                className={`relative overflow-hidden group w-full max-w-xs flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all duration-300 ${
                  scanStatus === 'idle' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                  scanStatus === 'scanning' ? 'bg-slate-700 text-slate-300' :
                  scanStatus === 'success' ? 'bg-green-600 text-white' :
                  'bg-red-600 text-white'
                }`}
              >
                {scanStatus === 'idle' && <><ScanLine className="w-5 h-5" /> Open Camera to Scan</>}
                {scanStatus === 'scanning' && <><ScanLine className="w-5 h-5 animate-spin" /> Verifying Signature...</>}
                {scanStatus === 'success' && <><CheckCircle2 className="w-5 h-5" /> Payment Accepted</>}
                {scanStatus === 'error' && <><AlertCircle className="w-5 h-5" /> Invalid or Duplicate</>}
                
                {scanStatus === 'scanning' && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-purple-400 opacity-75 animate-[scan_1s_ease-in-out_infinite]"></div>
                )}
              </button>
            ) : (
              <div className="w-full relative overflow-hidden rounded-xl">
                <Scanner onScan={(text) => handleScan(text)} onError={(e) => console.log(e)} />
                <button 
                  onClick={() => setIsScannerOpen(false)}
                  className="absolute top-2 right-2 bg-slate-800/80 text-white p-2 rounded-full backdrop-blur-sm z-50 hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <p className="text-xs text-slate-500 mt-4 text-center">
              Locally cryptographically verifies offline voucher signature.
            </p>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-end mb-3">
              <h3 className="font-semibold text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Pending Batch
              </h3>
              <span className="text-sm text-slate-400">
                Total: <span className="font-bold text-white">${merchantBatch.reduce((sum, v) => sum + v.amount, 0).toFixed(2)}</span>
              </span>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 rounded-lg flex-1 p-2 overflow-y-auto min-h-[150px] mb-4 space-y-2">
              {merchantBatch.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-600">
                  No pending offline transactions.
                </div>
              ) : (
                merchantBatch.map((tx, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded p-3 flex justify-between items-center animate-in fade-in">
                    <div>
                      <div className="text-white font-medium">${tx.amount.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 truncate max-w-[150px]">{tx.nonce}</div>
                    </div>
                    <div className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">
                      Valid Sig
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={settleBatch}
              disabled={merchantBatch.length === 0 || settlementStatus === 'processing'}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                merchantBatch.length === 0 || settlementStatus === 'processing' 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : settlementStatus === 'success'
                  ? 'bg-green-600 text-white'
                  : settlementStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {settlementStatus === 'idle' && <><Send className="w-4 h-4" /> Settle Batch (Online)</>}
              {settlementStatus === 'processing' && <><Layers className="w-4 h-4 animate-bounce" /> Submitting to Monad...</>}
              {settlementStatus === 'success' && <><CheckCircle2 className="w-4 h-4" /> Settlement Complete!</>}
              {settlementStatus === 'error' && <><AlertCircle className="w-4 h-4" /> Settlement Failed</>}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
