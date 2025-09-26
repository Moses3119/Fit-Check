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
import { generateVirtualTryOnImage, generatePoseVariation, generateBackground, getStyleSuggestion, getColorPalette } from './services/geminiService';
import { OutfitLayer, WardrobeItem, ColorPalette } from './types';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';

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


const App: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [stylistSuggestion, setStylistSuggestion] = useState<string | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isStyling, setIsStyling] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  // New state for new features
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('hasSeenTutorial'));
  const [modalContent, setModalContent] = useState<'privacy' | 'terms' | 'support' | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

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

    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    return currentLayer ? Object.keys(currentLayer.poseImages) : [];
  }, [outfitHistory, currentOutfitIndex]);

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    setOutfitHistory([{
      garment: null,
      poseImages: { [POSE_INSTRUCTIONS[0]]: url }
    }]);
    setCurrentOutfitIndex(0);
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setIsSheetCollapsed(false);
    setWardrobe(defaultWardrobe);
    setStylistSuggestion(null);
    setColorPalette(null);
    setIsStyling(false);
  };

  const clearSuggestions = () => {
    setStylistSuggestion(null);
    setColorPalette(null);
  }

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;
    clearSuggestions();

    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setCurrentOutfitIndex(prev => prev + 1);
        setCurrentPoseIndex(0);
        return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);

    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile);
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        poseImages: { [currentPoseInstruction]: newImageUrl } 
      };

      setOutfitHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, currentOutfitIndex + 1);
        return [...newHistory, newLayer];
      });
      setCurrentOutfitIndex(prev => prev + 1);
      
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex]);

  const handleRemoveLastGarment = () => {
    if (currentOutfitIndex > 0) {
      setCurrentOutfitIndex(prevIndex => prevIndex - 1);
      setCurrentPoseIndex(0);
      clearSuggestions();
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    clearSuggestions();
    
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }

    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    
    const prevPoseIndex = currentPoseIndex;
    setCurrentPoseIndex(newIndex);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction);
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const updatedLayer = newHistory[currentOutfitIndex];
        updatedLayer.poseImages[poseInstruction] = newImageUrl;
        return newHistory;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to change pose'));
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex]);

  const handleBackgroundChange = useCallback(async (backgroundPrompt: string) => {
    if (!displayImageUrl || isLoading) return;
    clearSuggestions();

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Generating new scene...`);

    try {
      const newImageUrl = await generateBackground(displayImageUrl, backgroundPrompt);
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const currentLayer = newHistory[currentOutfitIndex];
        const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
        currentLayer.poseImages[currentPoseInstruction] = newImageUrl;
        return newHistory;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to change background'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentOutfitIndex, currentPoseIndex]);

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
      // FIX: The error object from a try-catch block is of type `unknown`.
      // It must be converted to a string before being passed to another function.
      const message = err instanceof Error ? err.message : String(err);
      setError(getFriendlyErrorMessage(message, 'Failed to get style suggestion'));
    } finally {
      setIsStyling(false);
    }
  }, [displayImageUrl, isStyling]);

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };

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
                      isLoading={isLoading}
                      loadingMessage={loadingMessage}
                      onSelectPose={handlePoseSelect}
                      poseInstructions={POSE_INSTRUCTIONS}
                      currentPoseIndex={currentPoseIndex}
                      availablePoseKeys={availablePoseKeys}
                      onGenerateBackground={handleBackgroundChange}
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
                          onRemoveLastGarment={handleRemoveLastGarment}
                          onAskStylist={handleGetSuggestion}
                          isStyling={isStyling}
                          stylistSuggestion={stylistSuggestion}
                          colorPalette={colorPalette}
                        />
                        <WardrobePanel
                          onGarmentSelect={handleGarmentSelect}
                          activeGarmentIds={activeGarmentIds}
                          isLoading={isLoading}
                          wardrobe={wardrobe}
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
    </div>
  );
};

export default App;