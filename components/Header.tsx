import React from 'react';
import { Zap } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="border-b border-space-800 bg-space-950 sticky top-0 z-50 h-14 flex items-center justify-between px-4 select-none shadow-[0_0_15px_rgba(0,240,255,0.1)]">
      <div className="flex items-center gap-3 group cursor-default">
        <div className="w-8 h-8 bg-gradient-to-br from-neon-yellow to-neon-green rounded-lg flex items-center justify-center text-xl shadow-[0_0_10px_rgba(255,238,0,0.5)] group-hover:shadow-[0_0_20px_rgba(255,238,0,0.8)] transition-all duration-300">
           🍌
        </div>
        <h1 className="text-xl font-pixel text-white tracking-tighter drop-shadow-md">
          PIXEL<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-yellow to-neon-green">BANANA</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-space-900 border border-space-800 text-[10px] font-mono text-neon-blue shadow-[0_0_5px_rgba(0,240,255,0.2)]">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse shadow-[0_0_5px_#00f0ff]"/>
              <span>GEMINI 2.5 FLASH IMAGE</span>
          </div>
      </div>
    </header>
  );
};

export default Header;