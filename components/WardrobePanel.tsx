/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon, CheckCircleIcon, BlendIcon, SparklesIcon } from './icons';
import { cn } from '../lib/utils';
import Spinner from './Spinner';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem, enhance: boolean) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
  onStyleBlend: (item1: WardrobeItem, item2: WardrobeItem) => void;
}

// Helper to convert image URL to a File object using a canvas to bypass potential CORS issues.
const urlToFile = (url: string, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(image, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                const mimeType = blob.type || 'image/png';
                const file = new File([blob], filename, { type: mimeType });
                resolve(file);
            }, 'image/png');
        };

        image.onerror = () => {
            reject(new Error(`Could not load image from URL. This may be a CORS issue. Check the browser console for more details.`));
        };

        image.src = url;
    });
};

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe, onStyleBlend }) => {
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'Tops' | 'Blender'>('Tops');
    
    const [blendItem1, setBlendItem1] = useState<WardrobeItem | null>(null);
    const [blendItem2, setBlendItem2] = useState<WardrobeItem | null>(null);
    const [isSelectingFor, setIsSelectingFor] = useState<'item1' | 'item2' | null>(null);

    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading || activeGarmentIds.includes(item.id)) return;
        setError(null);
        try {
            const file = await urlToFile(item.url, item.name);
            onGarmentSelect(file, item, false); // No enhancement for default items
        } catch (err) {
            const detailedError = `Failed to load wardrobe item. Check console for CORS errors.`;
            setError(detailedError);
            console.error(`[CORS Check] Failed to load wardrobe item from URL: ${item.url}.`, err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, enhance: boolean) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file.');
                return;
            }
            const customGarmentInfo: WardrobeItem = {
                id: `custom-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
                type: 'top', // Assume uploads are tops for now
            };
            onGarmentSelect(file, customGarmentInfo, enhance);
        }
    };
    
    const handleBlendSelection = (item: WardrobeItem) => {
        if (isSelectingFor === 'item1') {
            if (item.id !== blendItem2?.id) setBlendItem1(item);
        } else if (isSelectingFor === 'item2') {
            if (item.id !== blendItem1?.id) setBlendItem2(item);
        }
        setIsSelectingFor(null);
    };

    const renderWardrobeGrid = (items: WardrobeItem[]) => (
        <div className="grid grid-cols-3 gap-3">
            {items.map((item) => {
                const isActive = activeGarmentIds.includes(item.id);
                return (
                    <button
                        key={item.id}
                        onClick={() => handleGarmentClick(item)}
                        disabled={isLoading || isActive}
                        className="relative aspect-square border dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 dark:focus:ring-gray-200 group disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={`Select ${item.name}`}
                    >
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs font-bold text-center p-1">{item.name}</p>
                        </div>
                        {isActive && (
                            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                                <CheckCircleIcon className="w-8 h-8 text-white" />
                            </div>
                        )}
                    </button>
                );
            })}
            <FileUploadButton onChange={handleFileChange} isLoading={isLoading} />
        </div>
    );

    if (isSelectingFor) {
        return (
            <div className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => setIsSelectingFor(null)} className="text-sm font-semibold hover:underline">← Back</button>
                    <h3 className="text-lg font-serif tracking-wider text-gray-800 dark:text-gray-200">Select Item {isSelectingFor === 'item1' ? 1 : 2}</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {wardrobe.map(item => (
                        <button key={item.id} onClick={() => handleBlendSelection(item)} className="relative aspect-square border dark:border-gray-700 rounded-lg overflow-hidden group">
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

  return (
    <div className="pt-6 border-t border-gray-400/50 dark:border-gray-600/50" id="wardrobe-panel">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-serif tracking-wider text-gray-800 dark:text-gray-200">Wardrobe</h2>
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-full p-0.5 text-sm">
                <button onClick={() => setActiveTab('Tops')} className={cn('px-3 py-1 rounded-full transition-colors', activeTab === 'Tops' && 'bg-gray-200 dark:bg-gray-700 font-semibold')}>Tops</button>
                <button onClick={() => setActiveTab('Blender')} className={cn('px-3 py-1 rounded-full transition-colors', activeTab === 'Blender' && 'bg-gray-200 dark:bg-gray-700 font-semibold')}>Blender</button>
            </div>
        </div>
        
        {activeTab === 'Tops' && renderWardrobeGrid(wardrobe)}
        
        {activeTab === 'Blender' && (
            <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <BlendIcon className="w-8 h-8 text-gray-700 dark:text-gray-300 mb-2" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">AI Style Blender</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Combine two items to create a new one.</p>
                <div className="flex items-center gap-4 mb-4">
                    <BlendItemSlot item={blendItem1} onSelect={() => setIsSelectingFor('item1')} />
                    <span className="text-2xl font-serif text-gray-400">+</span>
                    <BlendItemSlot item={blendItem2} onSelect={() => setIsSelectingFor('item2')} />
                </div>
                <button 
                    onClick={() => onStyleBlend(blendItem1!, blendItem2!)}
                    disabled={!blendItem1 || !blendItem2 || isLoading}
                    className="w-full bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800 font-semibold py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner className="w-5 h-5 mx-auto" /> : 'Experiment'}
                </button>
            </div>
        )}
        
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
};

const FileUploadButton: React.FC<{
    onChange: (e: React.ChangeEvent<HTMLInputElement>, enhance: boolean) => void;
    isLoading: boolean;
}> = ({ onChange, isLoading }) => {
    const [enhance, setEnhance] = useState(true);
    const id = React.useId();
    return (
        <div className="relative aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <label htmlFor={id} className={cn('w-full h-full flex flex-col items-center justify-center', isLoading ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer')}>
                <UploadCloudIcon className="w-6 h-6 mb-1"/>
                <span className="text-xs text-center font-semibold">Upload</span>
            </label>
            <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={(e) => onChange(e, enhance)} disabled={isLoading}/>
            <div className="absolute -bottom-7 left-0 w-full flex items-center justify-center">
                <input id={`${id}-enhance`} type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                <label htmlFor={`${id}-enhance`} className="ml-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1" title="Use AI to remove background and improve lighting">
                    AI-Enhance <SparklesIcon className="w-3 h-3 text-indigo-400" />
                </label>
            </div>
        </div>
    )
}

const BlendItemSlot: React.FC<{
    item: WardrobeItem | null;
    onSelect: () => void;
}> = ({ item, onSelect }) => (
    <button onClick={onSelect} className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden hover:border-gray-400">
        {item ? <img src={item.url} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">Select</span>}
    </button>
);


export default WardrobePanel;