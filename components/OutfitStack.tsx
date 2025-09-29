/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { OutfitLayer, ColorPalette } from '../types';
import { LightbulbIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from './Spinner';


interface OutfitStackProps {
  outfitHistory: OutfitLayer[];
  onAskStylist: () => void;
  isStyling: boolean;
  stylistSuggestion: string | null;
  colorPalette: ColorPalette | null;
}

const OutfitStack: React.FC<OutfitStackProps> = ({ outfitHistory, onAskStylist, isStyling, stylistSuggestion, colorPalette }) => {
  
  return (
    <div className="flex flex-col" id="outfit-stack-panel">
       <div className="flex justify-between items-center border-b border-gray-400/50 dark:border-gray-600/50 pb-2 mb-3">
        <h2 className="text-xl font-serif tracking-wider text-gray-800 dark:text-gray-200">Outfit Stack</h2>
        <button
          id="stylist-button"
          onClick={onAskStylist}
          disabled={isStyling || outfitHistory.length < 1}
          className="relative flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300/80 dark:border-gray-600/80 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Get a style suggestion"
        >
          {isStyling ? <Spinner className="w-4 h-4" /> : <LightbulbIcon className="w-4 h-4" />}
          {isStyling ? 'Thinking...' : 'Ask Stylist'}
        </button>
      </div>

      <AnimatePresence>
        {(stylistSuggestion || colorPalette) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500 text-indigo-800 dark:text-indigo-200 p-3 rounded-md mb-3 text-sm space-y-2"
          >
            {stylistSuggestion && (
                <div>
                    <p className="font-bold">Stylist says:</p>
                    <p>"{stylistSuggestion}"</p>
                </div>
            )}
            {colorPalette && (
                <div>
                    <p className="font-bold">Color Palette:</p>
                    <div className="flex items-center gap-2 mt-1">
                        {colorPalette.map((color) => (
                            <div key={color} className="w-6 h-6 rounded-full border-2 border-white/50 dark:border-gray-800/50 shadow-md" style={{ backgroundColor: color }} title={color} />
                        ))}
                    </div>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {outfitHistory.map((layer, index) => (
          <div
            key={layer.garment?.id || 'base'}
            className="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg animate-fade-in border border-gray-200/80 dark:border-gray-700/80"
          >
            <div className="flex items-center overflow-hidden">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full">
                  {index + 1}
                </span>
                {layer.garment && (
                    <img src={layer.garment.url} alt={layer.garment.name} className="flex-shrink-0 w-12 h-12 object-cover rounded-md mr-3" />
                )}
                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={layer.garment?.name}>
                  {layer.garment ? layer.garment.name : 'Base Model'}
                </span>
            </div>
          </div>
        ))}
        {outfitHistory.length <= 1 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4">Your stacked items will appear here. Select an item from the wardrobe below.</p>
        )}
      </div>
    </div>
  );
};

export default OutfitStack;
