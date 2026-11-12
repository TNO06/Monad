import React from 'react';

export default function MonadLogo({ className = "w-8 h-8", withText = false, textClassName = "text-xl font-bold font-['Outfit'] tracking-tight" }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
        <svg 
          viewBox="0 0 48 46" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(131,110,249,0.5)]"
        >
          <path 
            fill="url(#monad-grad)" 
            d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
          />
          <defs>
            <linearGradient id="monad-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="50%" stopColor="#836EF9" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {withText && (
        <span className={textClassName}>
          <span className="text-white">Monad</span>
          <span className="text-[#836EF9] ml-1">Pay</span>
        </span>
      )}
    </div>
  );
}

