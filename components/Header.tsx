
import React, { useState, useRef, useEffect } from 'react';
import { Palette, Moon, Sun, Terminal, Sparkles, ChevronDown, Zap, Coffee, HelpCircle, X } from 'lucide-react';
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
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

  useEffect(() => {
      const hasSeenGuide = localStorage.getItem('pixel-banana-guide-seen');
      if (!hasSeenGuide) {
          setIsHelpOpen(true);
      }
  }, []);

  const handleCloseHelp = () => {
      if (dontShowAgain) {
          localStorage.setItem('pixel-banana-guide-seen', 'true');
      }
      setIsHelpOpen(false);
  };

  return (
    <header className="border-b border-border-base bg-app-panel sticky top-0 z-50 h-12 flex items-center justify-between px-4 select-none transition-colors duration-300 shadow-sm">
      
      {/* Clickable Logo Area for Help */}
      <button 
        onClick={() => setIsHelpOpen(true)}
        className="flex items-center gap-3 group hover:opacity-90 transition-opacity focus:outline-none"
        title="Click for Help & Info"
      >
        <div className="w-7 h-7 bg-accent-main rounded flex items-center justify-center text-lg shadow-sm transition-all duration-300 text-accent-text group-hover:scale-110 group-hover:rotate-6 group-hover:animate-spin">
           🍌
        </div>
        <h1 className="text-lg font-pixel text-txt-main tracking-tighter flex items-center gap-2">
          PIXEL<span className="text-accent-main">BANANA</span>
          <HelpCircle className="w-3 h-3 text-txt-muted opacity-50 group-hover:opacity-100 transition-opacity" />
        </h1>
      </button>
      
      <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-app-element border border-border-base text-[9px] font-mono text-txt-muted hidden md:flex">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-main animate-pulse"/>
              <span>GEMINI 2.5 FLASH IMAGE</span>
          </div>

          {/* Theme Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-app-element border border-border-base text-[10px] font-bold text-txt-muted hover:text-txt-main hover:border-accent-main transition-all"
            >
              <Palette className="w-3 h-3" />
              <span className="capitalize hidden md:inline">{theme}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isThemeOpen && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-app-panel border border-border-base rounded-lg shadow-xl z-50 overflow-hidden">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setIsThemeOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-medium transition-colors
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

      {/* HELP MODAL */}
      {isHelpOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-app-panel border border-border-base rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-border-base bg-app-element/30">
                      <h2 className="text-lg font-pixel text-accent-main flex items-center gap-2">
                        <span>🍌</span> Pixel Banana Guide
                      </h2>
                      <button onClick={handleCloseHelp} className="text-txt-muted hover:text-txt-main p-1 hover:bg-app-element rounded"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6 text-sm text-txt-main">
                      <section>
                          <h3 className="font-bold text-accent-main mb-2 uppercase font-mono flex items-center gap-2"><Sparkles className="w-4 h-4"/> Key Features</h3>
                          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-txt-muted text-xs">
                              <li>• AI Generation (Gemini 2.5)</li>
                              <li>• Sprite Sheets & Animations</li>
                              <li>• Smart Chroma Key (Magic Wand)</li>
                              <li>• Live Palette Analysis</li>
                              <li>• Pixel-Perfect Outlines</li>
                              <li>• Auto-Centering (AABB)</li>
                          </ul>
                      </section>
                      <section>
                          <h3 className="font-bold text-accent-main mb-2 uppercase font-mono flex items-center gap-2"><Terminal className="w-4 h-4"/> Controls</h3>
                          <div className="space-y-2 text-xs text-txt-muted bg-app-element p-3 rounded border border-border-base">
                              <p><strong className="text-txt-main">Pan & Zoom:</strong> Scroll to zoom. Click & drag to pan the canvas.</p>
                              <p><strong className="text-txt-main">Magic Wand:</strong> In Chroma Key mode, click to select background areas. Hold Shift to add.</p>
                              <p><strong className="text-txt-main">Eyedropper:</strong> Click the Pipette icon to pick transparency colors directly.</p>
                              <p><strong className="text-txt-main">Animation:</strong> Click the floating mini-player to open the full Animation Studio.</p>
                          </div>
                      </section>
                      <section>
                          <h3 className="font-bold text-accent-main mb-2 uppercase font-mono flex items-center gap-2"><Zap className="w-4 h-4"/> Pro Tips</h3>
                          <ul className="list-disc pl-4 space-y-1 text-xs text-txt-muted">
                              <li>Use <strong>"Contiguous"</strong> mode for Chroma Key to avoid erasing inside sprites.</li>
                              <li>Outlines are applied <strong>before</strong> color reduction, so they snap to your palette perfectly (1-bit style).</li>
                              <li>Enable <strong>"Show Cut Lines"</strong> in the Animate tab to see sprite boundaries.</li>
                          </ul>
                      </section>
                  </div>
                  <div className="p-4 border-t border-border-base bg-app-element/50 flex justify-between items-center">
                      <label className="flex items-center gap-2 text-xs text-txt-muted cursor-pointer select-none hover:text-txt-main">
                          <input 
                              type="checkbox" 
                              checked={dontShowAgain} 
                              onChange={(e) => setDontShowAgain(e.target.checked)}
                              className="rounded border-border-base bg-app-bg text-accent-main focus:ring-accent-main focus:ring-offset-0" 
                          />
                          Don't show this again
                      </label>
                      <button onClick={handleCloseHelp} className="px-6 py-2 bg-accent-main text-accent-text font-bold rounded hover:bg-accent-hover shadow-lg transition-transform active:scale-95">GOT IT</button>
                  </div>
              </div>
          </div>
      )}
    </header>
  );
};

export default Header;
