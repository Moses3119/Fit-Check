/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import type { SavedLook } from '../types';
import { Trash2Icon } from './icons';

interface SavedLooksPanelProps {
  savedLooks: SavedLook[];
  onLoadLook: (id: string) => void;
  onDeleteLook: (id: string) => void;
  isLoading: boolean;
}

const SavedLooksPanel: React.FC<SavedLooksPanelProps> = ({ savedLooks, onLoadLook, onDeleteLook, isLoading }) => {
  return (
    <div className="pt-6 border-t border-gray-400/50 dark:border-gray-600/50" id="saved-looks-panel">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 dark:text-gray-200 mb-3">Saved Looks</h2>
      {savedLooks.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">Your saved looks will appear here. Click the heart icon on the image to save a look.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {savedLooks.map((look) => (
            <div key={look.id} className="relative group aspect-[2/3] border dark:border-gray-700 rounded-lg overflow-hidden">
              <img src={look.thumbnailUrl} alt={`Saved look from ${new Date(look.savedAt).toLocaleString()}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
                <button
                  onClick={() => onLoadLook(look.id)}
                  disabled={isLoading}
                  className="w-full text-center bg-white/80 text-gray-800 font-semibold py-2 px-3 rounded-md transition-all duration-200 ease-in-out hover:bg-white active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load
                </button>
                <button
                  onClick={() => onDeleteLook(look.id)}
                  className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors"
                  aria-label="Delete look"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
                 <p className="text-white text-xs font-medium text-center truncate">{new Date(look.savedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedLooksPanel;
