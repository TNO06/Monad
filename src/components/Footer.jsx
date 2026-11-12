import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import MonadLogo from './MonadLogo';

export default function Footer({ className = "" }) {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);

  // Hidden admin access trigger: click version tag 5 times
  const handleSecretTrigger = () => {
    const next = clickCount + 1;
    if (next >= 5) {
      setClickCount(0);
      navigate('/admin');
    } else {
      setClickCount(next);
      setTimeout(() => setClickCount(0), 3000);
    }
  };

  return (
    <footer className={`w-full border-t border-white/5 bg-zinc-950/80 backdrop-blur-md mt-auto py-8 px-4 text-xs text-zinc-400 relative z-20 ${className}`}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <MonadLogo className="w-5 h-5" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-semibold text-zinc-200">Monad Offline Pay</span>
            <span className="hidden sm:inline text-zinc-600">•</span>
            <span className="text-zinc-500">Zero-Internet P2P Settlement Protocol</span>
          </div>
        </div>

        {/* Center: System Status & Secret Trigger */}
        <div className="flex items-center gap-4 text-zinc-500 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Monad Devnet • 10,000 TPS</span>
          </div>

          {/* Discreet secret trigger: 5 rapid clicks on version opens Admin */}
          <button
            onClick={handleSecretTrigger}
            title={clickCount > 0 ? `${5 - clickCount} more clicks to Admin Gateway` : "Monad Pay v2.0"}
            className="cursor-default select-none text-zinc-600 hover:text-zinc-500 transition-colors font-mono"
          >
            v2.0-bce
          </button>
        </div>

        {/* Right: Contact Developer Link & Git Repos */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/TNO06"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-purple-500/40 text-zinc-200 hover:text-white transition-all shadow-sm hover:shadow-purple-500/10 font-medium group"
          >
            {/* GitHub SVG Icon */}
            <svg 
              className="w-4 h-4 text-zinc-400 group-hover:text-purple-400 transition-colors" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>Contact Dev</span>
            <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-purple-400 transition-colors" />
          </a>

          <a
            href="https://github.com/TNO06/Monad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs flex items-center gap-1"
            title="Repository on GitHub"
          >
            <span>Monad/repo</span>
          </a>
        </div>

      </div>
    </footer>
  );
}
