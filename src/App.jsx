import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PayerApp from './Payer';
import MerchantApp from './Merchant';
import { Smartphone, ScanLine } from 'lucide-react';

function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-8">
        Monad Offline Pay
      </h1>
      <div className="flex flex-col md:flex-row gap-6">
        <Link to="/payee" className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:bg-slate-800 transition-colors flex flex-col items-center group w-64">
          <Smartphone className="w-16 h-16 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
          <h2 className="text-2xl font-bold">Payee App</h2>
          <p className="text-slate-400 text-center text-sm mt-2">Generate and sign offline vouchers</p>
        </Link>
        <Link to="/merchant" className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:bg-slate-800 transition-colors flex flex-col items-center group w-64">
          <ScanLine className="w-16 h-16 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
          <h2 className="text-2xl font-bold">Merchant App</h2>
          <p className="text-slate-400 text-center text-sm mt-2">Scan vouchers and settle batches</p>
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
      </Routes>
    </Router>
  );
}