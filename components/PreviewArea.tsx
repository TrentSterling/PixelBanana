
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Download, Grid, Move, ZoomIn } from 'lucide-react';
import { GenerationState, PixelConfig } from '../types';
import { PALETTES } from '../constants';

interface PreviewAreaProps {
  state: GenerationState;
  config: PixelConfig;
  onDimensionsChange?: (dims: {w: number, h: number}) => void;
  previewBackgroundColor: string;
  setAnalyzedPalette: (colors: string[]) => void;
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

// --- K-Means Clustering for Accurate Color Quantization ---
const quantizeColors = (imageData: Uint8ClampedArray, k: number): number[][] => {
    const pixels: number[][] = [];
    for (let i = 0; i < imageData.length; i += 4) {
        if (imageData[i + 3] > 128) { // Only opaque pixels
            pixels.push([imageData[i], imageData[i + 1], imageData[i + 2]]);
        }
    }

    if (pixels.length === 0) return [];
    if (pixels.length <= k) return pixels;

    // Initialize centroids randomly
    let centroids = Array.from({ length: k }, () => pixels[Math.floor(Math.random() * pixels.length)]);
    
    // 5 Iterations usually enough for pixel art preview
    for (let iter = 0; iter < 5; iter++) {
        const clusters: number[][][] = Array.from({ length: k }, () => []);
        
        // Assign pixels to nearest centroid
        for (const p of pixels) {
            let minDist = Infinity;
            let clusterIdx = 0;
            for (let i = 0; i < k; i++) {
                const d = Math.pow(p[0] - centroids[i][0], 2) + Math.pow(p[1] - centroids[i][1], 2) + Math.pow(p[2] - centroids[i][2], 2);
                if (d < minDist) {
                    minDist = d;
                    clusterIdx = i;
                }
            }
            clusters[clusterIdx].push(p);
        }

        // Recalculate centroids
        centroids = clusters.map(cluster => {
            if (cluster.length === 0) return [Math.random()*255, Math.random()*255, Math.random()*255];
            const sum = cluster.reduce((acc, val) => [acc[0]+val[0], acc[1]+val[1], acc[2]+val[2]], [0,0,0]);
            return [Math.round(sum[0]/cluster.length), Math.round(sum[1]/cluster.length), Math.round(sum[2]/cluster.length)];
        });
    }
    
    return centroids;
};


const PreviewArea: React.FC<PreviewAreaProps> = ({ state, config, onDimensionsChange, previewBackgroundColor, setAnalyzedPalette }) => {
  const { isLoading, resultImage, error } = state;
  const { 
      pixelSize, brightness, contrast, saturation, hue, noise, reduceColors, palette, 
      showGrid, gridSize, gridOpacity, gridColor, 
      removeBackground, transparentColor, transparencyTolerance, contiguous,
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

  // Viewport State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (onDimensionsChange && resultImage && imageDimensions.w === 0) {
         const img = new Image();
         img.src = resultImage;
         img.onload = () => onDimensionsChange({w: img.width, h: img.height});
    }
  }, [resultImage, onDimensionsChange, imageDimensions.w]);

  // Reset Transform on new Image
  useEffect(() => {
      setTransform({ x: 0, y: 0, scale: 1 });
  }, [resultImage]);

  // --- Pan & Zoom Logic ---
  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const scaleAmount = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(0.1, transform.scale + scaleAmount * transform.scale), 20);
      
      setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!resultImage) return;
      setIsDragging(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !lastMouseRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
      setIsDragging(false);
      lastMouseRef.current = null;
  };

  // --- Image Processing Pipeline ---
  useEffect(() => {
    if (!resultImage || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = resultImage;
    
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // 1. SCALE DOWN
      const w = Math.max(1, Math.floor(img.width / pixelSize));
      const h = Math.max(1, Math.floor(img.height / pixelSize));

      canvas.width = w;
      canvas.height = h;
      setImageDimensions({ w, h });

      ctx.imageSmoothingEnabled = false;

      // 2. APPLY BASIC FILTERS (Brightness, Contrast, Saturation, Hue)
      let filterString = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%) hue-rotate(${hue}deg)`;
      ctx.filter = filterString;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none'; 

      // Get Raw Pixel Data
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      const targetRGB = hexToRgb(transparentColor);
      const toleranceDistSq = Math.pow((transparencyTolerance / 100) * 442, 2);
      
      // 3. CHROMA KEY (Transparency)
      if (removeBackground && targetRGB) {
          if (contiguous) {
              const visited = new Uint8Array(w * h);
              const queue: number[] = [];
              const corners = [0, w - 1, (h - 1) * w, (h - 1) * w + w - 1];
              
              corners.forEach(idx => {
                  const r = data[idx * 4];
                  const g = data[idx * 4 + 1];
                  const b = data[idx * 4 + 2];
                  const distSq = Math.pow(r - targetRGB.r, 2) + Math.pow(g - targetRGB.g, 2) + Math.pow(b - targetRGB.b, 2);
                  
                  if (distSq <= toleranceDistSq) {
                      queue.push(idx);
                      visited[idx] = 1;
                  }
              });

              let head = 0;
              while(head < queue.length) {
                  const idx = queue[head++];
                  data[idx * 4 + 3] = 0; // Transparent

                  const x = idx % w;
                  const y = Math.floor(idx / w);
                  const neighbors = [{ nx: x, ny: y - 1 }, { nx: x, ny: y + 1 }, { nx: x - 1, ny: y }, { nx: x + 1, ny: y }];

                  for (const n of neighbors) {
                      if (n.nx >= 0 && n.nx < w && n.ny >= 0 && n.ny < h) {
                          const nIdx = n.ny * w + n.nx;
                          if (visited[nIdx] === 0) {
                              const r = data[nIdx * 4];
                              const g = data[nIdx * 4 + 1];
                              const b = data[nIdx * 4 + 2];
                              const distSq = Math.pow(r - targetRGB.r, 2) + Math.pow(g - targetRGB.g, 2) + Math.pow(b - targetRGB.b, 2);
                              
                              if (distSq <= toleranceDistSq) {
                                  visited[nIdx] = 1;
                                  queue.push(nIdx);
                              }
                          }
                      }
                  }
              }
          } else {
              for (let i = 0; i < data.length; i += 4) {
                  const r = data[i];
                  const g = data[i+1];
                  const b = data[i+2];
                  const distSq = Math.pow(r - targetRGB.r, 2) + Math.pow(g - targetRGB.g, 2) + Math.pow(b - targetRGB.b, 2);
                  if (distSq <= toleranceDistSq) {
                      data[i+3] = 0;
                  }
              }
          }
      }

      // 4. OUTLINES (Applied BEFORE Quantization to ensure outline colors match palette)
      if (removeBackground && (outlineOuter || outlineInner)) {
          const outerRGB = hexToRgb(outlineOuterColor) || { r: 255, g: 255, b: 255 };
          const innerRGB = hexToRgb(outlineInnerColor) || { r: 0, g: 0, b: 0 };
          
          // Snapshot opacity for distance check
          const alphaMap = new Uint8Array(w * h);
          for (let i = 0; i < w * h; i++) alphaMap[i] = data[i*4 + 3] > 128 ? 1 : 0;

          const pixelsToPaintOuter = new Set<number>();
          const pixelsToPaintInner = new Set<number>();

          for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                  const idx = y * w + x;
                  const isOpaque = alphaMap[idx] === 1;

                  if (isOpaque && outlineInner) {
                      const width = outlineInnerWidth;
                      let foundTransparent = false;
                      searchLoopInner:
                      for (let dy = -width; dy <= width; dy++) {
                          for (let dx = -width; dx <= width; dx++) {
                              const ny = y + dy;
                              const nx = x + dx;
                              if (nx < 0 || nx >= w || ny < 0 || ny >= h || alphaMap[ny * w + nx] === 0) {
                                  foundTransparent = true;
                                  break searchLoopInner;
                              }
                          }
                      }
                      if (foundTransparent) pixelsToPaintInner.add(idx);
                  }

                  if (!isOpaque && outlineOuter) {
                      const width = outlineOuterWidth;
                      let foundOpaque = false;
                      searchLoopOuter:
                      for (let dy = -width; dy <= width; dy++) {
                          for (let dx = -width; dx <= width; dx++) {
                              const ny = y + dy;
                              const nx = x + dx;
                              if (nx >= 0 && nx < w && ny >= 0 && ny < h && alphaMap[ny * w + nx] === 1) {
                                  foundOpaque = true;
                                  break searchLoopOuter;
                              }
                          }
                      }
                      if (foundOpaque) pixelsToPaintOuter.add(idx);
                  }
              }
          }

          pixelsToPaintInner.forEach(idx => {
              const i = idx * 4;
              data[i] = innerRGB.r; data[i+1] = innerRGB.g; data[i+2] = innerRGB.b; data[i+3] = 255; 
          });

          pixelsToPaintOuter.forEach(idx => {
              const i = idx * 4;
              data[i] = outerRGB.r; data[i+1] = outerRGB.g; data[i+2] = outerRGB.b; data[i+3] = 255;
          });
      }

      // 5. NOISE (Texture)
      if (noise > 0) {
          for (let i = 0; i < data.length; i += 4) {
              if (data[i+3] === 0) continue; // Skip transparent
              const n = (Math.random() - 0.5) * (noise * 2);
              data[i] = Math.min(255, Math.max(0, data[i] + n));
              data[i+1] = Math.min(255, Math.max(0, data[i+1] + n));
              data[i+2] = Math.min(255, Math.max(0, data[i+2] + n));
          }
      }

      // 6. COLOR QUANTIZATION / PALETTE MAPPING (Applied Last to enforce colors)
      if (palette !== 'none' && PALETTES[palette]) {
          // Map to specific palette
          const pColors = PALETTES[palette].colors;
          for (let i = 0; i < data.length; i += 4) {
              if (data[i+3] === 0) continue;
              const [nR, nG, nB] = getNearestColor(data[i], data[i+1], data[i+2], pColors);
              data[i] = nR;
              data[i+1] = nG;
              data[i+2] = nB;
          }
      } else if (reduceColors > 0) {
          // K-Means Clustering for custom color count
          const centroids = quantizeColors(data, reduceColors);
          for (let i = 0; i < data.length; i += 4) {
              if (data[i+3] === 0) continue;
              const [nR, nG, nB] = getNearestColor(data[i], data[i+1], data[i+2], centroids);
              data[i] = nR;
              data[i+1] = nG;
              data[i+2] = nB;
          }
      }

      // 7. ANALYZE PALETTE (Extract colors for UI)
      const uniqueColors = new Set<string>();
      for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] > 0) { // Only opaque
              // Simple hex conversion
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];
              const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
              uniqueColors.add(hex);
          }
      }
      setAnalyzedPalette(Array.from(uniqueColors));
      
      ctx.putImageData(imageData, 0, 0);
      setProcessedImageURL(canvas.toDataURL('image/png'));
    };

  }, [
      resultImage, pixelSize, brightness, contrast, saturation, hue, noise, reduceColors, palette, 
      removeBackground, transparentColor, transparencyTolerance, contiguous,
      outlineOuter, outlineOuterColor, outlineOuterWidth,
      outlineInner, outlineInnerColor, outlineInnerWidth,
      setAnalyzedPalette
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

    const rgb = hexToRgb(gridColor);
    ctx.strokeStyle = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})` : `rgba(0, 240, 255, ${gridOpacity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = stepX; x < wrapperStyle.width - 0.1; x += stepX) {
        const screenX = Math.floor(x) + 0.5;
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, wrapperStyle.height);
    }

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
    <div className="h-full bg-app-bg relative flex flex-col transition-colors duration-300">
      <canvas ref={canvasRef} className="hidden" />

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {resultImage && !isLoading && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
             <button 
                onClick={() => setTransform({x: 0, y: 0, scale: 1})}
                className="p-2 bg-app-panel hover:bg-app-hover text-txt-main rounded border border-border-base transition-colors shadow-lg"
                title="Reset View"
            >
                <ZoomIn className="w-3 h-3" />
            </button>
             <button 
                onClick={() => handleDownload(false)}
                className="px-3 py-2 bg-app-panel hover:bg-accent-main hover:text-accent-text text-[10px] text-txt-main rounded border border-border-base transition-colors shadow-lg font-mono uppercase tracking-wide"
            >
              <Download className="w-3 h-3 inline mr-2" />
              Native ({imageDimensions.w}px)
            </button>
            <button 
                onClick={() => handleDownload(true)}
                className="px-3 py-2 bg-app-panel hover:bg-accent-main hover:text-accent-text text-[10px] text-txt-main rounded border border-border-base transition-colors shadow-lg font-mono uppercase tracking-wide"
            >
              <Download className="w-3 h-3 inline mr-2" />
              HD (2K)
            </button>
          </div>
        )}
      </div>

      {/* Main Display Area - Interactive */}
      <div 
        ref={mainContainerRef} 
        className={`flex-1 flex items-center justify-center overflow-hidden relative transition-colors duration-300 cursor-${isDragging ? 'grabbing' : 'grab'}`}
        style={{ backgroundColor: previewBackgroundColor === 'transparent' ? '' : previewBackgroundColor }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Checkerboard Background if transparent */}
        {previewBackgroundColor === 'transparent' && (
            <div className="absolute inset-0 checkerboard pointer-events-none" />
        )}

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
             <div className="bg-app-panel/90 border border-border-base shadow-2xl rounded-2xl p-8 flex flex-col items-center backdrop-blur-sm animate-in zoom-in-90 duration-300">
                 <div className="relative mb-4">
                    <div className="w-20 h-20 border-4 border-border-base border-t-accent-main border-r-accent-main rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">🍌</div>
                 </div>
                 <p className="text-accent-main font-pixel text-xs tracking-widest uppercase animate-pulse">Synthesizing</p>
                 <p className="text-[10px] text-txt-muted mt-2 font-mono">Running Gemini Nano Banana...</p>
             </div>
          </div>
        ) : error ? (
            <div className="max-w-md p-6 bg-red-900/20 border border-red-500/50 rounded-lg text-center z-10 shadow-[0_0_30px_rgba(255,0,0,0.2)]">
                <p className="text-red-400 font-bold mb-2 font-pixel text-xs">SYSTEM FAILURE</p>
                <p className="text-xs text-txt-muted font-mono">{error}</p>
            </div>
        ) : resultImage ? (
            // WRAPPER - This is moved by pan/zoom
            <div 
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    willChange: 'transform'
                }}
            >
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
                    className="w-full h-full object-contain block bg-transparent pointer-events-none"
                    style={{ imageRendering: 'pixelated' }}
                    />
                </div>
            </div>
        ) : (
          <div className="text-center opacity-20 z-10 select-none group pointer-events-none">
            <Grid className="w-24 h-24 mx-auto mb-4 text-txt-dim group-hover:text-accent-main transition-colors duration-500" />
            <h2 className="text-2xl font-bold text-txt-dim font-pixel group-hover:text-accent-main transition-colors">NO SIGNAL</h2>
            <p className="text-txt-muted mt-4 font-mono text-xs uppercase tracking-widest">Waiting for input stream...</p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {processedImageURL && !isLoading && (
         <div className="bg-app-panel border-t border-border-base px-4 py-3 flex justify-between items-center text-[10px] text-txt-dim font-mono select-none z-30 relative transition-colors duration-300">
            <div className="flex items-center gap-4">
                <span className="text-accent-main">RES: {imageDimensions.w}×{imageDimensions.h}</span>
                <span className="text-txt-muted">SCALE: 1/{pixelSize}</span>
                <span className="text-txt-dim">ZOOM: {Math.round(transform.scale * 100)}%</span>
                {palette !== 'none' && <span className="text-accent-main">PALETTE: {PALETTES[palette].label.toUpperCase()}</span>}
            </div>
            <div className="flex items-center gap-2">
                <Move className="w-3 h-3" />
                <span>PAN & ZOOM ENABLED</span>
            </div>
         </div>
      )}
    </div>
  );
};

export default PreviewArea;
