import React from 'react';
import { Image as ImageIcon, Layers, Map } from 'lucide-react';

const InfoSection: React.FC<{ onDemoClick: (prompt: string) => void }> = ({ onDemoClick }) => {
  return (
    <section className="bg-slate-950 border-t border-slate-800 py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Hero/Intro */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-pixel text-white">Pixel Art <span className="text-banana-400">Village</span></h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Easily transform text and images into stunning pixel art sprites, sheets, and scenes using the power of the Nano Banana engine.
          </p>
        </div>

        {/* Demos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg hover:border-banana-500/50 transition-colors group">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-banana-500 group-hover:text-black transition-colors">
                    <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Art & Sprites</h3>
                <p className="text-sm text-slate-400 mb-4">Turn ideas into beautiful SNES or SEGA style sprites.</p>
                <button 
                    onClick={() => onDemoClick("A golden sunrise over a pixelated ocean, SNES style")}
                    className="text-xs text-banana-400 hover:underline"
                >
                    Try Demo: Sunrise
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg hover:border-banana-500/50 transition-colors group">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-banana-500 group-hover:text-black transition-colors">
                    <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Textures & Tiles</h3>
                <p className="text-sm text-slate-400 mb-4">Generate seamless textures for game maps.</p>
                <button 
                    onClick={() => onDemoClick("Seamless cobblestone texture, top down rpg style")}
                    className="text-xs text-banana-400 hover:underline"
                >
                    Try Demo: Cobblestone
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg hover:border-banana-500/50 transition-colors group">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-banana-500 group-hover:text-black transition-colors">
                    <Map className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Settings & Scenes</h3>
                <p className="text-sm text-slate-400 mb-4">Create full backgrounds and immersive worlds.</p>
                <button 
                     onClick={() => onDemoClick("Mt. Fuji with cherry blossoms, pixel art landscape, 16-bit")}
                    className="text-xs text-banana-400 hover:underline"
                >
                    Try Demo: Mt. Fuji
                </button>
            </div>
        </div>

        {/* FAQ / Info Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-sm text-slate-300 leading-relaxed">
            <div className="space-y-6">
                <div className="space-y-2">
                    <h4 className="text-white font-bold">What is Pixel Banana?</h4>
                    <p>Pixel Banana is a free tool powered by Gemini 2.5 Flash Image that allows creators to generate pixel art assets. Unlike traditional filters, it understands semantic instructions to create new content or modify existing sprites.</p>
                </div>
                <div className="space-y-2">
                    <h4 className="text-white font-bold">How to create a Sprite Sheet?</h4>
                    <p>Select "Sprite Sheet" from the Output Type menu. Then, use the "Layout" tab to specify the number of columns (X) and rows (Y). You can also adjust the padding between sprites to ensure they don't overlap, making it easier to slice them later in game engines like Unity or Godot.</p>
                </div>
            </div>
            <div className="space-y-6">
                 <div className="space-y-2">
                    <h4 className="text-white font-bold">Post-Processing & Palettes</h4>
                    <p>Use the "Edit" tab to fine-tune your results. You can artificially lower the resolution using the "Pixel Size" slider to get that crunchy 8-bit feel. You can also limit the color palette using the "Reduce Colors" slider to simulate hardware limitations of retro consoles.</p>
                </div>
                <div className="space-y-2">
                    <h4 className="text-white font-bold">Commercial Use</h4>
                    <p>You are free to use the generated images for any purpose including commercial projects. Pixel Banana does not claim ownership over the generations. Please verify the license of any reference images you upload.</p>
                </div>
            </div>
        </div>
        
        <div className="text-center pt-8 border-t border-slate-900">
            <p className="text-xs text-slate-600">© 2024 Pixel Banana / Powered by Google Gemini Nano</p>
        </div>

      </div>
    </section>
  );
};

export default InfoSection;
