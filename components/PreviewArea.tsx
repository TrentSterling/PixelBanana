
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Download, Grid, Move, ZoomIn, Eye, EyeOff, Play, Pause, MousePointer2, Pipette, Wand2 } from 'lucide-react';
import { GenerationState, PixelConfig, ActiveTool } from '../types';
import { PALETTES } from '../constants';

interface PreviewAreaProps {
  state: GenerationState;
  config: PixelConfig;
  onDimensionsChange?: (dims: {w: number, h: number}) => void;
  previewBackgroundColor: string;
  setAnalyzedPalette: (colors: string[]) => void;
  activeTool: ActiveTool;
  onColorPick: (color: string) => void;
  activeControlTab: 'generate' | 'process' | 'animate' | 'history';
  setActiveControlTab: (tab: 'generate' | 'process' | 'animate' | 'history') => void;
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

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// --- K-Means Clustering ---
const quantizeColors = (imageData: Uint8ClampedArray, k: number): number[][] => {
    const pixels: number[][] = [];
    for (let i = 0; i < imageData.length; i += 4) {
        if (imageData[i + 3] > 128) {
            pixels.push([imageData[i], imageData[i + 1], imageData[i + 2]]);
        }
    }

    if (pixels.length === 0) return [];
    if (pixels.length <= k) return pixels; 

    let centroids = Array.from({ length: k }, () => pixels[Math.floor(Math.random() * pixels.length)]);
    
    for (let iter = 0; iter < 5; iter++) {
        const clusters: number[][][] = Array.from({ length: k }, () => []);
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
        
        centroids = clusters.map(cluster => {
            if (cluster.length === 0) return [Math.random()*255, Math.random()*255, Math.random()*255];
            const sum = cluster.reduce((acc, val) => [acc[0]+val[0], acc[1]+val[1], acc[2]+val[2]], [0,0,0]);
            return [Math.round(sum[0]/cluster.length), Math.round(sum[1]/cluster.length), Math.round(sum[2]/cluster.length)];
        });
    }
    return centroids;
};

const PreviewArea: React.FC<PreviewAreaProps> = ({ state, config, onDimensionsChange, previewBackgroundColor, setAnalyzedPalette, activeTool, onColorPick, activeControlTab, setActiveControlTab }) => {
  const { isLoading, resultImage, error } = state;
  const { 
      pixelSize, brightness, contrast, saturation, hue, noise, reduceColors, palette, 
      showGrid, gridSize, gridOpacity, gridColor, showSheetGrid,
      removeBackground, transparentColor, transparencyTolerance, contiguous,
      outlineOuter, outlineOuterColor, outlineOuterWidth,
      outlineInner, outlineInnerColor, outlineInnerWidth,
      autoCenter
  } = config.postProcess;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null); // Global Overlay Canvas
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const animationCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);

  const [processedImageURL, setProcessedImageURL] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{w: number, h: number}>({ w: 0, h: 0 });
  const [wrapperStyle, setWrapperStyle] = useState<{width: number, height: number}>({ width: 0, height: 0 });
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [customMask, setCustomMask] = useState<Uint8Array | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
      setCustomMask(null);
  }, [resultImage]);

  useEffect(() => {
    if (onDimensionsChange && resultImage && imageDimensions.w === 0) {
         const img = new Image();
         img.src = resultImage;
         img.onload = () => onDimensionsChange({w: img.width, h: img.height});
    }
  }, [resultImage, onDimensionsChange, imageDimensions.w]);

  useEffect(() => {
      setTransform({ x: 0, y: 0, scale: 1 });
  }, [resultImage]);

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const scaleAmount = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(0.1, transform.scale + scaleAmount * transform.scale), 50);
      setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleWandTool = (x: number, y: number, shiftKey: boolean, ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const data = ctx.getImageData(0, 0, w, h).data;
      const clickedIdx = y * w + x;
      const targetR = data[clickedIdx * 4];
      const targetG = data[clickedIdx * 4 + 1];
      const targetB = data[clickedIdx * 4 + 2];
      const targetA = data[clickedIdx * 4 + 3];

      if (targetA === 0) return; 

      const toleranceDistSq = Math.pow((transparencyTolerance / 100) * 442, 2);
      const newMask = shiftKey && customMask ? new Uint8Array(customMask) : new Uint8Array(w * h);
      
      if (contiguous) {
          const queue = [clickedIdx];
          const visited = new Uint8Array(w * h);
          visited[clickedIdx] = 1;
          newMask[clickedIdx] = 1;
          let head = 0;
          while(head < queue.length) {
              const idx = queue[head++];
              const cx = idx % w;
              const cy = Math.floor(idx / w);
              const neighbors = [{ nx: cx, ny: cy - 1 }, { nx: cx, ny: cy + 1 }, { nx: cx - 1, ny: cy }, { nx: cx + 1, ny: cy }];
              for (const n of neighbors) {
                  if (n.nx >= 0 && n.nx < w && n.ny >= 0 && n.ny < h) {
                      const nIdx = n.ny * w + n.nx;
                      if (visited[nIdx] === 0) {
                          const r = data[nIdx * 4];
                          const g = data[nIdx * 4 + 1];
                          const b = data[nIdx * 4 + 2];
                          const distSq = Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2);
                          if (distSq <= toleranceDistSq) {
                              visited[nIdx] = 1;
                              newMask[nIdx] = 1;
                              queue.push(nIdx);
                          }
                      }
                  }
              }
          }
      } else {
          for (let i = 0; i < w * h; i++) {
              const r = data[i * 4];
              const g = data[i * 4 + 1];
              const b = data[i * 4 + 2];
              const distSq = Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2);
              if (distSq <= toleranceDistSq) {
                  newMask[i] = 1;
              }
          }
      }
      setCustomMask(newMask);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!resultImage) return;
      
      // Check if clicking on the image area
      if (activeTool !== 'move' && canvasRef.current && wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          // Check if click is inside the image wrapper
          if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
              const scaleX = canvasRef.current.width / rect.width;
              const scaleY = canvasRef.current.height / rect.height;
              const x = Math.floor((e.clientX - rect.left) * scaleX);
              const y = Math.floor((e.clientY - rect.top) * scaleY);
              
              const ctx = canvasRef.current.getContext('2d');
              if (!ctx) return;

              if (activeTool === 'picker') {
                  const p = ctx.getImageData(x, y, 1, 1).data;
                  const hex = rgbToHex(p[0], p[1], p[2]);
                  onColorPick(hex);
                  return; // Don't drag
              } else if (activeTool === 'wand') {
                  handleWandTool(x, y, e.shiftKey, ctx, canvasRef.current.width, canvasRef.current.height);
                  return; // Don't drag
              }
          }
      }

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

  useEffect(() => {
      if (!processedImageURL || !isPlaying || config.sheetConfig.columns <= 1) return;
      const interval = setInterval(() => {
          setCurrentFrame(prev => (prev + 1) % (config.sheetConfig.columns * config.sheetConfig.rows));
      }, 1000 / config.animationSpeed);
      return () => clearInterval(interval);
  }, [processedImageURL, isPlaying, config.sheetConfig, config.animationSpeed]);

  useEffect(() => {
      const canvas = animationCanvasRef.current;
      if (!canvas || !processedImageURL) return;
      const img = new Image();
      img.src = processedImageURL;
      img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          const cols = config.sheetConfig.columns;
          const rows = config.sheetConfig.rows;
          const frameW = Math.floor(img.width / cols);
          const frameH = Math.floor(img.height / rows);
          canvas.width = frameW;
          canvas.height = frameH;
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0,0, frameW, frameH);
          
          const col = currentFrame % cols;
          const row = Math.floor(currentFrame / cols);
          
          if (autoCenter) {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = frameW;
              tempCanvas.height = frameH;
              const tempCtx = tempCanvas.getContext('2d');
              if (!tempCtx) return;
              tempCtx.drawImage(img, col * frameW, row * frameH, frameW, frameH, 0, 0, frameW, frameH);
              const frameData = tempCtx.getImageData(0, 0, frameW, frameH);
              const data = frameData.data;
              let minX = frameW, maxX = 0, minY = frameH, maxY = 0;
              let foundPixel = false;
              for (let y = 0; y < frameH; y++) {
                  for (let x = 0; x < frameW; x++) {
                      const idx = (y * frameW + x) * 4;
                      if (data[idx + 3] > 0) { 
                          if (x < minX) minX = x;
                          if (x > maxX) maxX = x;
                          if (y < minY) minY = y;
                          if (y > maxY) maxY = y;
                          foundPixel = true;
                      }
                  }
              }
              if (foundPixel) {
                  const contentW = maxX - minX + 1;
                  const contentH = maxY - minY + 1;
                  const centerX = minX + contentW / 2;
                  const centerY = minY + contentH / 2;
                  const offsetX = (frameW / 2) - centerX;
                  const offsetY = (frameH / 2) - centerY;
                  ctx.drawImage(tempCanvas, offsetX, offsetY);
              } else {
                  ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, 0, 0, frameW, frameH);
              }
          } else {
              ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, 0, 0, frameW, frameH);
          }
      };
  }, [currentFrame, processedImageURL, config.sheetConfig, autoCenter]);

  // --- MAIN PIPELINE ---
  useEffect(() => {
    if (!resultImage || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = resultImage;
    
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // 1. SCALE
      const w = Math.max(1, Math.floor(img.width / pixelSize));
      const h = Math.max(1, Math.floor(img.height / pixelSize));
      canvas.width = w;
      canvas.height = h;
      setImageDimensions({ w, h });
      ctx.imageSmoothingEnabled = false;

      // 2. FILTERS
      let filterString = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%) hue-rotate(${hue}deg)`;
      ctx.filter = filterString;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none'; 

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const targetRGB = hexToRgb(transparentColor);
      const toleranceDistSq = Math.pow((transparencyTolerance / 100) * 442, 2);
      
      // 3. CHROMA KEY
      if (removeBackground && targetRGB) {
          if (contiguous) {
              const visited = new Uint8Array(w * h);
              const queue: number[] = [];
              // Start from corners
              const startPoints = [0, w - 1, (h - 1) * w, (h - 1) * w + w - 1];
              startPoints.forEach(idx => {
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
                  data[idx * 4 + 3] = 0;
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
                  if (distSq <= toleranceDistSq) data[i+3] = 0;
              }
          }
      }

      if (customMask && customMask.length === w * h) {
          for (let i = 0; i < w * h; i++) {
              if (customMask[i] === 1) data[i * 4 + 3] = 0;
          }
      }

      // 4. OUTLINES (MOVED BEFORE PALETTE/QUANTIZATION)
      if (removeBackground && (outlineOuter || outlineInner)) {
          const outerRGB = hexToRgb(outlineOuterColor) || { r: 255, g: 255, b: 255 };
          const innerRGB = hexToRgb(outlineInnerColor) || { r: 0, g: 0, b: 0 };
          const alphaMap = new Uint8Array(w * h);
          for (let i = 0; i < w * h; i++) alphaMap[i] = data[i*4 + 3] > 128 ? 1 : 0;
          const outerBuffer = new Set<number>();
          const innerBuffer = new Set<number>();
          for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                  const idx = y * w + x;
                  const isOpaque = alphaMap[idx] === 1;
                  if (isOpaque && outlineInner) {
                      const width = outlineInnerWidth;
                      let foundTransparent = false;
                      for (let dy = -width; dy <= width; dy++) {
                          for (let dx = -width; dx <= width; dx++) {
                              const ny = y + dy;
                              const nx = x + dx;
                              if (nx < 0 || nx >= w || ny < 0 || ny >= h || alphaMap[ny * w + nx] === 0) {
                                  foundTransparent = true;
                                  break;
                              }
                          }
                      }
                      if (foundTransparent) innerBuffer.add(idx);
                  }
                  if (!isOpaque && outlineOuter) {
                      const width = outlineOuterWidth;
                      let foundOpaque = false;
                      for (let dy = -width; dy <= width; dy++) {
                          for (let dx = -width; dx <= width; dx++) {
                              const ny = y + dy;
                              const nx = x + dx;
                              if (nx >= 0 && nx < w && ny >= 0 && ny < h && alphaMap[ny * w + nx] === 1) {
                                  foundOpaque = true;
                                  break;
                              }
                          }
                      }
                      if (foundOpaque) outerBuffer.add(idx);
                  }
              }
          }
          // Apply Inner Stroke (Blend with existing pixel)
          innerBuffer.forEach(idx => {
              const i = idx * 4;
              // Simple replace for now to ensure palette quantization picks it up cleanly
              data[i] = innerRGB.r;
              data[i+1] = innerRGB.g;
              data[i+2] = innerRGB.b;
              data[i+3] = 255; 
          });
          // Apply Outer Stroke
          outerBuffer.forEach(idx => {
              const i = idx * 4;
              data[i] = outerRGB.r;
              data[i+1] = outerRGB.g;
              data[i+2] = outerRGB.b;
              data[i+3] = 255;
          });
      }

      // 5. NOISE (After Outline, Before Palette)
      if (noise > 0) {
          for (let i = 0; i < data.length; i += 4) {
              if (data[i+3] === 0) continue;
              const n = (Math.random() - 0.5) * (noise * 2);
              data[i] = Math.min(255, Math.max(0, data[i] + n));
              data[i+1] = Math.min(255, Math.max(0, data[i+1] + n));
              data[i+2] = Math.min(255, Math.max(0, data[i+2] + n));
          }
      }

      // 6. PALETTE / QUANTIZATION (Last Step)
      if (palette !== 'none' && PALETTES[palette]) {
          const pColors = PALETTES[palette].colors;
          for (let i = 0; i < data.length; i += 4) {
              if (data[i+3] === 0) continue;
              const [nR, nG, nB] = getNearestColor(data[i], data[i+1], data[i+2], pColors);
              data[i] = nR;
              data[i+1] = nG;
              data[i+2] = nB;
          }
      } else if (reduceColors > 0) {
          const centroids = quantizeColors(data, reduceColors);
          for (let i = 0; i < data.length; i += 4) {
              if (data[i+3] === 0) continue;
              const [nR, nG, nB] = getNearestColor(data[i], data[i+1], data[i+2], centroids);
              data[i] = nR;
              data[i+1] = nG;
              data[i+2] = nB;
          }
      }

      // 7. ANALYZE
      const uniqueColors = new Set<string>();
      for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] > 128) {
              const hex = rgbToHex(data[i], data[i+1], data[i+2]);
              uniqueColors.add(hex);
          }
      }
      setAnalyzedPalette(Array.from(uniqueColors));
      
      ctx.putImageData(imageData, 0, 0);
      setProcessedImageURL(canvas.toDataURL('image/png'));
    };
  }, [
      resultImage, pixelSize, brightness, contrast, saturation, hue, noise, reduceColors, palette, 
      removeBackground, transparentColor, transparencyTolerance, contiguous, customMask,
      outlineOuter, outlineOuterColor, outlineOuterWidth, 
      outlineInner, outlineInnerColor, outlineInnerWidth, 
      setAnalyzedPalette
  ]);


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
  }, [imageDimensions, resultImage, activeControlTab]);


  // --- CRISP GRID OVERLAY SYSTEM ---
  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const container = mainContainerRef.current;
    
    if (!gridCanvas || !container || (!showGrid && !showSheetGrid) || imageDimensions.w === 0 || wrapperStyle.width === 0) {
         if (gridCanvas) {
             const ctx = gridCanvas.getContext('2d');
             ctx?.clearRect(0,0, gridCanvas.width, gridCanvas.height);
         }
         return;
    }

    gridCanvas.width = container.clientWidth;
    gridCanvas.height = container.clientHeight;
    const ctx = gridCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    ctx.imageSmoothingEnabled = false;
    
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    
    const screenW = wrapperStyle.width * transform.scale;
    const screenH = wrapperStyle.height * transform.scale;
    
    const startX = cx - (screenW / 2) + transform.x;
    const startY = cy - (screenH / 2) + transform.y;
    
    const pixelScreenSize = screenW / imageDimensions.w;

    ctx.translate(0.5, 0.5); // Sharp lines

    // Standard Pixel Grid
    if (showGrid) {
        const step = gridSize * pixelScreenSize;
        // Don't draw if too dense
        if (step > 4) { 
            const rgb = hexToRgb(gridColor);
            ctx.strokeStyle = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})` : `rgba(0, 240, 255, ${gridOpacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();

            // Vertical Lines
            for (let i = 0; i <= imageDimensions.w; i += gridSize) {
                const x = Math.floor(startX + i * pixelScreenSize);
                if (x >= 0 && x <= gridCanvas.width) {
                    ctx.moveTo(x, Math.max(0, startY));
                    ctx.lineTo(x, Math.min(gridCanvas.height, startY + screenH));
                }
            }
            // Horizontal Lines
            for (let i = 0; i <= imageDimensions.h; i += gridSize) {
                const y = Math.floor(startY + i * pixelScreenSize);
                if (y >= 0 && y <= gridCanvas.height) {
                    ctx.moveTo(Math.max(0, startX), y);
                    ctx.lineTo(Math.min(gridCanvas.width, startX + screenW), y);
                }
            }
            ctx.stroke();
        }
    }

    // Sheet Grid & AABB
    if (showSheetGrid && config.sheetConfig.columns > 1) {
        const colW = screenW / config.sheetConfig.columns;
        const rowH = screenH / config.sheetConfig.rows;
        
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        
        for (let c = 0; c <= config.sheetConfig.columns; c++) {
             const x = Math.floor(startX + c * colW);
             ctx.moveTo(x, startY);
             ctx.lineTo(x, startY + screenH);
        }
        for (let r = 0; r <= config.sheetConfig.rows; r++) {
             const y = Math.floor(startY + r * rowH);
             ctx.moveTo(startX, y);
             ctx.lineTo(startX + screenW, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Debug AABB
        if (autoCenter && processedImageURL) {
             const img = new Image();
             img.src = processedImageURL;
             // Offscreen canvas to read pixels
             const tempCanvas = document.createElement('canvas');
             tempCanvas.width = imageDimensions.w;
             tempCanvas.height = imageDimensions.h;
             const tempCtx = tempCanvas.getContext('2d');
             if (tempCtx) {
                 tempCtx.drawImage(img, 0, 0, imageDimensions.w, imageDimensions.h);
                 const data = tempCtx.getImageData(0, 0, imageDimensions.w, imageDimensions.h).data;
                 const frameW = Math.floor(imageDimensions.w / config.sheetConfig.columns);
                 const frameH = Math.floor(imageDimensions.h / config.sheetConfig.rows);
                 
                 ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
                 ctx.lineWidth = 1;

                 for (let r = 0; r < config.sheetConfig.rows; r++) {
                     for (let c = 0; c < config.sheetConfig.columns; c++) {
                         let minX = frameW, maxX = 0, minY = frameH, maxY = 0;
                         let found = false;
                         for (let y = 0; y < frameH; y++) {
                             for (let x = 0; x < frameW; x++) {
                                 const globalX = c * frameW + x;
                                 const globalY = r * frameH + y;
                                 if (globalX >= imageDimensions.w || globalY >= imageDimensions.h) continue;
                                 const idx = (globalY * imageDimensions.w + globalX) * 4;
                                 if (data[idx+3] > 0) {
                                     if (x < minX) minX = x;
                                     if (x > maxX) maxX = x;
                                     if (y < minY) minY = y;
                                     if (y > maxY) maxY = y;
                                     found = true;
                                 }
                             }
                         }
                         if (found) {
                             // Map Image Coords -> Screen Coords
                             const rectX = startX + (c * frameW + minX) * pixelScreenSize;
                             const rectY = startY + (r * frameH + minY) * pixelScreenSize;
                             const rectW = (maxX - minX + 1) * pixelScreenSize;
                             const rectH = (maxY - minY + 1) * pixelScreenSize;
                             ctx.strokeRect(rectX, rectY, rectW, rectH);
                         }
                     }
                 }
             }
        }
    }
    
    // Border
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, screenW, screenH);

  }, [showGrid, showSheetGrid, gridSize, gridOpacity, gridColor, imageDimensions, wrapperStyle, config.sheetConfig, autoCenter, processedImageURL, transform]);

  const handleDownload = (upscale: boolean) => {
    if (!processedImageURL) return;

    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `pixel-banana-${timestamp}${upscale ? '-HD' : ''}.png`;

    if (upscale) {
      const img = new Image();
      img.src = processedImageURL;
      img.onload = () => {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        if (!ctx) return;
        
        const scale = Math.max(1, Math.floor(2048 / Math.max(img.width, img.height)));
        c.width = img.width * scale;
        c.height = img.height * scale;
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        
        link.href = c.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      link.href = processedImageURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (activeControlTab === 'animate') {
      return (
        <div className="h-full bg-app-bg flex flex-col items-center justify-center p-8 relative">
             <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                <button onClick={() => setActiveControlTab('process')} className="px-4 py-2 bg-app-panel border border-border-base text-txt-main rounded hover:bg-app-hover font-mono text-xs uppercase tracking-wider">
                    Exit Animation View
                </button>
             </div>
             
             <div className="relative flex flex-col items-center">
                 <canvas 
                    ref={animationCanvasRef} 
                    className="max-w-full max-h-[60vh] object-contain bg-app-bg border-4 border-accent-main rounded-lg shadow-[0_0_100px_rgba(var(--accent-main),0.2)] image-pixelated" 
                    style={{ width: 512, height: 512, imageRendering: 'pixelated' }}
                 />
                 <div className="mt-8 flex items-center gap-6 bg-app-panel px-8 py-4 rounded-full border border-border-base shadow-xl">
                      <button onClick={() => setIsPlaying(!isPlaying)} className="p-4 bg-accent-main text-accent-text rounded-full hover:scale-110 transition-transform">
                          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                      </button>
                      <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold font-pixel text-txt-main">{currentFrame + 1}</span>
                          <span className="text-[10px] font-mono text-txt-dim uppercase">Current Frame</span>
                      </div>
                 </div>
             </div>
        </div>
      )
  }

  return (
    <div className={`h-full bg-app-bg relative flex flex-col transition-colors duration-300 ${activeTool !== 'move' ? 'cursor-crosshair' : ''}`}>
      <canvas ref={canvasRef} className="hidden" />

      {config.sheetConfig.columns > 1 && resultImage && (
          <div 
            onClick={() => setActiveControlTab('animate')}
            className="absolute bottom-16 right-4 z-40 bg-app-panel border border-border-base rounded-lg shadow-2xl p-3 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 w-32 cursor-pointer hover:border-accent-main transition-colors group"
          >
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-main text-accent-text rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <ZoomIn className="w-3 h-3" />
              </div>
              <canvas ref={animationCanvasRef} className="w-24 h-24 object-contain bg-app-bg border border-border-base mb-2 rounded image-pixelated" style={{ imageRendering: 'pixelated' }}/>
              <div className="flex items-center gap-2 w-full justify-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                    className="p-1 hover:bg-app-hover rounded text-txt-main"
                  >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="text-[10px] font-mono text-txt-dim">FRAME {currentFrame + 1}</span>
              </div>
          </div>
      )}

      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {resultImage && !isLoading && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
             <button 
                onMouseDown={() => setIsCompareMode(true)}
                onMouseUp={() => setIsCompareMode(false)}
                onMouseLeave={() => setIsCompareMode(false)}
                className="p-2 bg-app-panel hover:bg-app-hover text-txt-main rounded border border-border-base transition-colors shadow-lg active:bg-accent-main active:text-accent-text"
                title="Hold to Compare Original"
            >
                {isCompareMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
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

      <div 
        ref={mainContainerRef} 
        className={`flex-1 flex items-center justify-center overflow-hidden relative transition-colors duration-300`}
        style={{ cursor: activeTool !== 'move' ? (activeTool === 'wand' ? 'alias' : 'crosshair') : isDragging ? 'grabbing' : 'grab', backgroundColor: previewBackgroundColor === 'transparent' ? '' : previewBackgroundColor }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {previewBackgroundColor === 'transparent' && (
            <div className="absolute inset-0 checkerboard pointer-events-none" />
        )}

         {/* GLOBAL OVERLAY GRID */}
         <canvas ref={gridCanvasRef} className="absolute inset-0 z-20 pointer-events-none" style={{ imageRendering: 'pixelated' }} />

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
                    style={{ width: wrapperStyle.width, height: wrapperStyle.height }}
                >
                    <img
                        src={isCompareMode ? resultImage : (processedImageURL || resultImage)}
                        alt="Generated Pixel Art"
                        className="w-full h-full object-contain block bg-transparent pointer-events-auto image-pixelated"
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

      {processedImageURL && !isLoading && (
         <div className="bg-app-panel border-t border-border-base px-4 py-3 flex justify-between items-center text-[10px] text-txt-dim font-mono select-none z-30 relative transition-colors duration-300">
            <div className="flex items-center gap-4">
                <span className="text-accent-main">RES: {imageDimensions.w}×{imageDimensions.h}</span>
                <span className="text-txt-muted">SCALE: 1/{pixelSize}</span>
                <span className="text-txt-dim">ZOOM: {Math.round(transform.scale * 100)}%</span>
                {palette !== 'none' && <span className="text-accent-main">PALETTE: {PALETTES[palette].label.toUpperCase()}</span>}
            </div>
            <div className="flex items-center gap-2">
                {activeTool === 'picker' ? (
                    <span className="text-accent-main animate-pulse flex items-center gap-2"><Pipette className="w-3 h-3"/> PICK COLOR</span>
                ) : activeTool === 'wand' ? (
                    <span className="text-accent-main animate-pulse flex items-center gap-2"><Wand2 className="w-3 h-3"/> MAGIC WAND</span>
                ) : (
                    <>
                        <Move className="w-3 h-3" />
                        <span>PAN & ZOOM ENABLED</span>
                    </>
                )}
            </div>
         </div>
      )}
    </div>
  );
};

export default PreviewArea;
