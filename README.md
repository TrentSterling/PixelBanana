
# 🍌 Pixel Banana

**The Ultimate AI Pixel Art Generator & Sprite Sheet Editor**

View the app in AI Studio: https://ai.studio/apps/drive/1_0pz-J5D75sqi7hDY67irTmU4TQzNFFg

Pixel Banana is a powerful web application that leverages Google's **Gemini 2.5 Flash** model to generate high-quality pixel art, seamless tiles, and sprite sheets. It features a robust post-processing engine for palette quantization, chroma keying, and animation previewing.

![Pixel Banana](https://img.shields.io/badge/Pixel-Banana-yellow?style=for-the-badge)
![Gemini Nano](https://img.shields.io/badge/Powered_by-Gemini_Nano-blue?style=for-the-badge)

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **AI Generation** | Create specific pixel art styles (SNES, GameBoy, Cyberpunk, etc.) from text prompts. |
| **Sprite Sheets** | Generate perfectly aligned sprite grids (e.g., 4x1, 6x2) with automatic padding. |
| **Smart Chroma Key** | Remove backgrounds using "Contiguous Flood Fill" (Magic Wand style) to preserve internal colors. |
| **Live Palette** | Analyze and display the exact color palette of your generated art in real-time. |
| **Pixel Perfect** | Strict nearest-neighbor scaling and rendering for crisp, sharp edges at any zoom level. |
| **Animation Preview** | Slice and play back sprite sheets instantly with the built-in player. Supports variable FPS. |
| **Auto-Centering** | Automatically detect sprite AABBs (Bounding Boxes) to center jittery animation frames. |
| **Outlines** | Add pixel-perfect inner and outer strokes. Solid 1-bit opacity ensures retro authenticity. |
| **Editing Tools** | Magic Wand, Eyedropper, Manual Masking, and Compare Mode for fine-tuning. |
| **Themes** | Multiple high-contrast themes (Midnight, Cosmic, Terminal, Paper, Retro, Synthwave). |

## 🎮 Usage

1.  **Generate**: Enter a prompt (e.g., "Dancing Monkey"), select a Style (e.g., Sega Genesis), and hit Generate.
2.  **Edit**:
    *   **Chroma Key**: Remove the background color. Toggle "Contiguous" for smart removal. Use the **Eyedropper** to pick the exact color.
    *   **Palette**: Limit colors or swap palettes (GameBoy, Pico-8).
    *   **Outlines**: Add inner/outer strokes to pop your character. Outlines are drawn *before* palette reduction to ensure they match the retro style.
3.  **Animate**:
    *   Switch to the **Animate** tab (if using a Sprite Sheet).
    *   Adjust **Playback Speed** and verify the loop.
    *   Use **Auto-Center Frames** to fix alignment issues automatically.
    *   Toggle **Cut Lines** to visualize the grid slicing.
4.  **Export**: Download the Native (tiny) or HD (upscaled) version.

## 🚀 Feature Roadmap / Brainstorming

Ideas and requests from Tront & Community:

### Color & Palettes
- [x] **Massive Palette Library**: Added DB16, DB32, Endesga, Amiga, MSX, etc.
- [ ] **Random Palette Generator**: Algorithmic generation based on color theory (Pastel, Triadic, Complementary).
- [ ] **Advanced Palette Sorting**: Sort palettes by mood, era, or hardware limits.

### Image Processing
- [x] **1-Bit Outlines**: Removed opacity sliders for outlines to enforce crisp pixel art styling.
- [ ] **Scaling Algorithms**: Options for Bilinear, Bicubic, and CRT scanline filters for preview.
- [ ] **Smart Sampling**: "Jiggling" pixel offsets and utilizing alpha maps for better downscaling results.
- [ ] **Dithering**: Add pattern dithering support when reducing color counts.

### Advanced Tools
- [x] **Magic Wand**: Implemented with contiguous/global toggle.
- [ ] **Paint Mask**: Manual brush to paint transparency masks.
- [ ] **Explorer/Navigator**: A mini-map view for large images.

### UI/UX
- [x] **Manual Inputs**: Added number inputs for all sliders.
- [x] **Animation Tab**: Dedicated tab for sprite sheet playback.
- [ ] **Keyboard Shortcuts**: Hotkeys for tools (W for Wand, I for Eyedropper, Space for Pan).
- [ ] **Custom Layouts**: Draggable/resizable UI panels.

---
*Made with 🍌 by Tront & d74g0n*
