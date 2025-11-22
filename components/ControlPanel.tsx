
import React, { useRef, useState, useEffect } from 'react';
import { PixelConfig, PixelStyle, OutputType } from '../types';
import { Wand2, Upload, X, Grid3X3, RefreshCcw, Monitor, Eraser, Sliders, LayoutGrid, Sparkles, ChevronDown, Check, RotateCcw, PaintBucket, BoxSelect, Ban } from 'lucide-react';
import { PALETTES } from '../constants';

interface ControlPanelProps {
  config: PixelConfig;
  setConfig: React.Dispatch<React.SetStateAction<PixelConfig>>;
  onGenerate: () => void;
  isGenerating: boolean;
  lastGeneratedImage: string | null;
  imageDimensions: { w: number, h: number } | null;
}

type Tab = 'generate' | 'process';

const QUICK_PROMPTS = [
  { label: "Sunrise", prompt: "A pixel art sunrise over a calm ocean, vibrant orange and blue" },
  { label: "Cyberpunk", prompt: "Cyberpunk street food vendor stall, neon lights, rain, night time" },
  { label: "RPG Hero", prompt: "Fantasy RPG hero character sprite, holding a sword and shield" },
  { label: "Space Marine", prompt: "Sci-fi space marine in power armor, holding a heavy blaster, pixel art" },
  { label: "Forest Tile", prompt: "Seamless grass and forest floor tile for a top-down RPG" },
  { label: "Loot Chest", prompt: "A golden treasure chest, glowing inside, pixel art game icon" },
  { label: "Dungeon", prompt: "Dark dungeon wall with a torch sconce, pixel art tile" },
  { label: "Food", prompt: "A delicious pixel art ramen bowl with steam rising" },
  { label: "Potion", prompt: "A glass potion bottle filled with swirling magical red liquid, pixel art icon" },
  { label: "Sword", prompt: "An epic fantasy broadsword with a jeweled hilt, pixel art" },
  { label: "Robot", prompt: "A rusty cute robot with one glowing eye, post-apocalyptic style" },
  { label: "Tree", prompt: "A large ancient oak tree with sprawling roots, side view pixel art" },
];

const STYLE_DESCRIPTIONS: Record<PixelStyle, string> = {
    [PixelStyle.SNES]: "16-bit, vibrant colors, slight outlines",
    [PixelStyle.SEGA]: "High contrast, darker blacks, gritty",
    [PixelStyle.GAMEBOY]: "4-color green monochrome palette",
    [PixelStyle.GBC]: "Vibrant, limited palette (Game Boy Color)",
    [PixelStyle.NES]: "Strict 8-bit palette limits",
    [PixelStyle.PS1]: "Low-poly, pre-rendered aesthetic",
    [PixelStyle.ATARI]: "Blocky, extremely limited resolution",
    [PixelStyle.MODERN]: "High detail, smooth shading, unrestricted",
    [PixelStyle.ISOMETRIC]: "2.5D perspective, tactical RPG style",
    [PixelStyle.CYBERPUNK]: "Neon, dark backgrounds, high tech",
    [PixelStyle.FANTASY]: "Pico-8 style, cute, chunky pixels",
    [PixelStyle.POINTNCLICK]: "90s adventure game background style",
};

