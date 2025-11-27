
import React, { useState, useRef, useEffect } from 'react';
import { Palette, Moon, Sun, Terminal, Sparkles, ChevronDown, Zap, Coffee } from 'lucide-react';
import { Theme } from '../types';

interface HeaderProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const THEMES: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: 'cosmic', label: 'Cosmic', icon: Sparkles },
  { id: 'midnight', label: 'Midnight', icon: Moon },
  { id: 'paper', label: 'Paper', icon: Sun },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'synthwave', label: 'Synthwave', icon: Zap },
  { id: 'retro', label: 'Retro', icon: Coffee },
];

const Header: React.FC<HeaderProps> = ({ theme, setTheme }) => {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-border-base bg-app-panel sticky top-0 z-50 h-14 flex items-center justify-between px-4 select-none transition-colors duration-300 shadow-md">
      <div className="flex items-center gap-3 group cursor-default">
        <div className="w-8 h-8 bg-accent-main rounded-lg flex items-center justify-center text-xl shadow-[0_0_10px_rgba(var(--accent-main),0.5)] transition-all duration-300 text-accent-text">
           🍌
        </div>
        <h1 className="text-xl font-pixel text-txt-main tracking-tighter">
          PIXEL<span className="text-accent-main">BANANA</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-app-element border border-border-base text-[10px] font-mono text-txt-muted hidden md:flex">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-main animate-pulse"/>
              <span>GEMINI 2.5 FLASH IMAGE</span>
          </div>

          {/* Theme Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-app-element border border-border-base text-xs font-bold text-txt-muted hover:text-txt-main hover:border-accent-main transition-all"
            >
              <Palette className="w-4 h-4" />
              <span className="capitalize hidden md:inline">{theme}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isThemeOpen && (
              <div className="absolute top-full right-0 mt-2 w-36 bg-app-panel border border-border-base rounded-lg shadow-xl z-50 overflow-hidden">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setIsThemeOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors
                      ${theme === t.id ? 'bg-accent-main text-accent-text' : 'text-txt-muted hover:bg-app-element hover:text-txt-main'}
                    `}
                  >
                    <t.icon className="w-3 h-3" />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
      </div>
    </header>
  );
};

export default Header;
