
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import PreviewArea from './components/PreviewArea';
import { GenerationState, PixelConfig, PixelStyle, OutputType } from './types';
import { generatePixelArt } from './services/gemini';

const App: React.FC = () => {
  const [config, setConfig] = useState<PixelConfig>({
    prompt: '',
    style: PixelStyle.SNES,
    outputType: OutputType.SINGLE,
    referenceImage: null,
    generatorBackground: '#FF00FF', // Magenta default for classic sprite transparency
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
      gridSize: 1, 
      gridOpacity: 0.5,
      gridColor: '#00f0ff',
      removeBackground: false,
      transparentColor: '#FF00FF', 
      transparencyTolerance: 10,
      
      // New Outline Config
      outlineOuter: false,
      outlineOuterColor: '#FFFFFF',
      outlineOuterWidth: 1,
      outlineInner: false,
      outlineInnerColor: '#000000',
      outlineInnerWidth: 1,
    }
  });

  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    resultImage: null,
    error: null,
  });

  const [currentDimensions, setCurrentDimensions] = useState<{w: number, h: number} | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!config.prompt) return;

    setGenerationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await generatePixelArt(
        config.prompt,
        config.style,
        config.outputType,
        config.sheetConfig,
        config.referenceImage,
        config.generatorBackground
      );

      setGenerationState({
        isLoading: false,
        resultImage: result,
        error: null,
      });
    } catch (err: any) {
      setGenerationState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "An unexpected error occurred.",
      }));
    }
  }, [config]);

  return (
    <div className="flex flex-col h-screen bg-[#050410] text-white overflow-hidden font-sans">
      <Header />
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Panel: Controls */}
        <div className="w-full md:w-[380px] z-20 flex-shrink-0 bg-[#080715] h-full overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.8)] border-r border-[#1f1d35]">
          <ControlPanel
            config={config}
            setConfig={setConfig}
            onGenerate={handleGenerate}
            isGenerating={generationState.isLoading}
            lastGeneratedImage={generationState.resultImage}
            imageDimensions={currentDimensions}
          />
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 overflow-hidden bg-[#020205] relative z-10">
          <PreviewArea 
            state={generationState} 
            config={config} 
            onDimensionsChange={setCurrentDimensions}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