const BG_COLORS = [
    { label: 'Magenta', color: '#FF00FF' },
    { label: 'Cyan', color: '#00FFFF' },
    { label: 'Green', color: '#00FF00' },
    { label: 'Black', color: '#000000' },
    { label: 'White', color: '#FFFFFF' },
    { label: 'Blue', color: '#0000FF' },
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  setConfig,
  onGenerate,
  isGenerating,
  lastGeneratedImage,
  imageDimensions
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  
  // Dropdown States
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  // Toggles
  const [showRefImage, setShowRefImage] = useState(false);
  const [reuseLast, setReuseLast] = useState(false);

  const styleRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (styleRef.current && !styleRef.current.contains(event.target as Node)) setIsStyleOpen(false);
          if (typeRef.current && !typeRef.current.contains(event.target as Node)) setIsTypeOpen(false);
          if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) setIsPaletteOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, referenceImage: reader.result as string }));
        setReuseLast(false);
        setShowRefImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleReuseLast = (shouldReuse: boolean) => {
      setReuseLast(shouldReuse);
      if (shouldReuse && lastGeneratedImage) {
          setConfig(prev => ({ ...prev, referenceImage: lastGeneratedImage }));
      } else if (!shouldReuse) {
           setConfig(prev => ({ ...prev, referenceImage: null }));
      }
  }

  useEffect(() => {
      if (!config.referenceImage && reuseLast) {
          setReuseLast(false);
      }
  }, [config.referenceImage]);

  const clearReference = () => {
    setConfig(prev => ({ ...prev, referenceImage: null }));
    setReuseLast(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBgColorChange = (color: string) => {
      setConfig(prev => ({
          ...prev,
          generatorBackground: color,
          postProcess: {
              ...prev.postProcess,
              // Only update removal color if picking a real color, not None
              transparentColor: color !== 'none' ? color : prev.postProcess.transparentColor
          }
      }));
  };

  const updatePostProcess = (key: keyof typeof config.postProcess, value: any) => {
    setConfig(prev => ({
      ...prev,
      postProcess: { ...prev.postProcess, [key]: value }
    }));
  };

  const updateSheetConfig = (key: keyof typeof config.sheetConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      sheetConfig: { ...prev.sheetConfig, [key]: value }
    }));
  };

  const resetSliders = () => {
    setConfig(prev => ({
        ...prev,
        postProcess: {
            ...prev.postProcess,
            pixelSize: 1,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            noise: 0,
            reduceColors: 0,
            palette: 'none',
            showGrid: false,
            gridSize: 1,
            gridOpacity: 0.5,
            gridColor: '#00f0ff',
            removeBackground: false,
            transparentColor: prev.generatorBackground !== 'none' ? prev.generatorBackground : '#FF00FF',
            transparencyTolerance: 10,
            outlineOuter: false,
            outlineOuterColor: '#FFFFFF',
            outlineOuterWidth: 1,
            outlineInner: false,
            outlineInnerColor: '#000000',
            outlineInnerWidth: 1,
        }
    }));
  };

  const getResDisplay = () => {
    if (!imageDimensions) return "---";
    const w = Math.max(1, Math.floor(imageDimensions.w / config.postProcess.pixelSize));
    const h = Math.max(1, Math.floor(imageDimensions.h / config.postProcess.pixelSize));
    return `${w} × ${h}`;
  };

  return (
    <div className="h-full flex flex-col relative z-20">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-[#1f1d35] bg-[#050410]">
        <button 
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${activeTab === 'generate' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {activeTab === 'generate' && (
            <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border-b-2 border-neon-pink" />
          )}
          <Wand2 className={`w-3 h-3 relative z-10 ${activeTab === 'generate' ? 'text-neon-pink' : ''}`} /> 
          <span className="relative z-10">Generate</span>
        </button>
        <button 
          onClick={() => setActiveTab('process')}
          className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${activeTab === 'process' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
           {activeTab === 'process' && (
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 to-neon-green/20 border-b-2 border-neon-blue" />
          )}
          <Sliders className={`w-3 h-3 relative z-10 ${activeTab === 'process' ? 'text-neon-blue' : ''}`} /> 
          <span className="relative z-10">Edit</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-8 bg-[#080715]">

        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <>
            <div className="space-y-3">
              <label className="flex items-center justify-between text-[10px] font-bold text-neon-blue uppercase tracking-wider font-mono">
                <span>Prompt</span>
              </label>
              <textarea
                value={config.prompt}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                placeholder="Describe your pixel art..."
                className="w-full h-32 bg-[#0d0c1d] border border-[#1f1d35] rounded-lg p-4 text-white placeholder-gray-600 focus:ring-1 focus:ring-neon-pink focus:border-neon-pink outline-none resize-none text-sm font-medium leading-relaxed shadow-inner transition-all"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        onGenerate();
                    }
                }}
              />
              
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => setConfig(prev => ({ ...prev, prompt: item.prompt }))}
                        className="px-2.5 py-1.5 text-[10px] bg-[#0d0c1d] border border-[#1f1d35] rounded-md hover:border-neon-blue hover:text-neon-blue hover:shadow-[0_0_10px_rgba(0,240,255,0.2)] transition-all text-gray-400 font-mono uppercase tracking-tight"
                    >
                        {item.label}
                    </button>
                ))}
              </div>
            </div>

            {/* Advanced Style Selector */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-neon-purple uppercase tracking-wider font-mono">
                Style & Layout
              </label>
              
              {/* Custom Style Dropdown */}
              <div className="relative" ref={styleRef}>
                  <button 
                    onClick={() => setIsStyleOpen(!isStyleOpen)}
                    className={`w-full bg-[#0d0c1d] border ${isStyleOpen ? 'border-neon-purple shadow-[0_0_15px_rgba(189,0,255,0.3)]' : 'border-[#1f1d35]'} rounded-lg p-3 flex items-center justify-between text-xs text-white transition-all hover:border-gray-600`}
                  >
                      <span className="font-bold">{config.style}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isStyleOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isStyleOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#0d0c1d] border border-[#1f1d35] rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto scrollbar-thin">
                          {Object.values(PixelStyle).map(style => (
                              <button
                                key={style}
                                onClick={() => { setConfig({ ...config, style }); setIsStyleOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-[#18162d] border-b border-[#1f1d35] last:border-0 transition-colors"
                              >
                                  <div className="text-xs font-bold text-white mb-0.5">{style}</div>
                                  <div className="text-[10px] text-gray-500">{STYLE_DESCRIPTIONS[style]}</div>
                              </button>
                          ))}
                      </div>
                  )}
              </div>

              {/* Custom Type Dropdown */}
              <div className="relative" ref={typeRef}>
                  <button 
                    onClick={() => setIsTypeOpen(!isTypeOpen)}
                    className={`w-full bg-[#0d0c1d] border ${isTypeOpen ? 'border-neon-purple shadow-[0_0_15px_rgba(189,0,255,0.3)]' : 'border-[#1f1d35]'} rounded-lg p-3 flex items-center justify-between text-xs text-white transition-all hover:border-gray-600`}
                  >
                      <span className="font-bold">{config.outputType}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTypeOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#0d0c1d] border border-[#1f1d35] rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto scrollbar-thin">
                          {Object.values(OutputType).map(type => (
                              <button
                                key={type}
                                onClick={() => { setConfig({ ...config, outputType: type }); setIsTypeOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-[#18162d] border-b border-[#1f1d35] last:border-0 text-xs font-bold text-white transition-colors"
                              >
                                  {type}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
            </div>

            {/* GENERATION SETTINGS (Background) */}
             <div className="bg-[#0d0c1d] border border-[#1f1d35] rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <PaintBucket className="w-3 h-3 text-neon-green" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase font-mono">Generator Background</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {/* None Option */}
                     <button
                        onClick={() => handleBgColorChange('none')}
                        className={`w-full aspect-square rounded border transition-all flex items-center justify-center bg-[#1a1a1a] ${config.generatorBackground === 'none' ? 'border-white scale-110 shadow-lg ring-1 ring-white' : 'border-transparent hover:scale-105'}`}
                        title="No Background (Fill Canvas)"
                    >
                        <Ban className="w-3 h-3 text-gray-400" />
                    </button>

                    {BG_COLORS.map(c => (
                        <button
                            key={c.color}
                            onClick={() => handleBgColorChange(c.color)}
                            className={`w-full aspect-square rounded border transition-all ${config.generatorBackground === c.color ? 'border-white scale-110 shadow-lg ring-1 ring-white' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: c.color }}
                            title={c.label}
                        />
                    ))}
                </div>
             </div>

            {/* SPRITE SHEET CONFIG (Conditional) */}
            {config.outputType === OutputType.SHEET && (
                 <div className="bg-[#0d0c1d] border border-[#1f1d35] rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-1">
                        <LayoutGrid className="w-3 h-3 text-neon-yellow" />
                        <span className="text-[10px] font-bold text-gray-300 uppercase font-mono">Sheet Settings</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="block text-[10px] text-gray-500 font-mono">Cols (X)</label>
                            <input 
                                type="number" min="1" max="12"
                                value={config.sheetConfig.columns}
                                onChange={(e) => updateSheetConfig('columns', parseInt(e.target.value))}
                                className="w-full bg-[#050410] border border-[#1f1d35] rounded px-2 py-1.5 text-white text-xs focus:border-neon-yellow outline-none"
                            />
                        </div>
                         <div className="space-y-1">
                            <label className="block text-[10px] text-gray-500 font-mono">Rows (Y)</label>
                            <input 
                                type="number" min="1" max="12"
                                value={config.sheetConfig.rows}
                                onChange={(e) => updateSheetConfig('rows', parseInt(e.target.value))}
                                className="w-full bg-[#050410] border border-[#1f1d35] rounded px-2 py-1.5 text-white text-xs focus:border-neon-yellow outline-none"
                            />
                        </div>
                    </div>
                     <div className="space-y-1">
                        <label className="block text-[10px] text-gray-500 font-mono">Padding ({config.sheetConfig.padding}px)</label>
                        <input 
                            type="range" min="0" max="64"
                            value={config.sheetConfig.padding}
                            onChange={(e) => updateSheetConfig('padding', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-yellow"
                        />
                    </div>
                 </div>
            )}

            {/* Reference Image */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                     <button 
                        onClick={() => setShowRefImage(!showRefImage)}
                        className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono hover:text-white transition-colors"
                     >
                         <div className={`w-3 h-3 rounded-sm border border-gray-500 flex items-center justify-center ${showRefImage ? 'bg-neon-pink border-neon-pink' : ''}`}>
                             {showRefImage && <Check className="w-2 h-2 text-black" />}
                         </div>
                         Reference Image
                     </button>
                </div>
                
                {showRefImage && (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                        
                        {/* Reuse Toggle */}
                        {lastGeneratedImage && (
                            <div className="flex items-center justify-between bg-[#0d0c1d] p-2 rounded border border-[#1f1d35]">
                                <span className="text-[10px] font-bold text-neon-pink uppercase flex items-center gap-2">
                                    <RotateCcw className="w-3 h-3" /> Reuse Last Result
                                </span>
                                <button 
                                    onClick={() => toggleReuseLast(!reuseLast)}
                                    className={`w-8 h-4 rounded-full relative transition-all ${reuseLast ? 'bg-neon-pink' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${reuseLast ? 'left-4.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        )}

                        <div 
                            onClick={() => !reuseLast && fileInputRef.current?.click()}
                            className={`
                                relative rounded-lg border-2 border-dashed transition-all cursor-pointer group overflow-hidden
                                ${config.referenceImage ? 'border-[#1f1d35] bg-[#0d0c1d]' : 'border-[#1f1d35] bg-[#0d0c1d]/50 hover:border-gray-500'}
                                ${reuseLast ? 'opacity-100 border-neon-pink/50' : ''}
                            `}
                        >
                            {!config.referenceImage ? (
                                <div className="h-20 flex flex-col items-center justify-center text-gray-600 group-hover:text-gray-400">
                                    <Upload className="w-5 h-5 mb-2 opacity-50" />
                                    <span className="text-[10px] font-mono uppercase">Upload Image</span>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img 
                                        src={config.referenceImage} 
                                        alt="Reference" 
                                        className="w-full h-24 object-contain bg-[#050410]" 
                                    />
                                    {!reuseLast && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); clearReference(); }}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept="image/*"
                                disabled={reuseLast}
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                )}
            </div>
          </>
        )}

        {/* PROCESS TAB */}
        {activeTab === 'process' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center pb-2 border-b border-[#1f1d35]">
                    <h3 className="text-[10px] font-bold text-neon-blue uppercase tracking-widest">Adjustments</h3>
                    <button onClick={resetSliders} className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-white transition-colors">
                        <RefreshCcw className="w-3 h-3" /> Reset All
                    </button>
                </div>

                {/* Pixel Scale */}
                <div className="space-y-3">
                    <label className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase font-mono flex items-center gap-2">
                           <Monitor className="w-3 h-3"/> Pixel Scale
                        </span>
                        <span className="text-[10px] text-neon-yellow font-mono bg-[#0d0c1d] px-2 py-1 rounded border border-[#1f1d35] shadow-[0_0_5px_rgba(255,238,0,0.1)]">
                            1:{config.postProcess.pixelSize}
                        </span>
                    </label>
                    
                    <input 
                        type="range" 
                        min="1" max="64" step="1"
                        value={config.postProcess.pixelSize}
                        onChange={(e) => updatePostProcess('pixelSize', parseInt(e.target.value))}
                        className="w-full h-2 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-yellow"
                    />
                    
                    <div className="flex justify-between items-center text-[10px] font-mono">
                         <span className="text-gray-600">Original</span>
                         <span className="text-gray-400 font-bold">{getResDisplay()} px</span>
                    </div>
                </div>

                 {/* Grid Controls */}
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-gray-400 uppercase font-mono flex items-center gap-2">
                            <Grid3X3 className="w-3 h-3" /> Pixel Grid
                        </label>
                        <button
                            onClick={() => updatePostProcess('showGrid', !config.postProcess.showGrid)}
                            className={`w-9 h-5 rounded-full relative transition-all ${config.postProcess.showGrid ? 'bg-neon-blue shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${config.postProcess.showGrid ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>
                    
                    {config.postProcess.showGrid && (
                        <div className="space-y-3 bg-[#0d0c1d] p-3 rounded-lg border border-[#1f1d35] animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1">
                                <label className="block text-[10px] text-gray-500 font-mono mb-2">Grid Cell Size</label>
                                <input 
                                    type="number" 
                                    min="1" max="512"
                                    value={config.postProcess.gridSize}
                                    onChange={(e) => updatePostProcess('gridSize', parseInt(e.target.value))}
                                    className="w-full bg-[#050410] border border-[#1f1d35] rounded px-2 py-1.5 text-white font-mono text-xs focus:border-neon-blue outline-none"
                                />
                            </div>
                             <div className="space-y-1">
                                <label className="block text-[10px] text-gray-500 font-mono mb-2">Opacity</label>
                                <input 
                                    type="range" 
                                    min="0.1" max="1" step="0.1"
                                    value={config.postProcess.gridOpacity}
                                    onChange={(e) => updatePostProcess('gridOpacity', parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-blue"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 font-mono">Grid Color</span>
                                <div className="flex items-center gap-2 bg-[#050410] rounded p-1 border border-[#1f1d35]">
                                    <input 
                                        type="color"
                                        value={config.postProcess.gridColor}
                                        onChange={(e) => updatePostProcess('gridColor', e.target.value)}
                                        className="w-5 h-5 rounded overflow-hidden border-0 p-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                 </div>

                {/* Sexy Palette Selection */}
                <div className="space-y-2">
                     <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono">
                        Color Palette
                    </label>
                    
                    <div className="relative" ref={paletteRef}>
                        <button 
                            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                            className={`w-full bg-[#0d0c1d] border ${isPaletteOpen ? 'border-neon-green shadow-[0_0_15px_rgba(0,255,157,0.3)]' : 'border-[#1f1d35]'} rounded-lg h-10 px-3 flex items-center justify-between text-xs text-white hover:border-gray-600 transition-all`}
                        >
                            <span className="flex items-center gap-2">
                                {PALETTES[config.postProcess.palette].label}
                                {config.postProcess.palette !== 'none' && (
                                    <div className="flex -space-x-1">
                                        {PALETTES[config.postProcess.palette].colors.slice(0, 4).map((c, i) => (
                                            <div 
                                                key={i} 
                                                className="w-2 h-2 rounded-full ring-1 ring-[#0d0c1d]"
                                                style={{ backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` }} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isPaletteOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isPaletteOpen && (
                            <div className="absolute bottom-full mb-2 left-0 w-full bg-[#0d0c1d] border border-[#1f1d35] rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 scrollbar-thin">
                                {Object.entries(PALETTES).map(([key, pal]) => (
                                    <button
                                        key={key}
                                        onClick={() => { updatePostProcess('palette', key); setIsPaletteOpen(false); }}
                                        className="w-full flex flex-col px-3 py-2 hover:bg-[#18162d] border-b border-[#1f1d35]/50 last:border-0 text-left transition-colors"
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <span className={`text-xs font-medium ${config.postProcess.palette === key ? 'text-neon-green' : 'text-gray-300'}`}>
                                                {pal.label}
                                            </span>
                                            {config.postProcess.palette === key && <Check className="w-3 h-3 text-neon-green" />}
                                        </div>
                                        <div className="flex gap-0.5 h-2 w-full rounded-sm overflow-hidden">
                                            {pal.colors.length > 0 ? (
                                                pal.colors.slice(0, 16).map((c, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="flex-1 h-full"
                                                        style={{ backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` }}
                                                    />
                                                ))
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue opacity-50" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Transparency & Outlines */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-gray-400 uppercase font-mono flex items-center gap-2">
                             <Eraser className="w-3 h-3" /> Chroma Key / BG Removal
                        </label>
                        <button
                            onClick={() => updatePostProcess('removeBackground', !config.postProcess.removeBackground)}
                            className={`w-9 h-5 rounded-full relative transition-all ${config.postProcess.removeBackground ? 'bg-neon-pink shadow-[0_0_10px_rgba(255,0,153,0.5)]' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${config.postProcess.removeBackground ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>

                    {config.postProcess.removeBackground && (
                        <div className="p-3 bg-[#0d0c1d] rounded-lg border border-[#1f1d35] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                             {/* Key Color Picker */}
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 font-mono">Key Color</span>
                                <div className="flex items-center gap-2 bg-[#050410] rounded p-1 border border-[#1f1d35]">
                                    <input 
                                        type="color"
                                        value={config.postProcess.transparentColor}
                                        onChange={(e) => updatePostProcess('transparentColor', e.target.value)}
                                        className="w-5 h-5 rounded overflow-hidden border-0 p-0 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-mono text-gray-300 uppercase w-12">{config.postProcess.transparentColor}</span>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] text-gray-500 font-mono flex justify-between">
                                    Tolerance <span>{config.postProcess.transparencyTolerance}%</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" max="100"
                                    value={config.postProcess.transparencyTolerance}
                                    onChange={(e) => updatePostProcess('transparencyTolerance', parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-pink"
                                />
                             </div>
                             
                             <hr className="border-[#1f1d35]" />

                             {/* OUTER OUTLINE */}
                             <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-gray-300 uppercase font-mono flex items-center gap-2">
                                        <BoxSelect className="w-3 h-3 text-white" /> Outer Stroke
                                    </label>
                                    <button
                                        onClick={() => updatePostProcess('outlineOuter', !config.postProcess.outlineOuter)}
                                        className={`w-9 h-5 rounded-full relative transition-all ${config.postProcess.outlineOuter ? 'bg-white' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-transform shadow-sm ${config.postProcess.outlineOuter ? 'left-5 bg-black' : 'left-1 bg-gray-400'}`} />
                                    </button>
                                </div>
                                {config.postProcess.outlineOuter && (
                                    <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-[#1f1d35]">
                                         <div className="flex items-center gap-2">
                                            <input 
                                                type="color"
                                                value={config.postProcess.outlineOuterColor}
                                                onChange={(e) => updatePostProcess('outlineOuterColor', e.target.value)}
                                                className="w-5 h-5 rounded border-0 cursor-pointer p-0"
                                            />
                                        </div>
                                        <input 
                                            type="range" min="1" max="4"
                                            value={config.postProcess.outlineOuterWidth}
                                            onChange={(e) => updatePostProcess('outlineOuterWidth', parseInt(e.target.value))}
                                            className="h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-white self-center"
                                        />
                                    </div>
                                )}
                             </div>

                             {/* INNER OUTLINE */}
                             <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-gray-300 uppercase font-mono flex items-center gap-2">
                                        <BoxSelect className="w-3 h-3 text-gray-500" /> Inner Stroke
                                    </label>
                                    <button
                                        onClick={() => updatePostProcess('outlineInner', !config.postProcess.outlineInner)}
                                        className={`w-9 h-5 rounded-full relative transition-all ${config.postProcess.outlineInner ? 'bg-white' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-transform shadow-sm ${config.postProcess.outlineInner ? 'left-5 bg-black' : 'left-1 bg-gray-400'}`} />
                                    </button>
                                </div>
                                {config.postProcess.outlineInner && (
                                    <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-[#1f1d35]">
                                         <div className="flex items-center gap-2">
                                            <input 
                                                type="color"
                                                value={config.postProcess.outlineInnerColor}
                                                onChange={(e) => updatePostProcess('outlineInnerColor', e.target.value)}
                                                className="w-5 h-5 rounded border-0 cursor-pointer p-0"
                                            />
                                        </div>
                                        <input 
                                            type="range" min="1" max="4"
                                            value={config.postProcess.outlineInnerWidth}
                                            onChange={(e) => updatePostProcess('outlineInnerWidth', parseInt(e.target.value))}
                                            className="h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-white self-center"
                                        />
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                 </div>

                <hr className="border-[#1f1d35]" />

                {/* Advanced Filters */}
                <div className="space-y-5">
                    <label className="block text-[10px] font-bold text-neon-purple uppercase font-mono mb-4 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Effects
                    </label>

                     {/* Reduce Colors */}
                    {config.postProcess.palette === 'none' && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono text-gray-500">
                                <span>Color Count</span>
                                <span className="text-gray-300">{config.postProcess.reduceColors === 0 ? 'Unlimited' : config.postProcess.reduceColors}</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="32" step="1"
                                value={config.postProcess.reduceColors}
                                onChange={(e) => updatePostProcess('reduceColors', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-green"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono text-gray-500">
                                <span>Noise</span>
                                <span className="text-gray-300">{config.postProcess.noise}</span>
                            </div>
                            <input 
                                type="range" min="0" max="100"
                                value={config.postProcess.noise}
                                onChange={(e) => updatePostProcess('noise', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-gray-400"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono text-gray-500">
                                <span>Hue</span>
                                <span className="text-gray-300">{config.postProcess.hue}</span>
                            </div>
                            <input 
                                type="range" min="-180" max="180"
                                value={config.postProcess.hue}
                                onChange={(e) => updatePostProcess('hue', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-purple"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-gray-500 w-16">Bright</span>
                            <input 
                                type="range" min="-100" max="100"
                                value={config.postProcess.brightness}
                                onChange={(e) => updatePostProcess('brightness', parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-blue"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-gray-500 w-16">Contrast</span>
                            <input 
                                type="range" min="-100" max="100"
                                value={config.postProcess.contrast}
                                onChange={(e) => updatePostProcess('contrast', parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-blue"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-gray-500 w-16">Sat</span>
                            <input 
                                type="range" min="-100" max="100"
                                value={config.postProcess.saturation}
                                onChange={(e) => updatePostProcess('saturation', parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-[#18162d] rounded-lg appearance-none cursor-pointer accent-neon-blue"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Action Button */}
      <div className="p-6 border-t border-[#1f1d35] bg-[#050410]">
        <button
          onClick={onGenerate}
          disabled={isGenerating || !config.prompt}
          className={`
            w-full py-4 rounded font-pixel text-sm font-bold uppercase tracking-widest relative group
            transition-all duration-200 border-2 overflow-hidden
            ${isGenerating || !config.prompt 
                ? 'bg-[#0d0c1d] border-[#1f1d35] text-gray-600 cursor-not-allowed' 
                : 'bg-neon-yellow border-white text-black hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]'}
          `}
        >
          <div className="flex items-center justify-center gap-3 relative z-10">
            {isGenerating ? (
                <>
                 <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                 <span>PROCESSING</span>
                </>
            ) : (
                <>
                 <Wand2 className="w-5 h-5" />
                 <span>GENERATE</span>
                </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
