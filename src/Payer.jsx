import React, { useState, useEffect } from 'react';
import { Smartphone, WifiOff, Wifi, CheckCircle2, Wallet } from 'lucide-react';
import { ethers } from 'ethers';
import QRCode from 'react-qr-code';

export default function PayerApp() {
  const [payerWallet, setPayerWallet] = useState(null);
  const [allowanceLocked, setAllowanceLocked] = useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState(50);
  const [payAmount, setPayAmount] = useState(10);
  const [voucher, setVoucher] = useState(null);
  const [nonceCounter, setNonceCounter] = useState(1);

  const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    setPayerWallet(ethers.Wallet.createRandom());
  }, []);

  const generateVoucher = async () => {
    if (!allowanceLocked) {
      alert("Please lock an allowance first!");
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="max-w-md w-full flex flex-col items-center text-center mb-8 pb-4 border-b border-slate-800">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Smartphone className="w-8 h-8 text-blue-400" />
          Monad Payer App
        </h1>
        <p className="text-slate-400 mt-2 text-sm">Generate offline payment vouchers securely.</p>
        <div className="mt-4 px-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-300">
          Wallet: <span className="font-mono text-[10px] text-blue-400">{payerWallet?.address || 'Loading...'}</span>
        </div>
      </header>

      <main className="max-w-md w-full">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Pay
            </h2>
            <div className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
              {allowanceLocked ? <WifiOff className="w-3 h-3 text-red-400" /> : <Wifi className="w-3 h-3 text-green-400" />}
              {allowanceLocked ? 'Airplane Mode' : 'Online'}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400 text-sm">Available Allowance</span>
                <span className="text-2xl font-bold text-white">${allowanceAmount.toFixed(2)}</span>
              </div>
              
              {!allowanceLocked ? (
                <button 
                  onClick={() => setAllowanceLocked(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition-colors font-medium"
                >
                  <Wallet className="w-4 h-4" />
                  Lock $50 Allowance (Online)
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 p-2 rounded">
                  <CheckCircle2 className="w-4 h-4" />
                  Allowance locked on contract. Key authorized.
                </div>
              )}
            </div>

            <div className={`transition-opacity duration-300 ${!allowanceLocked ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
                  className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Generate Voucher
                </button>
              </div>

              {voucher && (
                <div className="mt-6 bg-white rounded-xl p-6 flex flex-col items-center justify-center relative shadow-inner animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-slate-900 font-bold mb-4">Show to Merchant Scanner</h3>
                  <div className="w-48 h-48 bg-white p-2 rounded-lg flex items-center justify-center mb-4">
                    <QRCode value={JSON.stringify(voucher)} size={176} level="L" />
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-left overflow-x-auto">
                    <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Signed Payload (JSON)</p>
                    <pre className="text-[9px] text-slate-800 font-mono">
{JSON.stringify(voucher, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
