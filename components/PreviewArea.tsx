
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Download, Grid } from 'lucide-react';
import { GenerationState, PixelConfig } from '../types';
import { PALETTES } from '../constants';

interface PreviewAreaProps {
  state: GenerationState;
  config: PixelConfig;
  onDimensionsChange?: (dims: {w: number, h: number}) => void;
}

const getNearestColor = (r: number, g: number, b: number, palette: number[][]) => {
  let minDist = Infinity;
  let nearest = palette[0];

  for (const color of palette) {
    const dist = Math.pow(r - color[0], 2) + Math.pow(g - color[1], 2) + Math.pow(b - color[2], 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = color;
    }
  }
  return nearest;
};

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ state, config, onDimensionsChange }) => {
  const { isLoading, resultImage, error } = state;
  const { 
      pixelSize, brightness, contrast, saturation, hue, noise, reduceColors, palette, 
      showGrid, gridSize, gridOpacity, gridColor, 
      removeBackground, transparentColor, transparencyTolerance, 
      outlineOuter, outlineOuterColor, outlineOuterWidth,
      outlineInner, outlineInnerColor, outlineInnerWidth
  } = config.postProcess;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [processedImageURL, setProcessedImageURL] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{w: number, h: number}>({ w: 0, h: 0 });
  const [wrapperStyle, setWrapperStyle] = useState<{width: number, height: number}>({ width: 0, height: 0 });

  useEffect(() => {
    if (onDimensionsChange && resultImage && imageDimensions.w === 0) {
         const img = new Image();
         img.src = resultImage;
         img.onload = () => onDimensionsChange({w: img.width, h: img.height});
    }
  }, [resultImage, onDimensionsChange, imageDimensions.w]);

  // --- Image Processing Effect ---
  useEffect(() => {
    if (!resultImage || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = resultImage;
    
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const w = Math.max(1, Math.floor(img.width / pixelSize));
      const h = Math.max(1, Math.floor(img.height / pixelSize));

      canvas.width = w;
      canvas.height = h;
      setImageDimensions({ w, h });

      ctx.imageSmoothingEnabled = false;

      // 1. Basic CSS Filters
      let filterString = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%) hue-rotate(${hue}deg)`;
      ctx.filter = filterString;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none'; 

      // 2. Pixel Manipulation
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      const targetRGB = hexToRgb(transparentColor);
      const toleranceDistSq = Math.pow((transparencyTolerance / 100) * 442, 2);
      
      // PASS 1: Noise & Transparency
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];

        // Noise Check
        if (noise > 0) {
            const n = (Math.random() - 0.5) * (noise * 2);
            r = Math.min(255, Math.max(0, r + n));
            g = Math.min(255, Math.max(0, g + n));
            b = Math.min(255, Math.max(0, b + n));
        }

        // Transparency Check
        if (removeBackground && targetRGB) {
             const distSq = Math.pow(r - targetRGB.r, 2) + Math.pow(g - targetRGB.g, 2) + Math.pow(b - targetRGB.b, 2);
             if (distSq <= toleranceDistSq) {
                 data[i+3] = 0;
             }
        }
        
        data[i] = r;
        data[i+1] = g;
        data[i+2] = b;
      }

      // PASS 2: Outlines (Independent Inner and Outer)
      if (removeBackground && (outlineOuter || outlineInner)) {
          const outerRGB = hexToRgb(outlineOuterColor) || { r: 255, g: 255, b: 255 };
          const innerRGB = hexToRgb(outlineInnerColor) || { r: 0, g: 0, b: 0 };
          
          // Create Alpha Map (1 = Opaque, 0 = Transparent)
          const alphaMap = new Uint8Array(w * h);
          for (let i = 0; i < w * h; i++) {
              alphaMap[i] = data[i*4 + 3] > 128 ? 1 : 0;
          }

          const pixelsToPaintOuter = new Set<number>();
          const pixelsToPaintInner = new Set<number>();

          for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                  const idx = y * w + x;
                  const isOpaque = alphaMap[idx] === 1;

                  // Inner Stroke Logic: Pixels are Opaque, check if neighbors are transparent
                  if (isOpaque && outlineInner) {
                      const width = outlineInnerWidth;
                      let foundTransparent = false;
                      
                      // Search neighbor area
                      searchLoopInner:
                      for (let dy = -width; dy <= width; dy++) {
                          for (let dx = -width; dx <= width; dx++) {
                              // Only check exact distance if needed for rounded corners, but for pixel art box check is usually fine.
                              // Let's stick to box check for 'blocky' look or use euclidean for 'rounded'.
                              // Blocky (Chebyshev distance) fits pixel art better usually.
                              const ny = y + dy;
                              const nx = x + dx;
                              
                              // If neighbor is out of bounds, it counts as transparent edge
                              if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
                                  foundTransparent = true;
                                  break searchLoopInner;
                              }
                              
                              if (alphaMap[ny * w + nx] === 0) {
                                  foundTransparent = true;
                                  break searchLoopInner;
                              }
                          }
                      }
                      if (foundTransparent) pixelsToPaintInner.add(idx);
                  }

                  // Outer Stroke Logic: Pixels are Transparent, check if neighbors are opaque
                  if (!isOpaque && outlineOuter) {
                      const width = outlineOuterWidth;
                      let foundOpaque = false;
                      
                      searchLoopOuter:
                      for (let dy = -width; dy <= width; dy++) {
                          for (let dx = -width; dx <= width; dx++) {
                              const ny = y + dy;
                              const nx = x + dx;
                              
                              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                  if (alphaMap[ny * w + nx] === 1) {
                                      foundOpaque = true;
                                      break searchLoopOuter;
                                  }
                              }
                          }
                      }
                      if (foundOpaque) pixelsToPaintOuter.add(idx);
                  }
              }
          }

          // Apply Inner Paint (Overwrite existing pixels)
          pixelsToPaintInner.forEach(idx => {
              const i = idx * 4;
              data[i] = innerRGB.r;
              data[i+1] = innerRGB.g;
              data[i+2] = innerRGB.b;
              data[i+3] = 255; 
          });

          // Apply Outer Paint (Fill transparent pixels)
          pixelsToPaintOuter.forEach(idx => {
              const i = idx * 4;
              data[i] = outerRGB.r;
              data[i+1] = outerRGB.g;
              data[i+2] = outerRGB.b;
              data[i+3] = 255;
          });
      }


      // PASS 3: Palette Mapping
      if (palette !== 'none' && PALETTES[palette] || reduceColors > 0) {
          for (let i = 0; i < data.length; i += 4) {
              if (data[i+3] === 0) continue;

              let r = data[i];
              let g = data[i+1];
              let b = data[i+2];

              if (palette !== 'none' && PALETTES[palette]) {
                const [nR, nG, nB] = getNearestColor(r, g, b, PALETTES[palette].colors);
                data[i] = nR;
                data[i+1] = nG;
                data[i+2] = nB;
              } else if (reduceColors > 0) {
                const levels = reduceColors;
                const step = 255 / (levels - 1);
                data[i] = Math.round(r / step) * step;
                data[i+1] = Math.round(g / step) * step;
                data[i+2] = Math.round(b / step) * step;
              }
          }
      }
      
      ctx.putImageData(imageData, 0, 0);
      setProcessedImageURL(canvas.toDataURL('image/png'));
    };

  }, [
      resultImage, pixelSize, brightness, contrast, saturation, hue, noise, reduceColors, palette, 
      removeBackground, transparentColor, transparencyTolerance, 
      outlineOuter, outlineOuterColor, outlineOuterWidth,
      outlineInner, outlineInnerColor, outlineInnerWidth
  ]);


  // --- Wrapper Sizing & Grid Overlay ---
  useLayoutEffect(() => {
      const updateLayout = () => {
          if (!mainContainerRef.current || imageDimensions.w === 0 || !resultImage) return;
          
          const container = mainContainerRef.current;
          const containerW = container.clientWidth - 64; 
          const containerH = container.clientHeight - 64; 
          
          const imageRatio = imageDimensions.w / imageDimensions.h;
          const containerRatio = containerW / containerH;

          let finalW, finalH;

          if (containerRatio > imageRatio) {
              finalH = containerH;
              finalW = finalH * imageRatio;
          } else {
              finalW = containerW;
              finalH = finalW / imageRatio;
          }

          setWrapperStyle({ width: finalW, height: finalH });
      };

      window.addEventListener('resize', updateLayout);
      updateLayout(); 
      
      const observer = new ResizeObserver(updateLayout);
      if (mainContainerRef.current) observer.observe(mainContainerRef.current);

      return () => {
          window.removeEventListener('resize', updateLayout);
          observer.disconnect();
      }

  }, [imageDimensions, resultImage]);


  // Draw Grid
  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas || !showGrid || imageDimensions.w === 0 || wrapperStyle.width === 0) {
         if (gridCanvas) {
             const ctx = gridCanvas.getContext('2d');
             ctx?.clearRect(0,0, gridCanvas.width, gridCanvas.height);
         }
         return;
    }

    gridCanvas.width = wrapperStyle.width;
    gridCanvas.height = wrapperStyle.height;

    const ctx = gridCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

    const pixelW = wrapperStyle.width / imageDimensions.w;
    const pixelH = wrapperStyle.height / imageDimensions.h;

    const stepX = gridSize * pixelW;
    const stepY = gridSize * pixelH;

    // Convert hex gridColor to rgba for opacity
    const rgb = hexToRgb(gridColor);
    ctx.strokeStyle = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})` : `rgba(0, 240, 255, ${gridOpacity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical Lines
    for (let x = stepX; x < wrapperStyle.width - 0.1; x += stepX) {
        const screenX = Math.floor(x) + 0.5;
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, wrapperStyle.height);
    }

    // Horizontal Lines
    for (let y = stepY; y < wrapperStyle.height - 0.1; y += stepY) {
            const screenY = Math.floor(y) + 0.5;
            ctx.moveTo(0, screenY);
            ctx.lineTo(wrapperStyle.width, screenY);
    }

    ctx.stroke();
    
    ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
    ctx.strokeRect(0, 0, wrapperStyle.width, wrapperStyle.height);

  }, [showGrid, gridSize, gridOpacity, gridColor, imageDimensions, wrapperStyle]);


  const handleDownload = (hd: boolean) => {
    if (!processedImageURL) return;
    
    const link = document.createElement('a');
    
    if (hd) {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        const img = new Image();
        img.src = processedImageURL;
        img.onload = () => {
            if (!ctx) return;
            const hdScale = Math.ceil(2048 / Math.max(img.width, img.height));
            tempCanvas.width = img.width * hdScale;
            tempCanvas.height = img.height * hdScale;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
            link.href = tempCanvas.toDataURL('image/png');
            link.download = `pixel-banana-hd-${Date.now()}.png`;
            link.click();
        }
    } else {
        link.href = processedImageURL;
        link.download = `pixel-banana-native-${Date.now()}.png`;
        link.click();
    }
  };

  return (
    <div className="h-full bg-[#020205] relative flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {resultImage && !isLoading && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
             <button 
                onClick={() => handleDownload(false)}
                className="px-3 py-2 bg-[#0a0918]/90 hover:bg-neon-blue hover:text-black text-[10px] text-white rounded border border-[#1f1d35] transition-colors shadow-lg font-mono uppercase tracking-wide"
            >
              <Download className="w-3 h-3 inline mr-2" />
              Native ({imageDimensions.w}px)
            </button>
            <button 
                onClick={() => handleDownload(true)}
                className="px-3 py-2 bg-[#0a0918]/90 hover:bg-neon-purple hover:text-white text-[10px] text-white rounded border border-[#1f1d35] transition-colors shadow-lg font-mono uppercase tracking-wide"
            >
              <Download className="w-3 h-3 inline mr-2" />
              HD (2K)
            </button>
          </div>
        )}
      </div>

      {/* Main Display Area */}
      <div 
        ref={mainContainerRef} 
        className="flex-1 flex items-center justify-center overflow-hidden relative bg-[#020205]"
      >
        {/* Subtle Background */}
        <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
             style={{
                backgroundImage: `radial-gradient(circle at center, #1f1d35 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
            }}
        />

        {isLoading ? (
          <div className="text-center space-y-6 z-10">
             <div className="relative">
                <div className="w-24 h-24 border-4 border-[#1f1d35] border-t-neon-pink border-r-neon-blue rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">🍌</div>
             </div>
             <div className="space-y-1">
                <p className="text-neon-blue font-pixel text-xs tracking-widest uppercase animate-pulse">Synthesizing</p>
             </div>
          </div>
        ) : error ? (
            <div className="max-w-md p-6 bg-red-900/20 border border-red-500/50 rounded-lg text-center z-10 shadow-[0_0_30px_rgba(255,0,0,0.2)]">
                <p className="text-red-400 font-bold mb-2 font-pixel text-xs">SYSTEM FAILURE</p>
                <p className="text-xs text-gray-400 font-mono">{error}</p>
            </div>
        ) : resultImage ? (
            <div 
                ref={wrapperRef}
                className="relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group select-none"
                style={{
                    width: wrapperStyle.width,
                    height: wrapperStyle.height
                }}
            >
                {/* Grid Canvas Overlay */}
                <canvas 
                    ref={gridCanvasRef}
                    className="absolute inset-0 z-20 pointer-events-none w-full h-full"
                />

                {/* Processed Image */}
                <img
                src={processedImageURL || resultImage}
                alt="Generated Pixel Art"
                className="w-full h-full object-contain block bg-transparent"
                style={{ imageRendering: 'pixelated' }}
                />
          </div>
        ) : (
          <div className="text-center opacity-20 z-10 select-none group">
            <Grid className="w-24 h-24 mx-auto mb-4 text-[#1f1d35] group-hover:text-neon-purple transition-colors duration-500" />
            <h2 className="text-2xl font-bold text-[#1f1d35] font-pixel group-hover:text-neon-blue transition-colors">NO SIGNAL</h2>
            <p className="text-gray-700 mt-4 font-mono text-xs uppercase tracking-widest">Waiting for input stream...</p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {processedImageURL && !isLoading && (
         <div className="bg-[#050410] border-t border-[#1f1d35] px-4 py-3 flex justify-between items-center text-[10px] text-gray-500 font-mono select-none z-30 relative">
            <div className="flex items-center gap-4">
                <span className="text-neon-blue">RES: {imageDimensions.w}×{imageDimensions.h}</span>
                <span className="text-neon-pink">SCALE: 1/{pixelSize}</span>
                {palette !== 'none' && <span className="text-neon-green">PALETTE: {PALETTES[palette].label.toUpperCase()}</span>}
            </div>
            <span className="opacity-50">GEMINI 2.5 FLASH IMAGE</span>
         </div>
      )}
    </div>
  );
};

export default PreviewArea;
