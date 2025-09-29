/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobePanel';
import OutfitStack from './components/OutfitStack';
import Header from './components/Header';
import Footer from './components/Footer';
import LegalModal from './components/LegalModal';
import SupportModal from './components/SupportModal';
import Tutorial from './components/Tutorial';
import { 
  generateVirtualTryOnImage, 
  generatePoseVariation, 
  generateBackground, 
  getStyleSuggestion, 
  getColorPalette, 
  generatePhotoshoot,
  repatternGarment,
  getLookbookStory,
  cleanupGarmentImage,
  generateBlendedGarment,
} from './services/geminiService';
import { OutfitLayer, WardrobeItem, ColorPalette, SavedLook, EditorState } from './types';
import { ChevronDownIcon, ChevronUpIcon, XIcon, WandIcon, DownloadIcon, QuillIcon, CalendarIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';
import SavedLooksPanel from './components/SavedLooksPanel';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQueryList.addEventListener('change', listener);
    
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};

const useUndoableState = <T,>(initialState: T) => {
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    const resolvedState = typeof newState === 'function' 
      ? (newState as (prevState: T) => T)(state) 
      : newState;

    if (JSON.stringify(resolvedState) === JSON.stringify(state)) {
        return;
    }

    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(resolvedState);
    
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [history, currentIndex, state]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const resetState = useCallback((newState: T) => {
    setHistory([newState]);
    setCurrentIndex(0);
  }, []);

  return { state, setState, undo, redo, canUndo, canRedo, resetState };
};

const PhotoshootModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  images: (string | null)[];
  isLoading: boolean;
  onDownload: (url: string) => void;
}> = ({ isOpen, onClose, images, isLoading, onDownload }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-xl border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-200">AI Photoshoot</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(isLoading && images.length === 0 ? [null, null, null] : images).map((image, index) => (
                  <div key={index} className="aspect-[2/3] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                    {image ? (
                      <div className="relative group w-full h-full">
                        <img src={image} alt={`Photoshoot image ${index + 1}`} className="w-full h-full object-cover animate-fade-in" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => onDownload(image)}
                            className="p-2.5 rounded-full bg-white/80 text-gray-800 hover:bg-white active:scale-95"
                            aria-label="Download image"
                          >
                            <DownloadIcon className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Spinner />
                        <span className="text-sm font-medium">Generating...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const GenericModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ isOpen, onClose, title, children, icon }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md flex flex-col shadow-xl border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
              {icon}
              <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-200">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-auto"
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


