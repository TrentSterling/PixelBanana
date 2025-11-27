
export interface GenerationState {
  isLoading: boolean;
  resultImage: string | null; // Base64 data URL
  error: string | null;
}

export type Theme = 'cosmic' | 'midnight' | 'paper' | 'terminal' | 'synthwave' | 'retro';

export enum PixelStyle {
  SNES = 'SNES (16-bit)',
  SEGA = 'Sega Genesis',
  GAMEBOY = 'Game Boy (Green)',
  GBC = 'Game Boy Color',
  NES = 'NES (8-bit)',
  PS1 = 'PS1 (Low Poly)',
  ATARI = 'Atari 2600',
  MODERN = 'Modern Pixel Art',
  ISOMETRIC = 'Isometric RPG',
  CYBERPUNK = 'Cyberpunk / Neon',
  FANTASY = 'Fantasy Console (Pico-8)',
  POINTNCLICK = 'Point & Click Adventure',
}

export enum OutputType {
  SINGLE = 'Single Sprite',
  SHEET = 'Sprite Sheet',
  SCENE = 'Full Scene / Background',
  ICON = 'Icon / Item',
  PORTRAIT = 'Character Portrait',
  TILE = 'Seamless Tile',
}

export interface SpriteSheetConfig {
  columns: number;
  rows: number;
  padding: number; // Pixels
}

export interface PostProcessConfig {
  pixelSize: number; // Scaling factor divisor
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  hue: number; // -180 to 180
  noise: number; // 0 to 100
  palette: string; // 'none', 'pico8', 'gameboy', etc.
  reduceColors: number; // 0 = off, > 0 = max colors (2-256)
  showGrid: boolean;
  gridSize: number; // Size of grid cells in "art pixels" (e.g. 32 for 32x32 tiles)
  gridOpacity: number; // 0.1 to 1.0
  gridColor: string;
  
  // Chroma Key
  removeBackground: boolean;
  contiguous: boolean; // Smart flood fill vs global replace
  transparentColor: string; // Hex color to remove
  transparencyTolerance: number; // 0-100
  
  // Outer Outline
  outlineOuter: boolean;
  outlineOuterColor: string;
  outlineOuterWidth: number; // 1-4 pixels
  outlineMode: 'outer' | 'inner' | 'both'; // deprecated but kept for types compatibility

  // Inner Outline
  outlineInner: boolean;
  outlineInnerColor: string;
  outlineInnerWidth: number; // 1-4 pixels
}

export interface PixelConfig {
  prompt: string;
  style: PixelStyle;
  outputType: OutputType;
  aspectRatio: string; // "1:1", "16:9", "9:16", "4:3", "3:4"
  referenceImage: string | null; // Base64 data URL for editing
  sheetConfig: SpriteSheetConfig;
  postProcess: PostProcessConfig;
  generatorBackground: string; // The solid background color requested from AI, or 'none'
}
