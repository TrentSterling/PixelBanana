
import { GoogleGenAI } from "@google/genai";
import { PixelStyle, OutputType, SpriteSheetConfig } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_NAME = 'gemini-2.5-flash-image';

export const generatePixelArt = async (
  prompt: string,
  style: PixelStyle,
  outputType: OutputType,
  aspectRatio: string,
  sheetConfig: SpriteSheetConfig,
  referenceImage: string | null,
  generatorBackground: string
): Promise<string> => {
  const ai = getClient();

  // Construct a prompt optimized for pixel art
  let fullPrompt = `Generate a high-quality pixel art image. 
  Subject: ${prompt}.
  Style: ${style}.
  Type: ${outputType}.
  
  CRITICAL DIMENSION INSTRUCTIONS:
  - The subject MUST FILL the entire canvas.
  - MINIMAL padding. CROP TIGHTLY to the subject.
  - The subject should occupy at least 90% of the image dimensions.
  - Do not leave large empty areas around the subject.
  
  Important Guidelines:
  - Ensure crisp edges and distinct pixels appropriate for the requested bit-depth.
  - Do not add anti-aliasing or blur.
  `;

  // Background Logic
  if (generatorBackground && generatorBackground !== 'none') {
    fullPrompt += `- Use a solid, contrasting background color exactly matching ${generatorBackground} for easy removal.\n`;
  } else {
    fullPrompt += `- Use a natural or full-canvas background suitable for the subject.\n`;
  }

  if (outputType === OutputType.SHEET) {
    fullPrompt += `
    - Create a Sprite Sheet with exactly ${sheetConfig.columns} columns and ${sheetConfig.rows} rows.
    - Maintain consistent spacing of approximately ${sheetConfig.padding}px between sprites.
    - Ensure all sprites in the grid are aligned.
    `;
  } else if (outputType === OutputType.TILE) {
    fullPrompt += `
    - Create a seamless repeating pattern or texture.
    - THE TEXTURE MUST FILL THE ENTIRE IMAGE CANVAS 100%.
    - NO MARGINS. NO BACKGROUND COLOR.
    - Ensure the edges match perfectly when tiled.
    - Flat, top-down perspective suitable for map tiles.
    `;
  } else if (outputType === OutputType.ICON) {
    fullPrompt += `
    - Create a single, centered item icon.
    - MAXIMIZE the usage of the canvas. The item should touch the edges.
    - High readability at small sizes.
    `;
  } else if (outputType === OutputType.SINGLE) {
    fullPrompt += `
    - Single character or object.
    - ZOOM IN. The subject should be as large as possible within the frame.
    `;
  }

  if (referenceImage) {
    fullPrompt = `Edit the provided image based on this instruction: ${prompt}. 
    - Maintain the ${style} pixel art aesthetic.
    - If the user asks to change the style (e.g. "make it SNES style"), strictly follow that style.
    - If the user asks to add/remove elements, integrate them seamlessly into the pixel grid.
    `;
  }

  const parts: any[] = [];
  
  if (referenceImage) {
    // Extract base64 data from data URL
    const base64Data = referenceImage.split(',')[1];
    const mimeType = referenceImage.substring(referenceImage.indexOf(':') + 1, referenceImage.indexOf(';'));
    
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      }
    });
  }

  parts.push({ text: fullPrompt });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio, 
        }
      }
    });

    // Parse response for image
    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
    }

    throw new Error("No image data received from the model.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate pixel art.");
  }
};
