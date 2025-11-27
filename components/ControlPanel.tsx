
import React, { useRef, useState, useEffect } from 'react';
import { PixelConfig, PixelStyle, OutputType } from '../types';
import { Wand2, Upload, X, Grid3X3, RefreshCcw, Monitor, Eraser, Sliders, LayoutGrid, Sparkles, ChevronDown, Check, RotateCcw, PaintBucket, BoxSelect, Ban, Eye, Spline, SmilePlus } from 'lucide-react';
import { PALETTES } from '../constants';

interface ControlPanelProps {
  config: PixelConfig;
  setConfig: React.Dispatch<React.SetStateAction<PixelConfig>>;
  onGenerate: () => void;
  isGenerating: boolean;
  lastGeneratedImage: string | null;
  imageDimensions: { w: number, h: number } | null;
  previewBackgroundColor: string;
  setPreviewBackgroundColor: (color: string) => void;
  analyzedPalette: string[];
}

type Tab = 'generate' | 'process';

const QUICK_PROMPTS = [
  // Memes & Reactions (New Category)
  { label: "Smug Monkey", prompt: "a smug monkey looking upwards points upwards out of frame" },
  { label: "Rusty Robot", prompt: "A rusty cute robot with one glowing eye, post-apocalyptic steampunk style, pointing straight up" },
  { label: "This is Fine", prompt: "A cute dog sitting in a room filled with fire, smiling, saying this is fine pixel art" },
  { label: "Facepalm", prompt: "Pixel art character doing a facepalm, frustration, meme style" },
  { label: "Thumbs Up", prompt: "A retro computer kid giving a big thumbs up, 90s rad style" },
  { label: "Thinking", prompt: "A pixel art emoji face with hand on chin thinking hard" },

  // Characters & Creatures
  { label: "RPG Hero", prompt: "Fantasy RPG hero character sprite, holding a sword and shield" },
  { label: "Space Marine", prompt: "Sci-fi space marine in power armor, holding a heavy blaster, pixel art" },
  { label: "Wizard", prompt: "An old wizard with a long beard casting a lightning spell, dynamic pose pixel art" },
  { label: "Zombie", prompt: "Green zombie reaching out, side view platformer sprite, rotting flesh" },
  { label: "Dragon", prompt: "Red dragon head, breathing fire, profile view pixel art" },
  { label: "Slime", prompt: "Blue rpg slime monster, dripping, cute face, pixel art" },
  { label: "Ghost", prompt: "Cute spooky ghost with big eyes, halloween pixel art" },
  
  // Items & Objects
  { label: "Loot Chest", prompt: "A golden treasure chest, glowing inside, pixel art game icon" },
  { label: "Sword", prompt: "An epic fantasy broadsword with a jeweled hilt, pixel art" },
  { label: "Potion", prompt: "A glass potion bottle filled with swirling magical red liquid, pixel art icon" },
  { label: "Coin", prompt: "Gold coin spinning, side view, pixel art game item, shiny" },
  { label: "Crystal", prompt: "Glowing blue magic crystal, isometric view, sharp facets" },
  { label: "Burger", prompt: "Delicious cheeseburger with lettuce and tomato, pixel art icon" },
  { label: "Skull", prompt: "A flaming skull with glowing red eyes, heavy metal album cover style pixel art" },
  { label: "Mech", prompt: "Giant battle mech, gritty industrial style, heavy weaponry, pixel art" },

  // Environments & Tiles
  { label: "Sunrise", prompt: "A pixel art sunrise over a calm ocean, vibrant orange and blue" },
  { label: "Cyberpunk", prompt: "Cyberpunk street food vendor stall, neon lights, rain, night time" },
  { label: "Dungeon", prompt: "Dark dungeon wall with a torch sconce, pixel art tile" },
  { label: "Forest Tile", prompt: "Seamless grass and forest floor tile for a top-down RPG" },
  { label: "Tree", prompt: "A large ancient oak tree with sprawling roots, side view pixel art" },
  { label: "City", prompt: "Cyberpunk city skyline at night, distant view, parallax background" },
  { label: "Explosion", prompt: "Pixel art explosion animation frame, fiery and smoky" },
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

const ASPECT_RATIOS = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Classic (4:3)" },
  { value: "3:4", label: "Vertical (3:4)" },
];

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
  imageDimensions,
  previewBackgroundColor,
  setPreviewBackgroundColor,
  analyzedPalette
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [hoverPrompt, setHoverPrompt] = useState<string | null>(null);
  
  // Dropdown States
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isRatioOpen, setIsRatioOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  // Toggles
  const [showRefImage, setShowRefImage] = useState(false);
  const [reuseLast, setReuseLast] = useState(false);

  const styleRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (styleRef.current && !styleRef.current.contains(event.target as Node)) setIsStyleOpen(false);
          if (typeRef.current && !typeRef.current.contains(event.target as Node)) setIsTypeOpen(false);
          if (ratioRef.current && !ratioRef.current.contains(event.target as Node)) setIsRatioOpen(false);
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
            contiguous: true,
            transparentColor: prev.generatorBackground !== 'none' ? prev.generatorBackground : '#FF00FF',
            transparencyTolerance: 10,
            outlineOuter: false,
            outlineOuterColor: '#FFFFFF',
            outlineOuterWidth: 1,
            outlineInner: false,
            outlineInnerColor: '#000000',
            outlineInnerWidth: 1,
            outlineMode: 'both'
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
    <div className="h-full flex flex-col relative z-20 bg-app-panel text-txt-main transition-colors duration-300">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-border-base bg-app-element/50">
        <button 
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${activeTab === 'generate' ? 'text-txt-main' : 'text-txt-muted hover:text-txt-main'}`}
        >
          {activeTab === 'generate' && (
            <div className="absolute inset-0 bg-accent-main/10 border-b-2 border-accent-main" />
          )}
          <Wand2 className={`w-3 h-3 relative z-10 ${activeTab === 'generate' ? 'text-accent-main' : ''}`} /> 
          <span className="relative z-10">Generate</span>
        </button>
        <button 
          onClick={() => setActiveTab('process')}
          className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${activeTab === 'process' ? 'text-txt-main' : 'text-txt-muted hover:text-txt-main'}`}
        >
           {activeTab === 'process' && (
            <div className="absolute inset-0 bg-accent-main/10 border-b-2 border-accent-main" />
          )}
          <Sliders className={`w-3 h-3 relative z-10 ${activeTab === 'process' ? 'text-accent-main' : ''}`} /> 
          <span className="relative z-10">Edit</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-8">

        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <>
            <div className="space-y-3">
              <label className="flex items-center justify-between text-[10px] font-bold text-accent-main uppercase tracking-wider font-mono">
                <span>Prompt</span>
              </label>
              <div className="relative">
                <textarea
                    value={hoverPrompt || config.prompt}
                    onChange={(e) => !hoverPrompt && setConfig({ ...config, prompt: e.target.value })}
                    placeholder="Describe your pixel art..."
                    className={`w-full h-32 bg-app-element border border-border-base rounded-lg p-4 text-sm font-medium leading-relaxed shadow-inner transition-all outline-none resize-none
                    ${hoverPrompt ? 'text-txt-muted italic border-accent-main/50' : 'text-txt-main focus:ring-1 focus:ring-accent-main focus:border-accent-main'}
                    `}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            onGenerate();
                        }
                    }}
                    readOnly={!!hoverPrompt}
                />
                {hoverPrompt && (
                    <div className="absolute bottom-2 right-2 text-[9px] text-accent-main bg-app-panel px-2 py-1 rounded border border-border-base font-mono">
                        PREVIEWING
                    </div>
                )}
              </div>
              
              {/* Prompt Chips Category Selector could go here if list gets huge */}
              <div className="space-y-2">
                  {['Reactions', 'Characters', 'Items', 'Environments'].map(cat => (
                      <div key={cat} className="flex flex-wrap gap-2">
                          {QUICK_PROMPTS.filter(p => {
                              if (cat === 'Reactions') return ["Smug Monkey", "Rusty Robot", "This is Fine", "Facepalm", "Thumbs Up", "Thinking"].includes(p.label);
                              if (cat === 'Characters') return ["RPG Hero", "Space Marine", "Wizard", "Zombie", "Dragon", "Slime", "Ghost"].includes(p.label);
                              if (cat === 'Items') return ["Loot Chest", "Sword", "Potion", "Coin", "Crystal", "Burger", "Skull", "Mech"].includes(p.label);
                              return ["Sunrise", "Cyberpunk", "Dungeon", "Forest Tile", "Tree", "City", "Explosion"].includes(p.label);
                          }).map((item) => (
                            <button
                                key={item.label}
                                onClick={() => setConfig(prev => ({ ...prev, prompt: item.prompt }))}
                                onMouseEnter={() => setHoverPrompt(item.prompt)}
                                onMouseLeave={() => setHoverPrompt(null)}
                                className="px-2 py-1 text-[9px] bg-app-element border border-border-base rounded hover:border-accent-main hover:text-txt-main hover:bg-app-hover transition-all duration-200 text-txt-muted font-mono uppercase tracking-tight"
                            >
                                {item.label}
                            </button>
                          ))}
                      </div>
                  ))}
              </div>
            </div>

            {/* Advanced Style Selector */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-accent-main uppercase tracking-wider font-mono">
                Style & Layout
              </label>
              
              {/* Custom Style Dropdown */}
              <div className="relative" ref={styleRef}>
                  <button 
                    onClick={() => setIsStyleOpen(!isStyleOpen)}
                    className={`w-full bg-app-element border ${isStyleOpen ? 'border-accent-main shadow-lg' : 'border-border-base'} rounded-lg p-3 flex items-center justify-between text-xs text-txt-main transition-all hover:border-txt-dim`}
                  >
                      <span className="font-bold">{config.style}</span>
                      <ChevronDown className={`w-4 h-4 text-txt-muted transition-transform ${isStyleOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isStyleOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-app-panel border border-border-base rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto scrollbar-thin">
                          {Object.values(PixelStyle).map(style => (
                              <button
                                key={style}
                                onClick={() => { setConfig({ ...config, style }); setIsStyleOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-app-hover border-b border-border-base last:border-0 transition-colors group"
                              >
                                  <div className="text-xs font-bold text-txt-main mb-0.5 group-hover:text-accent-main transition-colors">{style}</div>
                                  <div className="text-[10px] text-txt-muted">{STYLE_DESCRIPTIONS[style]}</div>
                              </button>
                          ))}
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Custom Type Dropdown */}
                <div className="relative" ref={typeRef}>
                    <button 
                        onClick={() => setIsTypeOpen(!isTypeOpen)}
                        className={`w-full bg-app-element border ${isTypeOpen ? 'border-accent-main shadow-lg' : 'border-border-base'} rounded-lg p-3 flex items-center justify-between text-xs text-txt-main transition-all hover:border-txt-dim`}
                    >
                        <span className="font-bold truncate">{config.outputType}</span>
                        <ChevronDown className={`w-4 h-4 text-txt-muted transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTypeOpen && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-app-panel border border-border-base rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto scrollbar-thin">
                            {Object.values(OutputType).map(type => (
                                <button
                                    key={type}
                                    onClick={() => { 
                                        let newRatio = config.aspectRatio;
                                        if (type === OutputType.SCENE) newRatio = "16:9";
                                        if (type === OutputType.PORTRAIT) newRatio = "3:4";
                                        setConfig({ ...config, outputType: type, aspectRatio: newRatio }); 
                                        setIsTypeOpen(false); 
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-app-hover border-b border-border-base last:border-0 text-xs font-bold text-txt-main transition-colors hover:text-accent-main"
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Aspect Ratio Dropdown */}
                <div className="relative" ref={ratioRef}>
                    <button 
                        onClick={() => setIsRatioOpen(!isRatioOpen)}
                        className={`w-full bg-app-element border ${isRatioOpen ? 'border-accent-main shadow-lg' : 'border-border-base'} rounded-lg p-3 flex items-center justify-between text-xs text-txt-main transition-all hover:border-txt-dim`}
                    >
                        <span className="font-bold">{ASPECT_RATIOS.find(r => r.value === config.aspectRatio)?.label || config.aspectRatio}</span>
                        <ChevronDown className={`w-4 h-4 text-txt-muted transition-transform ${isRatioOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isRatioOpen && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-app-panel border border-border-base rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto scrollbar-thin">
                            {ASPECT_RATIOS.map(ratio => (
                                <button
                                    key={ratio.value}
                                    onClick={() => { setConfig({ ...config, aspectRatio: ratio.value }); setIsRatioOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-app-hover border-b border-border-base last:border-0 text-xs font-bold text-txt-main transition-colors hover:text-accent-main"
                                >
                                    {ratio.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
              </div>
            </div>

            {/* GENERATION SETTINGS (Background) */}
             <div className="bg-app-element border border-border-base rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <PaintBucket className="w-3 h-3 text-accent-main" />
                    <span className="text-[10px] font-bold text-txt-muted uppercase font-mono">Generator Background</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {/* None Option */}
                     <button
                        onClick={() => handleBgColorChange('none')}
                        className={`w-full aspect-square rounded border transition-all duration-200 flex items-center justify-center bg-[#1a1a1a] ${config.generatorBackground === 'none' ? 'border-txt-main scale-110 shadow-lg ring-1 ring-txt-main' : 'border-transparent hover:scale-105 hover:border-txt-dim'}`}
                        title="No Background (Fill Canvas)"
                    >
                        <Ban className="w-3 h-3 text-zinc-500" />
                    </button>

                    {BG_COLORS.map(c => (
                        <button
                            key={c.color}
                            onClick={() => handleBgColorChange(c.color)}
                            className={`w-full aspect-square rounded border transition-all duration-200 ${config.generatorBackground === c.color ? 'border-txt-main scale-110 shadow-lg ring-1 ring-txt-main' : 'border-transparent hover:scale-105 hover:border-white/50'}`}
                            style={{ backgroundColor: c.color }}
                            title={c.label}
                        />
                    ))}
                </div>
             </div>

            {/* SPRITE SHEET CONFIG (Conditional) */}
            {config.outputType === OutputType.SHEET && (
                 <div className="bg-app-element border border-border-base rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-1">
                        <LayoutGrid className="w-3 h-3 text-accent-main" />
                        <span className="text-[10px] font-bold text-txt-muted uppercase font-mono">Sheet Settings</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="block text-[10px] text-txt-dim font-mono">Cols (X)</label>
                            <input 
                                type="number" min="1" max="12"
                                value={config.sheetConfig.columns}
                                onChange={(e) => updateSheetConfig('columns', parseInt(e.target.value))}
                                className="w-full bg-app-bg border border-border-base rounded px-2 py-1.5 text-txt-main text-xs focus:border-accent-main outline-none transition-colors"
                            />
                        </div>
                         <div className="space-y-1">
                            <label className="block text-[10px] text-txt-dim font-mono">Rows (Y)</label>
                            <input 
                                type="number" min="1" max="12"
                                value={config.sheetConfig.rows}
                                onChange={(e) => updateSheetConfig('rows', parseInt(e.target.value))}
                                className="w-full bg-app-bg border border-border-base rounded px-2 py-1.5 text-txt-main text-xs focus:border-accent-main outline-none transition-colors"
                            />
                        </div>
                    </div>
                     <div className="space-y-1">
                        <label className="block text-[10px] text-txt-dim font-mono">Padding ({config.sheetConfig.padding}px)</label>
                        <input 
                            type="range" min="0" max="64"
                            value={config.sheetConfig.padding}
                            onChange={(e) => updateSheetConfig('padding', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-app-bg rounded-lg appearance-none cursor-pointer accent-accent-main"
                        />
                    </div>
                 </div>
            )}

            {/* Reference Image */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                     <button 
                        onClick={() => setShowRefImage(!showRefImage)}
                        className="flex items-center gap-2 text-[10px] font-bold text-txt-muted uppercase tracking-wider font-mono hover:text-txt-main transition-colors"
                     >
                         <div className={`w-3 h-3 rounded-sm border border-txt-dim flex items-center justify-center transition-colors ${showRefImage ? 'bg-accent-main border-accent-main' : ''}`}>
                             {showRefImage && <Check className="w-2 h-2 text-accent-text" />}
                         </div>
                         Reference Image
                     </button>
                </div>
                
                {showRefImage && (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                        
                        {/* Reuse Toggle */}
                        {lastGeneratedImage && (
                            <div className="flex items-center justify-between bg-app-element p-2 rounded border border-border-base">
                                <span className="text-[10px] font-bold text-accent-main uppercase flex items-center gap-2">
                                    <RotateCcw className="w-3 h-3" /> Reuse Last Result
                                </span>
                                <button 
                                    onClick={() => toggleReuseLast(!reuseLast)}
                                    className={`w-8 h-4 rounded-full relative transition-all ${reuseLast ? 'bg-accent-main' : 'bg-txt-dim'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${reuseLast ? 'left-4.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        )}

                        <div 
                            onClick={() => !reuseLast && fileInputRef.current?.click()}
                            className={`
                                relative rounded-lg border-2 border-dashed transition-all cursor-pointer group overflow-hidden duration-200
                                ${config.referenceImage ? 'border-border-base bg-app-element' : 'border-border-base bg-app-element/50 hover:border-txt-muted'}
                                ${reuseLast ? 'opacity-100 border-accent-main/50' : ''}
                            `}
                        >
                            {!config.referenceImage ? (
                                <div className="h-20 flex flex-col items-center justify-center text-txt-muted group-hover:text-txt-main transition-colors">
                                    <Upload className="w-5 h-5 mb-2 opacity-50" />
                                    <span className="text-[10px] font-mono uppercase">Upload Image</span>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img 
                                        src={config.referenceImage} 
                                        alt="Reference" 
                                        className="w-full h-24 object-contain bg-app-element/50" 
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
                <div className="flex justify-between items-center pb-2 border-b border-border-base">
                    <h3 className="text-[10px] font-bold text-accent-main uppercase tracking-widest">Adjustments</h3>
                    <button onClick={resetSliders} className="text-[10px] flex items-center gap-1 text-txt-muted hover:text-txt-main transition-colors">
                        <RefreshCcw className="w-3 h-3" /> Reset All
                    </button>
                </div>

                {/* Pixel Scale */}
                <div className="space-y-3">
                    <label className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-txt-muted uppercase font-mono flex items-center gap-2">
                           <Monitor className="w-3 h-3"/> Pixel Scale
                        </span>
                        <span className="text-[10px] text-accent-main font-mono bg-app-element px-2 py-1 rounded border border-border-base">
                            1:{config.postProcess.pixelSize}
                        </span>
                    </label>
                    
                    <input 
                        type="range" 
                        min="1" max="64" step="1"
                        value={config.postProcess.pixelSize}
                        onChange={(e) => updatePostProcess('pixelSize', parseInt(e.target.value))}
                        className="w-full h-2 bg-app-element rounded-lg appearance-none cursor-pointer accent-accent-main"
                    />
                    
                    <div className="flex justify-between items-center text-[10px] font-mono">
                         <span className="text-txt-dim">Original</span>
                         <span className="text-txt-muted font-bold">{getResDisplay()} px</span>
                    </div>
                </div>

                 {/* Grid Controls */}
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-txt-muted uppercase font-mono flex items-center gap-2">
                            <Grid3X3 className="w-3 h-3" /> Pixel Grid
                        </label>
                        <button
                            onClick={() => updatePostProcess('showGrid', !config.postProcess.showGrid)}
                            className={`w-9 h-5 rounded-full relative transition-all ${config.postProcess.showGrid ? 'bg-accent-main' : 'bg-txt-dim'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${config.postProcess.showGrid ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>
                    
                    {config.postProcess.showGrid && (
                        <div className="space-y-3 bg-app-element p-3 rounded-lg border border-border-base animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1">
                                <label className="block text-[10px] text-txt-dim font-mono mb-2">Grid Cell Size</label>
                                <input 
                                    type="number" 
                                    min="1" max="512"
                                    value={config.postProcess.gridSize}
                                    onChange={(e) => updatePostProcess('gridSize', parseInt(e.target.value))}
                                    className="w-full bg-app-bg border border-border-base rounded px-2 py-1.5 text-txt-main font-mono text-xs focus:border-accent-main outline-none transition-colors"
                                />
                            </div>
                             <div className="space-y-1">
                                <label className="block text-[10px] text-txt-dim font-mono mb-2">Opacity</label>
                                <input 
                                    type="range" 
                                    min="0.1" max="1" step="0.1"
                                    value={config.postProcess.gridOpacity}
                                    onChange={(e) => updatePostProcess('gridOpacity', parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-app-bg rounded-lg appearance-none cursor-pointer accent-accent-main"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-txt-muted font-mono">Grid Color</span>
                                <div className="flex items-center gap-2 bg-app-bg rounded p-1 border border-border-base">
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

                 {/* PREVIEW BACKGROUND PICKER */}
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-txt-muted uppercase font-mono flex items-center gap-2">
                            <Eye className="w-3 h-3" /> Preview Background
                        </label>
                        <div className="flex items-center gap-2">
                             <button
                                onClick={() => setPreviewBackgroundColor('transparent')}
                                className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${previewBackgroundColor === 'transparent' ? 'border-txt-main ring-1 ring-txt-main' : 'border-transparent hover:border-txt-dim'}`}
                                title="Checkerboard"
                            >
                                <div className="w-full h-full bg-[linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%),linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%)] bg-[length:6px_6px] opacity-50" />
                            </button>
                            <input 
                                type="color"
                                value={previewBackgroundColor === 'transparent' ? '#000000' : previewBackgroundColor}
                                onChange={(e) => setPreviewBackgroundColor(e.target.value)}
                                className="w-5 h-5 rounded overflow-hidden border-0 p-0 cursor-pointer"
                                title="Solid Color"
                            />
                        </div>
                    </div>
                 </div>

                {/* Transparency & Outlines */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-txt-muted uppercase font-mono flex items-center gap-2">
                             <Eraser className="w-3 h-3" /> Chroma Key / BG Removal
                        </label>
                        <button
                            onClick={() => updatePostProcess('removeBackground', !config.postProcess.removeBackground)}
                            className={`w-9 h-5 rounded-full relative transition-all ${config.postProcess.removeBackground ? 'bg-accent-main' : 'bg-txt-dim'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${config.postProcess.removeBackground ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>

                    {config.postProcess.removeBackground && (
                        <div className="p-3 bg-app-element rounded-lg border border-border-base space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                             {/* Key Color Picker */}
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] text-txt-muted font-mono">Key Color</span>
                                <div className="flex items-center gap-2 bg-app-bg rounded p-1 border border-border-base">
                                    <input 
                                        type="color"
                                        value={config.postProcess.transparentColor}
                                        onChange={(e) => updatePostProcess('transparentColor', e.target.value)}
                                        className="w-5 h-5 rounded overflow-hidden border-0 p-0 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-mono text-txt-muted uppercase w-12">{config.postProcess.transparentColor}</span>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] text-txt-dim font-mono flex justify-between">
                                    Tolerance <span>{config.postProcess.transparencyTolerance}%</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" max="100"
                                    value={config.postProcess.transparencyTolerance}
                                    onChange={(e) => updatePostProcess('transparencyTolerance', parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-app-bg rounded-lg appearance-none cursor-pointer accent-accent-main"
                                />
                             </div>

                             {/* Contiguous Toggle */}
                             <div className="flex items-center justify-between">
                                <label className="text-[10px] text-txt-muted font-mono flex items-center gap-2" title="Only remove background pixels connected to the corners">
                                    <Spline className="w-3 h-3" /> Contiguous (Smart)
                                </label>
                                <button
                                    onClick={() => updatePostProcess('contiguous', !config.postProcess.contiguous)}
                                    className={`w-8 h-4 rounded-full relative transition-all ${config.postProcess.contiguous ? 'bg-accent-main' : 'bg-txt-dim'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${config.postProcess.contiguous ? 'left-4.5' : 'left-0.5'}`} />
                                </button>
                             </div>
                             
                             <hr className="border-border-base" />

                             {/* OUTER OUTLINE */}
                             <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-txt-muted uppercase font-mono flex items-center gap-2">
                                        <BoxSelect className="w-3 h-3" /> Outer Stroke
                                    </label>
                                    <button
                                        onClick={() => updatePostProcess('outlineOuter', !config.postProcess.outlineOuter)}
                                        className={`w-9 h-5 rounded-full relative transition-all ${config.postProcess.outlineOuter ? 'bg-txt-main' : 'bg-txt-dim'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-transform shadow-sm ${config.postProcess.outlineOuter ? 'left-5 bg-app-bg' : 'left-1 bg-app-bg'}`} />
                                    </button>
                                </div>
                                {config.postProcess.outlineOuter && (
                                    <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-border-base">
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
                                            className="h-1.5 bg-app-bg rounded-lg appearance-none cursor-pointer accent-txt-main self-center"
                                        />
                                    </div>
                                )}
                             </div>

                             {/* INNER OUTLINE */}
                             <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-txt-muted uppercase font-mono flex items-center gap-2">
                                        <BoxSelect className="w-3 h-3 text-txt-dim" /> Inner Stroke
                                    </label>
                                    <button
                                        onClick={() => updatePostProcess('outlineInner', !config.postProcess.outlineInner)}
                                        className={`w-9 h-5 rounded-full relative transition-all ${config.postProcess.outlineInner ? 'bg-txt-main' : 'bg-txt-dim'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-transform shadow-sm ${config.postProcess.outlineInner ? 'left-5 bg-app-bg' : 'left-1 bg-app-bg'}`} />
                                    </button>
                                </div>
                                {config.postProcess.outlineInner && (
                                    <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-border-base">
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
                                            className="h-1.5 bg-app-bg rounded-lg appearance-none cursor-pointer accent-txt-main self-center"
                                        />
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                 </div>

                {/* Sexy Palette Selection */}
                <div className="space-y-2">
                     <label className="block text-[10px] font-bold text-txt-muted uppercase font-mono">
                        Color Palette
                    </label>
                    
                    <div className="relative" ref={paletteRef}>
                        <button 
                            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                            className={`w-full bg-app-element border ${isPaletteOpen ? 'border-accent-main shadow-lg' : 'border-border-base'} rounded-lg h-10 px-3 flex items-center justify-between text-xs text-txt-main hover:border-txt-dim transition-all`}
                        >
                            <span className="flex items-center gap-2">
                                {PALETTES[config.postProcess.palette].label}
                                {config.postProcess.palette !== 'none' && (
                                    <div className="flex -space-x-1">
                                        {PALETTES[config.postProcess.palette].colors.slice(0, 4).map((c, i) => (
                                            <div 
                                                key={i} 
                                                className="w-2 h-2 rounded-full ring-1 ring-app-panel"
                                                style={{ backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` }} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-txt-muted transition-transform ${isPaletteOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isPaletteOpen && (
                            <div className="absolute bottom-full mb-2 left-0 w-full bg-app-panel border border-border-base rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 scrollbar-thin">
                                {Object.entries(PALETTES).map(([key, pal]) => (
                                    <button
                                        key={key}
                                        onClick={() => { updatePostProcess('palette', key); setIsPaletteOpen(false); }}
                                        className="w-full flex flex-col px-3 py-2 hover:bg-app-hover border-b border-border-base/50 last:border-0 text-left transition-colors group"
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <span className={`text-xs font-medium ${config.postProcess.palette === key ? 'text-accent-main' : 'text-txt-muted'} group-hover:text-txt-main transition-colors`}>
                                                {pal.label}
                                            </span>
                                            {config.postProcess.palette === key && <Check className="w-3 h-3 text-accent-main" />}
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
                                                <div className="w-full h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-50" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-border-base" />

                {/* Advanced Filters */}
                <div className="space-y-5">
                    <label className="block text-[10px] font-bold text-accent-main uppercase font-mono mb-4 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Effects
                    </label>

                    {/* LIVE PALETTE DISPLAY */}
                    <div className="bg-app-element border border-border-base rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-txt-muted font-mono flex items-center gap-2">
                                <SmilePlus className="w-3 h-3" /> Live Palette
                            </span>
                            <span className="text-[9px] font-mono text-txt-dim">
                                {analyzedPalette.length} Colors Found
                            </span>
                        </div>
                        {analyzedPalette.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {analyzedPalette.slice(0, 32).map((color, idx) => (
                                    <div 
                                        key={idx}
                                        className="w-4 h-4 rounded-sm border border-border-base/50 shadow-sm"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                                {analyzedPalette.length > 32 && (
                                    <span className="text-[9px] text-txt-dim self-center">+{analyzedPalette.length - 32}</span>
                                )}
                            </div>
                        ) : (
                            <div className="text-[10px] text-txt-dim italic text-center py-2">
                                Generate art to analyze colors
                            </div>
                        )}
                    </div>

                     {/* Reduce Colors */}
                    {config.postProcess.palette === 'none' && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono text-txt-dim">
                                <span>Color Count</span>
                                <span className="text-txt-muted">{config.postProcess.reduceColors === 0 ? 'Unlimited' : config.postProcess.reduceColors}</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="32" step="1"
                                value={config.postProcess.reduceColors}
                                onChange={(e) => updatePostProcess('reduceColors', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-app-element rounded-lg appearance-none cursor-pointer accent-accent-main"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono text-txt-dim">
                                <span>Noise</span>
                                <span className="text-txt-muted">{config.postProcess.noise}</span>
                            </div>
                            <input 
                                type="range" min="0" max="100"
                                value={config.postProcess.noise}
                                onChange={(e) => updatePostProcess('noise', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-app-element rounded-lg appearance-none cursor-pointer accent-txt-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-mono text-txt-dim">
                                <span>Hue</span>
                                <span className="text-txt-muted">{config.postProcess.hue}</span>
                            </div>
                            <input 
                                type="range" min="-180" max="180"
                                value={config.postProcess.hue}
                                onChange={(e) => updatePostProcess('hue', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-app-element rounded-lg appearance-none cursor-pointer accent-accent-main"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-txt-dim w-16">Bright</span>
                            <input 
                                type="range" min="-100" max="100"
                                value={config.postProcess.brightness}
                                onChange={(e) => updatePostProcess('brightness', parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-app-element rounded-lg appearance-none cursor-pointer accent-accent-main"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-txt-dim w-16">Contrast</span>
                            <input 
                                type="range" min="-100" max="100"
                                value={config.postProcess.contrast}
                                onChange={(e) => updatePostProcess('contrast', parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-app-element rounded-lg appearance-none cursor-pointer accent-accent-main"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-txt-dim w-16">Sat</span>
                            <input 
                                type="range" min="-100" max="100"
                                value={config.postProcess.saturation}
                                onChange={(e) => updatePostProcess('saturation', parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-app-element rounded-lg appearance-none cursor-pointer accent-accent-main"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Action Button */}
      <div className="p-6 border-t border-border-base bg-app-panel">
        <button
          onClick={onGenerate}
          disabled={isGenerating || !config.prompt}
          className={`
            w-full py-4 rounded font-pixel text-sm font-bold uppercase tracking-widest relative group
            transition-all duration-200 border-2 overflow-hidden
            ${isGenerating || !config.prompt 
                ? 'bg-app-element border-border-base text-txt-dim cursor-not-allowed' 
                : 'bg-accent-main border-txt-inverted text-accent-text hover:bg-accent-hover hover:shadow-lg'}
          `}
        >
          <div className="flex items-center justify-center gap-3 relative z-10">
            {isGenerating ? (
                <>
                 <div className="w-4 h-4 border-2 border-accent-text border-t-transparent rounded-full animate-spin" />
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
