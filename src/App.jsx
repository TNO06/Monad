import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PayerApp from './Payer';
import MerchantApp from './Merchant';
import AdminApp from './Admin';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { 
  Smartphone, 
  ScanLine, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070709] text-zinc-100 selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Ambient background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#836EF9]/10 blur-[140px]"></div>
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[160px]"></div>
        <div className="absolute bottom-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[160px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      </div>

      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 md:py-20 flex flex-col items-center relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold tracking-wide uppercase mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Monad Ecosystem • Offline Payment Layer</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold font-['Outfit'] tracking-tight mb-6 text-white leading-[1.08]">
            Pay anywhere. <br className="hidden sm:inline" />
            <span className="monad-gradient-text">Zero internet required.</span>
          </h1>

          <p className="text-zinc-400 text-lg sm:text-xl font-light leading-relaxed max-w-2xl mx-auto">
            Lock allowances on Monad's 10,000 TPS blockchain, generate offline cryptographic payment vouchers, and settle on-chain atomically in batches.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 pt-8 border-t border-white/5 max-w-2xl mx-auto text-left">
            <div className="bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5">
              <span className="text-xs text-zinc-500 uppercase tracking-wider block">Throughput</span>
              <span className="text-xl font-bold font-['Outfit'] text-white">10,000 TPS</span>
            </div>
            <div className="bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5">
              <span className="text-xs text-zinc-500 uppercase tracking-wider block">Offline Speed</span>
              <span className="text-xl font-bold font-['Outfit'] text-emerald-400">&lt; 10 ms</span>
            </div>
            <div className="bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5">
              <span className="text-xs text-zinc-500 uppercase tracking-wider block">Signatures</span>
              <span className="text-xl font-bold font-['Outfit'] text-purple-400">ECDSA</span>
            </div>
            <div className="bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5">
              <span className="text-xs text-zinc-500 uppercase tracking-wider block">Settlement</span>
              <span className="text-xl font-bold font-['Outfit'] text-amber-400">Atomic</span>
            </div>
          </div>
        </div>

        {/* Application Mode Selectors (Customer vs Merchant) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-20">
          
          {/* Customer / Payer Card */}
          <Link 
            to="/payee" 
            className="group relative rounded-3xl p-8 glass-panel glass-panel-hover flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
            
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all duration-300">
                  <Smartphone className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  Customer Wallet
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-white mb-3 group-hover:text-emerald-300 transition-colors">
                Customer App
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
                Lock your allowance online, disconnect from WiFi or mobile cellular, and generate cryptographic QR payment vouchers fully offline.
              </p>

              <ul className="space-y-2 mb-8 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>One-click allowance vault locking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero mobile data or internet needed to pay</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant unspent allowance refund on reconnect</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-emerald-400 font-medium text-sm">
              <span>Launch Customer Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Merchant POS Card */}
          <Link 
            to="/merchant" 
            className="group relative rounded-3xl p-8 glass-panel glass-panel-hover flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all"></div>
            
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all duration-300">
                  <ScanLine className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  Merchant POS
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-white mb-3 group-hover:text-amber-300 transition-colors">
                Merchant Terminal
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
                Scan offline vouchers with camera or manual feed, verify ECDSA signatures locally, build batches, and settle directly to Monad.
              </p>

              <ul className="space-y-2 mb-8 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Sub-millisecond local signature verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Offline nonce queue with replay defense</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Single atomic batch settlement on Monad</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-amber-400 font-medium text-sm">
              <span>Launch POS Terminal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

        </div>

        {/* How It Works Section */}
        <section className="w-full max-w-4xl bg-zinc-900/30 rounded-3xl p-8 sm:p-10 border border-white/5 backdrop-blur-md mb-16">
          <div className="text-center max-w-md mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-wider text-purple-400 block mb-2">Protocol Architecture</span>
            <h3 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-white">How Offline Pay Works</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
            
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold flex items-center justify-center mb-4 text-sm">
                01
              </div>
              <h4 className="font-semibold text-white text-base mb-1">Lock Online</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Payer locks an allowance into the offline vault contract while connected to Monad.
              </p>
            </div>

            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold flex items-center justify-center mb-4 text-sm">
                02
              </div>
              <h4 className="font-semibold text-white text-base mb-1">Sign Offline</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Device turns off internet. Generates a signed cryptographic payment voucher QR locally.
              </p>
            </div>

            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold flex items-center justify-center mb-4 text-sm">
                03
              </div>
              <h4 className="font-semibold text-white text-base mb-1">Verify Locally</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Merchant scans QR code and recovers public address via ECDSA with zero internet connection.
              </p>
            </div>

            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold flex items-center justify-center mb-4 text-sm">
                04
              </div>
              <h4 className="font-semibold text-white text-base mb-1">Batch Settle</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When internet is restored, merchant submits the voucher batch to Monad for instant settlement.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Global Footer with Contact Dev linking to GitHub */}
      <Footer />

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
        {/* Hidden Admin Gateway: Accessible only via direct URL /admin or 5 clicks on footer version */}
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </Router>
  );
}
