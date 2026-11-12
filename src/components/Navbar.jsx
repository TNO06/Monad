import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Smartphone, ScanLine, LogOut, Copy, Check } from 'lucide-react';
import MonadLogo from './MonadLogo';

export default function Navbar({ 
  user = null, 
  onLogout = null, 
  role = null 
}) {
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const copyAddress = (addr) => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCustomer = location.pathname === '/payee';
  const isMerchant = location.pathname === '/merchant';

  return (
    <header className="w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Home Link */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group transition-transform active:scale-95">
            <MonadLogo className="w-7 h-7" withText={true} />
          </Link>

          {/* Navigation Pill Switcher */}
          <nav className="hidden sm:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/5">
            <Link
              to="/payee"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isCustomer
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span>Customer App</span>
            </Link>

            <Link
              to="/merchant"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isMerchant
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5 text-amber-400" />
              <span>Merchant POS</span>
            </Link>
          </nav>
        </div>

        {/* Right side: User Session / Network Tag */}
        <div className="flex items-center gap-3">
          
          {user ? (
            <div className="flex items-center gap-2">
              {/* Account badge */}
              <div className="flex items-center gap-2 bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-1.5">
                <div className={`w-2 h-2 rounded-full ${role === 'merchant' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-zinc-200 leading-none">
                    {user.username || 'Wallet'}
                  </span>
                  {user.address && (
                    <span className="text-[10px] font-mono text-zinc-500 leading-tight">
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </span>
                  )}
                </div>
                {user.address && (
                  <button
                    onClick={() => copyAddress(user.address)}
                    className="ml-1 text-zinc-400 hover:text-white p-1 rounded transition-colors"
                    title="Copy full address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Logout button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-zinc-900/80 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-colors"
                  title="Disconnect / Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                <span>Monad Offline Protocol</span>
              </div>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
