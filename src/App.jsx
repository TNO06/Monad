import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PayerApp from './Payer';
import MerchantApp from './Merchant';
import AdminApp from './Admin';
import { Smartphone, ScanLine, ShieldCheck } from 'lucide-react';

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      
      <div className="text-center z-10 mb-16 animate-in slide-in-from-bottom-8 duration-700">
        <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold tracking-wide mb-6">
          v2.0 • HACKATHON EDITION
        </div>
        <h1 className="text-6xl md:text-8xl font-bold brand-text tracking-tight mb-4">
          Monad <span className="bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Pay</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto font-light">
          The future of offline payments. Generate secure cryptographic vouchers offline and settle on-chain instantly.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 z-10 w-full max-w-4xl justify-center">
        
        {/* Payer Card */}
        <Link to="/payee" className="group flex-1 bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl hover:bg-slate-800/60 hover:border-blue-500/30 transition-all duration-500 flex flex-col items-center hover:-translate-y-2 shadow-2xl hover:shadow-blue-500/20">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-blue-500/20 group-hover:bg-blue-500/20">
            <Smartphone className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold brand-text text-white mb-2">Customer App</h2>
          <p className="text-slate-400 text-center text-sm leading-relaxed">Lock allowances online, then generate cryptographic payment vouchers completely offline.</p>
        </Link>

        {/* Merchant Card */}
        <Link to="/merchant" className="group flex-1 bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl hover:bg-slate-800/60 hover:border-purple-500/30 transition-all duration-500 flex flex-col items-center hover:-translate-y-2 shadow-2xl hover:shadow-purple-500/20">
          <div className="w-20 h-20 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-purple-500/20 group-hover:bg-purple-500/20">
            <ScanLine className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold brand-text text-white mb-2">Merchant POS</h2>
          <p className="text-slate-400 text-center text-sm leading-relaxed">Scan offline vouchers, verify signatures locally, and batch settle directly to the blockchain.</p>
        </Link>

      </div>
      
      {/* Admin Link at bottom */}
      <div className="fixed bottom-8 z-10">
        <Link to="/admin" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/5">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-sm font-medium">Admin Portal</span>
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/payee" element={<PayerApp />} />
        <Route path="/merchant" element={<MerchantApp />} />
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </Router>
  );
}