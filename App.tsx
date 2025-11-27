
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import PreviewArea from './components/PreviewArea';
import { GenerationState, PixelConfig, PixelStyle, OutputType, Theme, ActiveTool, HistoryItem } from './types';
import { generatePixelArt } from './services/gemini';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('midnight');
  const [previewBackgroundColor, setPreviewBackgroundColor] = useState<string>('transparent');
  const [analyzedPalette, setAnalyzedPalette] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ActiveTool>('move');
  const [activeControlTab, setActiveControlTab] = useState<'generate' | 'process' | 'animate' | 'history'>('generate');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [config, setConfig] = useState<PixelConfig>({
    prompt: '',
    style: PixelStyle.SNES,
    outputType: OutputType.SINGLE,
    aspectRatio: '1:1',
    referenceImage: null,
    generatorBackground: '#FF00FF', // Magenta default
    animationSpeed: 8,
    sheetConfig: {
      columns: 4,
      rows: 1,
      padding: 8
    },
    postProcess: {
      pixelSize: 4, 
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      noise: 0,
      palette: 'none',
      reduceColors: 0, 
      showGrid: false,
      showSheetGrid: true,
      gridSize: 1, 
      gridOpacity: 0.5,
      gridColor: '#00f0ff',
      removeBackground: true,
      contiguous: true, // Smart removal on by default
      transparentColor: '#FF00FF', 
      transparencyTolerance: 20, // Higher tolerance default
      
      outlineOuter: false,
      outlineOuterColor: '#FFFFFF',
      outlineOuterWidth: 1,
      outlineOuterOpacity: 1,
      outlineInner: false,
      outlineInnerColor: '#000000',
      outlineInnerWidth: 1,
      outlineInnerOpacity: 1,
      outlineMode: 'both',

      autoCenter: true, // AABB Centering on by default
      animationSpeed: 8
    }
  });

  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    resultImage: null,
    error: null,
  });

  const [currentDimensions, setCurrentDimensions] = useState<{w: number, h: number} | null>(null);

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem('pixel-banana-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = (resultImage: string, currentConfig: PixelConfig) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      prompt: currentConfig.prompt,
      resultImage,
      config: JSON.parse(JSON.stringify(currentConfig)) // Deep copy
    };

    setHistory(prev => {
      const newHistory = [newItem, ...prev].slice(0, 10); // Keep last 10
      try {
        localStorage.setItem('pixel-banana-history', JSON.stringify(newHistory));
      } catch (e) {
        console.warn("LocalStorage quota exceeded, could not save history");
      }
      return newHistory;
    });
  };

  const clearHistory = () => {
      setHistory([]);
      localStorage.removeItem('pixel-banana-history');
  };

  const restoreHistoryItem = (item: HistoryItem) => {
      setConfig(item.config);
      setGenerationState({
          isLoading: false,
          resultImage: item.resultImage,
          error: null
      });
      setActiveControlTab('generate');
  };

  const handleGenerate = useCallback(async () => {
    if (!config.prompt) return;

    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await generatePixelArt(
        config.prompt,
        config.style,
        config.outputType,
        config.aspectRatio,
        config.sheetConfig,
        config.referenceImage,
        config.generatorBackground
      );

      setGenerationState({
        isLoading: false,
        resultImage: result,
        error: null,
      });

      saveToHistory(result, config);

    } catch (err: any) {
      setGenerationState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "An unexpected error occurred.",
      }));
    }
  }, [config]);

  const handleColorPick = (color: string) => {
      setConfig(prev => ({
          ...prev,
          postProcess: { ...prev.postProcess, transparentColor: color }
      }));
      setActiveTool('move'); 
  };

  return (
    <div className="flex flex-col h-screen bg-app-bg text-txt-main overflow-hidden font-sans transition-colors duration-300" data-theme={theme}>
      <Header theme={theme} setTheme={setTheme} clearHistory={clearHistory} />
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Panel: Controls - Widened for manual inputs */}
        <div className="w-full md:w-[360px] z-20 flex-shrink-0 bg-app-panel h-full overflow-hidden shadow-xl border-r border-border-base transition-colors duration-300">
          <ControlPanel
            config={config}
            setConfig={setConfig}
            onGenerate={handleGenerate}
            isGenerating={generationState.isLoading}
            lastGeneratedImage={generationState.resultImage}
            imageDimensions={currentDimensions}
            previewBackgroundColor={previewBackgroundColor}
            setPreviewBackgroundColor={setPreviewBackgroundColor}
            analyzedPalette={analyzedPalette}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            activeTab={activeControlTab}
            setActiveTab={setActiveControlTab}
            history={history}
            onRestoreHistory={restoreHistoryItem}
          />
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 overflow-hidden bg-app-bg relative z-10 transition-colors duration-300">
          <PreviewArea 
            state={generationState} 
            config={config} 
            onDimensionsChange={setCurrentDimensions}
            previewBackgroundColor={previewBackgroundColor}
            setAnalyzedPalette={setAnalyzedPalette}
            activeTool={activeTool}
            onColorPick={handleColorPick}
            activeControlTab={activeControlTab}
            setActiveControlTab={setActiveControlTab}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