const App: React.FC = () => {
  const initialEditorState: EditorState = {
    modelImageUrl: null,
    outfitHistory: [],
    currentOutfitIndex: 0,
    currentPose: POSE_INSTRUCTIONS[0],
  };
  
  const { 
    state: editorState, 
    setState: setEditorState, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    resetState: resetEditorState,
  } = useUndoableState(initialEditorState);

  const { modelImageUrl, outfitHistory, currentOutfitIndex, currentPose } = editorState;

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([...defaultWardrobe]);
  const [stylistSuggestion, setStylistSuggestion] = useState<string | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isStyling, setIsStyling] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('hasSeenTutorial'));
  const [modalContent, setModalContent] = useState<'privacy' | 'terms' | 'support' | null>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  
  // New Feature States
  const [isShooting, setIsShooting] = useState(false);
  const [photoshootResult, setPhotoshootResult] = useState<(string | null)[]>([]);
  const [isPhotoshootModalOpen, setIsPhotoshootModalOpen] = useState(false);
  const [repatternTarget, setRepatternTarget] = useState<{ layerIndex: number; garmentName: string } | null>(null);
  const [isEventStylistOpen, setIsEventStylistOpen] = useState(false);
  const [lookbookStory, setLookbookStory] = useState<string | null>(null);
  const [isLookbookOpen, setIsLookbookOpen] = useState(false);


  const isBusy = isLoading || isStyling || isShooting;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      const storedLooks = localStorage.getItem('savedLooks');
      if (storedLooks) {
        setSavedLooks(JSON.parse(storedLooks));
      }
    } catch (e) {
      console.error("Failed to load saved looks from localStorage", e);
      localStorage.removeItem('savedLooks');
    }
  }, []);

  const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

  const handleTutorialFinish = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const activeOutfitLayers = useMemo(() => 
    outfitHistory.slice(0, currentOutfitIndex + 1), 
    [outfitHistory, currentOutfitIndex]
  );
  
  const activeGarmentIds = useMemo(() => 
    activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], 
    [activeOutfitLayers]
  );
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;

    return currentLayer.poseImages[currentPose] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPose, modelImageUrl]);
  
  const isLookSaved = useMemo(() => 
    savedLooks.some(look => look.thumbnailUrl === displayImageUrl),
    [savedLooks, displayImageUrl]
  );

  const handleModelFinalized = (url: string) => {
    resetEditorState({
      ...initialEditorState,
      modelImageUrl: url,
      outfitHistory: [{
        garment: null,
        poseImages: { [POSE_INSTRUCTIONS[0]]: url }
      }],
    });
  };

  const handleStartOver = () => {
    resetEditorState(initialEditorState);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setIsSheetCollapsed(false);
    setWardrobe([...defaultWardrobe]);
    setStylistSuggestion(null);
    setColorPalette(null);
    setIsStyling(false);
  };

  const clearSuggestions = () => {
    setStylistSuggestion(null);
    setColorPalette(null);
  }

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem, enhance: boolean) => {
    if (!displayImageUrl || isBusy) return;
    clearSuggestions();

    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setEditorState(prev => ({ ...prev, currentOutfitIndex: prev.currentOutfitIndex + 1 }));
        return;
    }

    setError(null);
    setIsLoading(true);

    try {
      let finalGarmentFile = garmentFile;
      let finalGarmentInfo = { ...garmentInfo };

      if (enhance) {
        setLoadingMessage(`Enhancing ${garmentInfo.name}...`);
        const enhancedFile = await cleanupGarmentImage(garmentFile);
        finalGarmentFile = enhancedFile;
        // Update URL in wardrobe item to show the cleaned version
        finalGarmentInfo.url = URL.createObjectURL(enhancedFile);
      }
      
      setLoadingMessage(`Adding ${garmentInfo.name}...`);
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, finalGarmentFile);
      
      const newLayer: OutfitLayer = { 
        garment: finalGarmentInfo, 
        poseImages: { [currentPose]: newImageUrl } 
      };

      setEditorState(prev => {
        const newHistory = prev.outfitHistory.slice(0, prev.currentOutfitIndex + 1);
        return {
          ...prev,
          outfitHistory: [...newHistory, newLayer],
          currentOutfitIndex: prev.currentOutfitIndex + 1,
        };
      });
      
      setWardrobe(prev => {
        if (prev.find(item => item.id === finalGarmentInfo.id)) {
          // If item exists (e.g. from default), maybe update its URL if enhanced
          return prev.map(item => item.id === finalGarmentInfo.id ? finalGarmentInfo : item);
        }
        return [...prev, finalGarmentInfo];
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isBusy, currentPose, outfitHistory, currentOutfitIndex, setEditorState]);
  
  const handlePoseSelect = useCallback(async (newPose: string) => {
    if (isBusy || outfitHistory.length === 0 || newPose === currentPose) return;
    clearSuggestions();
    
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.poseImages[newPose]) {
      setEditorState(prev => ({ ...prev, currentPose: newPose }));
      return;
    }

    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, newPose);
      setEditorState(prev => {
        const newOutfitHistory = [...prev.outfitHistory];
        const updatedLayer = { ...newOutfitHistory[prev.currentOutfitIndex] };
        updatedLayer.poseImages = { ...updatedLayer.poseImages, [newPose]: newImageUrl };
        newOutfitHistory[prev.currentOutfitIndex] = updatedLayer;

        return {
          ...prev,
          outfitHistory: newOutfitHistory,
          currentPose: newPose,
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to change pose'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPose, outfitHistory, isBusy, currentOutfitIndex, setEditorState]);

  const handleBackgroundChange = useCallback(async (backgroundPrompt: string) => {
    if (!displayImageUrl || isBusy) return;
    clearSuggestions();

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Generating new scene...`);

    try {
      const newImageUrl = await generateBackground(displayImageUrl, backgroundPrompt);
      setEditorState(prev => {
        const newOutfitHistory = [...prev.outfitHistory];
        const currentLayer = { ...newOutfitHistory[prev.currentOutfitIndex] };
        currentLayer.poseImages = { ...currentLayer.poseImages, [prev.currentPose]: newImageUrl };
        newOutfitHistory[prev.currentOutfitIndex] = currentLayer;
        return { ...prev, outfitHistory: newOutfitHistory };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to change background'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isBusy, setEditorState]);

  const handleGetSuggestion = useCallback(async () => {
    if (!displayImageUrl || isStyling) return;

    setError(null);
    clearSuggestions();
    setIsStyling(true);
    
    try {
      const [suggestion, palette] = await Promise.all([
        getStyleSuggestion(displayImageUrl),
        getColorPalette(displayImageUrl)
      ]);
      setStylistSuggestion(suggestion);
      setColorPalette(palette);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to get style suggestion'));
    } finally {
      setIsStyling(false);
    }
  }, [displayImageUrl, isStyling]);

  const handleSaveLook = useCallback(() => {
    if (!displayImageUrl || !modelImageUrl || isLookSaved) return;

    const newSavedLook: SavedLook = {
      id: `look-${Date.now()}`,
      thumbnailUrl: displayImageUrl,
      savedAt: new Date().toISOString(),
      editorState: editorState,
    };
    
    const updatedLooks = [...savedLooks, newSavedLook];
    setSavedLooks(updatedLooks);
    localStorage.setItem('savedLooks', JSON.stringify(updatedLooks));

  }, [displayImageUrl, modelImageUrl, editorState, savedLooks, isLookSaved]);

  const handleLoadLook = useCallback((lookId: string) => {
    if (isBusy) return;
    const lookToLoad = savedLooks.find(look => look.id === lookId);
    if (lookToLoad) {
      clearSuggestions();
      setError(null);
      resetEditorState(lookToLoad.editorState);
    }
  }, [isBusy, savedLooks, resetEditorState]);

  const handleDeleteLook = useCallback((lookId: string) => {
    const updatedLooks = savedLooks.filter(look => look.id !== lookId);
    setSavedLooks(updatedLooks);
    localStorage.setItem('savedLooks', JSON.stringify(updatedLooks));
  }, [savedLooks]);

  const handleShareLook = useCallback(async () => {
    if (!displayImageUrl) return;

    try {
      const response = await fetch(displayImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'fit-check-outfit.png', { type: blob.type });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Fit Check Outfit',
          text: 'Check out my new look created with Fit Check!',
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'fit-check-outfit.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Could not share or download the image'));
    }
  }, [displayImageUrl]);

  const handleGeneratePhotoshoot = useCallback(async () => {
    if (!displayImageUrl || isBusy) return;
    
    setError(null);
    setIsPhotoshootModalOpen(true);
    setIsShooting(true);
    setPhotoshootResult([]);

    try {
      const results = await generatePhotoshoot(displayImageUrl);
      setPhotoshootResult(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'AI Photoshoot failed'));
      setIsPhotoshootModalOpen(false);
    } finally {
      setIsShooting(false);
    }
  }, [displayImageUrl, isBusy]);

  const handleRepattern = useCallback(async (patternPrompt: string) => {
    if (!displayImageUrl || !repatternTarget || isBusy) return;
    
    const { layerIndex, garmentName } = repatternTarget;
    setRepatternTarget(null);
    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Applying new pattern to ${garmentName}...`);

    try {
      const newImageUrl = await repatternGarment(displayImageUrl, garmentName, patternPrompt);
      setEditorState(prev => {
        const newOutfitHistory = [...prev.outfitHistory];
        const currentLayer = { ...newOutfitHistory[prev.currentOutfitIndex] };
        // This repattern affects the current pose. We update it.
        // We could also reset other poses for this layer to force regeneration if needed.
        currentLayer.poseImages = { [prev.currentPose]: newImageUrl };
        newOutfitHistory[prev.currentOutfitIndex] = currentLayer;
        return { ...prev, outfitHistory: newOutfitHistory };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to repattern garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isBusy, repatternTarget, setEditorState]);

  const handleEventStylist = useCallback(async (eventPrompt: string) => {
    if (!displayImageUrl || isBusy) return;
    
    setIsEventStylistOpen(false);
    clearSuggestions();
    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Styling for: ${eventPrompt}...`);

    try {
      // Generate background and suggestion in parallel
      const [newImageUrl, suggestion] = await Promise.all([
        generateBackground(displayImageUrl, eventPrompt),
        getStyleSuggestion(displayImageUrl, `based on attending this event: "${eventPrompt}"`)
      ]);

      // Update background
      setEditorState(prev => {
        const newOutfitHistory = [...prev.outfitHistory];
        const currentLayer = { ...newOutfitHistory[prev.currentOutfitIndex] };
        currentLayer.poseImages = { ...currentLayer.poseImages, [prev.currentPose]: newImageUrl };
        newOutfitHistory[prev.currentOutfitIndex] = currentLayer;
        return { ...prev, outfitHistory: newOutfitHistory };
      });

      // Show suggestion
      setStylistSuggestion(suggestion);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Event Stylist failed'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isBusy, setEditorState]);
  
  const handleGetLookbookStory = useCallback(async () => {
    if (!displayImageUrl || isBusy) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage('Writing your lookbook story...');

    try {
      const story = await getLookbookStory(displayImageUrl);
      setLookbookStory(story);
      setIsLookbookOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to generate story'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isBusy]);
  
  const handleStyleBlend = useCallback(async (item1: WardrobeItem, item2: WardrobeItem) => {
    if (isBusy) return;
    
    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Blending ${item1.name} and ${item2.name}...`);
    
    try {
        const newGarmentFile = await generateBlendedGarment(item1, item2);
        const newGarmentInfo: WardrobeItem = {
            id: `blend-${Date.now()}`,
            name: `${item1.name} / ${item2.name} Blend`,
            url: URL.createObjectURL(newGarmentFile),
            type: 'top', // Assume blended items are tops for simplicity
        };
        
        // Add the new item to the wardrobe, but don't apply it yet.
        setWardrobe(prev => [...prev, newGarmentInfo]);
        setLoadingMessage('Added blended style to your wardrobe!');
        // Keep message for a bit
        setTimeout(() => {
          setIsLoading(false);
          setLoadingMessage('');
        }, 2000);

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(getFriendlyErrorMessage(message, 'Style Blender failed'));
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [isBusy]);

  const handleRemoveLayer = useCallback((layerIndex: number) => {
    if (isBusy) return;

    setEditorState(prev => {
        const newHistory = prev.outfitHistory.slice(0, layerIndex);
        const newIndex = layerIndex - 1;
        
        const lastValidLayer = newHistory[newIndex];
        const lastValidPose = Object.keys(lastValidLayer.poseImages)[0];
        
        return {
            ...prev,
            outfitHistory: newHistory,
            currentOutfitIndex: newIndex,
            currentPose: prev.currentPose in lastValidLayer.poseImages ? prev.currentPose : lastValidPose,
        };
    });
  }, [isBusy, setEditorState]);

  const handleDownloadImage = useCallback(async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `fit-check-photoshoot-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Could not download the image'));
    }
  }, []);

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };
  
  const [patternPrompt, setPatternPrompt] = useState('');
  const [eventPrompt, setEventPrompt] = useState('');

  return (
    <div className="font-sans bg-white dark:bg-gray-900 flex flex-col min-h-screen">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="flex-grow flex flex-col">
          <AnimatePresence mode="wait">
            {!modelImageUrl ? (
                <motion.div
                  key="start"
                  className="flex-grow flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4"
                  variants={viewVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  <StartScreen onModelFinalized={handleModelFinalized} />
                </motion.div>
            ) : (
                <motion.div
                  key="app"
                  className="flex-grow relative flex flex-col md:flex-row overflow-hidden"
                  variants={viewVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  <div className="w-full h-full flex-grow flex items-center justify-center bg-white dark:bg-gray-900 pb-16 md:pb-0 relative">
                    <Canvas 
                      displayImageUrl={displayImageUrl}
                      onStartOver={handleStartOver}
                      isLoading={isBusy}
                      loadingMessage={loadingMessage}
                      onSelectPose={handlePoseSelect}
                      poseInstructions={POSE_INSTRUCTIONS}
                      currentPose={currentPose}
                      onGenerateBackground={handleBackgroundChange}
                      onSaveLook={handleSaveLook}
                      onShareLook={handleShareLook}
                      isLookSaved={isLookSaved}
                      onUndo={undo}
                      onRedo={redo}
      
                      canUndo={canUndo}
                      canRedo={canRedo}
                      onGeneratePhotoshoot={handleGeneratePhotoshoot}
                      isShooting={isShooting}
                      onOpenEventStylist={() => setIsEventStylistOpen(true)}
                    />
                  </div>
    
                  <aside 
                    className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex flex-col border-t md:border-t-0 md:border-l border-gray-200/60 dark:border-gray-800/60 transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-4.5rem)]' : 'translate-y-0'} md:translate-y-0`}
                    style={{ transitionProperty: 'transform' }}
                  >
                      <button 
                        onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                        className="md:hidden w-full h-8 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50"
                        aria-label={isSheetCollapsed ? 'Expand panel' : 'Collapse panel'}
                      >
                        {isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" /> : <ChevronDownIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />}
                      </button>
                      <div className="p-4 md:p-6 pb-20 overflow-y-auto flex-grow flex flex-col gap-8">
                        {error && (
                          <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-4 rounded-md" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                          </div>
                        )}
                        <OutfitStack 
                          outfitHistory={activeOutfitLayers}
                          onAskStylist={handleGetSuggestion}
                          isStyling={isStyling}
                          stylistSuggestion={stylistSuggestion}
                          colorPalette={colorPalette}
                          onRepattern={({layerIndex, garmentName}) => setRepatternTarget({layerIndex, garmentName})}
                          onGetLookbookStory={handleGetLookbookStory}
                          onRemoveLayer={handleRemoveLayer}
                        />
                        <WardrobePanel
                          onGarmentSelect={handleGarmentSelect}
                          activeGarmentIds={activeGarmentIds}
                          isLoading={isBusy}
                          wardrobe={wardrobe}
                          onStyleBlend={handleStyleBlend}
                        />
                        <SavedLooksPanel
                          savedLooks={savedLooks}
                          onLoadLook={handleLoadLook}
                          onDeleteLook={handleDeleteLook}
                          isLoading={isBusy}
                        />
                      </div>
                  </aside>
                  <AnimatePresence>
                    {isLoading && isMobile && (
                      <motion.div
                        className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Spinner />
                        {loadingMessage && (
                          <p className="text-lg font-serif text-gray-700 dark:text-gray-300 mt-4 text-center px-4">{loadingMessage}</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
            )}
          </AnimatePresence>
      </main>
      <Footer onShowLegal={setModalContent} />

      <LegalModal content={modalContent === 'privacy' || modalContent === 'terms' ? modalContent : null} onClose={() => setModalContent(null)} />
      <SupportModal isOpen={modalContent === 'support'} onClose={() => setModalContent(null)} />
      {showTutorial && modelImageUrl && <Tutorial onFinish={handleTutorialFinish} />}
      <PhotoshootModal 
        isOpen={isPhotoshootModalOpen}
        onClose={() => setIsPhotoshootModalOpen(false)}
        images={photoshootResult}
        isLoading={isShooting}
        onDownload={handleDownloadImage}
      />
      
      <GenericModal 
        isOpen={repatternTarget !== null}
        onClose={() => setRepatternTarget(null)}
        title="AI Pattern Generator"
        icon={<WandIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Describe a new pattern or color for the <strong>{repatternTarget?.garmentName}</strong>.</p>
        <input
          type="text"
          value={patternPrompt}
          onChange={(e) => setPatternPrompt(e.target.value)}
          placeholder="e.g., 'psychedelic paisley print'"
          className="w-full text-sm p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-200 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && patternPrompt.trim()) {
              handleRepattern(patternPrompt);
              setPatternPrompt('');
            }
          }}
        />
        <button
          onClick={() => {
            if (patternPrompt.trim()) {
              handleRepattern(patternPrompt);
              setPatternPrompt('');
            }
          }}
          disabled={!patternPrompt.trim() || isBusy}
          className="mt-4 w-full flex items-center justify-center text-center bg-gray-900 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy ? <Spinner className="w-5 h-5"/> : 'Generate'}
        </button>
      </GenericModal>

      <GenericModal
        isOpen={isEventStylistOpen}
        onClose={() => setIsEventStylistOpen(false)}
        title="Event Stylist"
        icon={<CalendarIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Describe the event you're attending. The AI will set the scene and give you a styling tip.</p>
        <input
            type="text"
            value={eventPrompt}
            onChange={(e) => setEventPrompt(e.target.value)}
            placeholder="e.g., 'a summer wedding in Tuscany'"
            className="w-full text-sm p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-200 focus:outline-none"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && eventPrompt.trim()) {
                    handleEventStylist(eventPrompt);
                    setEventPrompt('');
                }
            }}
        />
        <button
            onClick={() => {
                if (eventPrompt.trim()) {
                    handleEventStylist(eventPrompt);
                    setEventPrompt('');
                }
            }}
            disabled={!eventPrompt.trim() || isBusy}
            className="mt-4 w-full flex items-center justify-center text-center bg-gray-900 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isBusy ? <Spinner className="w-5 h-5"/> : 'Get Style'}
        </button>
      </GenericModal>
      
      <GenericModal
        isOpen={isLookbookOpen}
        onClose={() => setIsLookbookOpen(false)}
        title="Lookbook Story"
        icon={<QuillIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />}
      >
        <p className="text-base text-gray-700 dark:text-gray-200 font-serif italic">"{lookbookStory}"</p>
      </GenericModal>

    </div>
  );
};

export default App;