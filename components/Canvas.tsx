/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon, MountainIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
  onGenerateBackground: (prompt: string) => Promise<void>;
}

const Canvas: React.FC<CanvasProps> = ({ displayImageUrl, onStartOver, isLoading, loadingMessage, onSelectPose, poseInstructions, currentPoseIndex, availablePoseKeys, onGenerateBackground }) => {
  const [isPoseMenuOpen, setIsPoseMenuOpen] = useState(false);
  const [isBackgroundMenuOpen, setIsBackgroundMenuOpen] = useState(false);
  const [backgroundPrompt, setBackgroundPrompt] = useState('');

  const BACKGROUND_PRESETS = ["A vibrant city street at night", "A serene beach at sunset", "A minimalist art gallery", "A lush, green forest"];
  
  const handlePreviousPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);
    
    if (currentIndexInAvailable === -1) {
        onSelectPose((currentPoseIndex - 1 + poseInstructions.length) % poseInstructions.length);
        return;
    }

    const prevIndexInAvailable = (currentIndexInAvailable - 1 + availablePoseKeys.length) % availablePoseKeys.length;
    const prevPoseInstruction = availablePoseKeys[prevIndexInAvailable];
    const newGlobalPoseIndex = poseInstructions.indexOf(prevPoseInstruction);
    
    if (newGlobalPoseIndex !== -1) {
        onSelectPose(newGlobalPoseIndex);
    }
  };

  const handleNextPose = () => {
    if (isLoading) return;

    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);

    if (currentIndexInAvailable === -1 || availablePoseKeys.length === 0) {
        onSelectPose((currentPoseIndex + 1) % poseInstructions.length);
        return;
    }
    
    const nextIndexInAvailable = currentIndexInAvailable + 1;
    if (nextIndexInAvailable < availablePoseKeys.length) {
        const nextPoseInstruction = availablePoseKeys[nextIndexInAvailable];
        const newGlobalPoseIndex = poseInstructions.indexOf(nextPoseInstruction);
        if (newGlobalPoseIndex !== -1) {
            onSelectPose(newGlobalPoseIndex);
        }
    } else {
        const newGlobalPoseIndex = (currentPoseIndex + 1) % poseInstructions.length;
        onSelectPose(newGlobalPoseIndex);
    }
  };
  
  const handleBackgroundButtonClick = () => {
    setIsBackgroundMenuOpen(p => !p);
  }

  const handleGenerateBackground = async () => {
    if (!backgroundPrompt.trim() || isLoading) return;
    await onGenerateBackground(backgroundPrompt);
    setBackgroundPrompt('');
    setIsBackgroundMenuOpen(false);
  };
  
  const handlePresetClick = async (preset: string) => {
    setBackgroundPrompt(preset);
    await onGenerateBackground(preset);
    setBackgroundPrompt('');
    setIsBackgroundMenuOpen(false);
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative animate-zoom-in group">
      <button 
          onClick={onStartOver}
          className="absolute top-4 left-4 z-30 flex items-center justify-center text-center bg-white/60 dark:bg-gray-800/60 border border-gray-300/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white dark:hover:bg-gray-800 hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm"
      >
          <RotateCcwIcon className="w-4 h-4 mr-2" />
          Start Over
      </button>

      <div className="relative w-full h-full flex items-center justify-center">
        {displayImageUrl ? (
          <img
            key={displayImageUrl}
            src={displayImageUrl}
            alt="Virtual try-on model"
            className="max-w-full max-h-full object-contain transition-opacity duration-500 animate-fade-in rounded-lg"
          />
        ) : (
            <div className="w-[400px] h-[600px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center">
              <Spinner />
              <p className="text-md font-serif text-gray-600 dark:text-gray-400 mt-4">Loading Model...</p>
            </div>
        )}
        
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-lg"
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
      </div>

      {displayImageUrl && !isLoading && (
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-3"
          onMouseLeave={() => {
            setIsPoseMenuOpen(false);
            setIsBackgroundMenuOpen(false);
          }}
        >
          <AnimatePresence>
              {isBackgroundMenuOpen && (
                  <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="w-80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-3 border border-gray-200/80 dark:border-gray-700/80 shadow-lg"
                  >
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Describe a scene:</p>
                      <div className="flex gap-2">
                          <input
                              type="text"
                              value={backgroundPrompt}
                              onChange={(e) => setBackgroundPrompt(e.target.value)}
                              placeholder="e.g., a Parisian cafe"
                              className="w-full text-sm p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-200 focus:outline-none"
                              onKeyDown={(e) => e.key === 'Enter' && handleGenerateBackground()}
                          />
                          <button onClick={handleGenerateBackground} className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-3 rounded-md hover:bg-gray-600 dark:hover:bg-gray-400 active:scale-95 transition-colors text-sm font-semibold">Go</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {BACKGROUND_PRESETS.map(preset => (
                          <button
                            key={preset}
                            onClick={() => handlePresetClick(preset)}
                            className="text-left text-xs font-medium text-gray-700 dark:text-gray-300 p-2 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-700/70"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>

          <AnimatePresence>
              {isPoseMenuOpen && !isBackgroundMenuOpen && (
                  <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute bottom-full mb-3 w-64 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-2 border border-gray-200/80 dark:border-gray-700/80"
                  >
                      <div className="grid grid-cols-2 gap-2">
                          {poseInstructions.map((pose, index) => (
                              <button
                                  key={pose}
                                  onClick={() => onSelectPose(index)}
                                  disabled={isLoading || index === currentPoseIndex}
                                  className="w-full text-left text-sm font-medium text-gray-800 dark:text-gray-200 p-2 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-700/70 disabled:opacity-50 disabled:bg-gray-200/70 dark:disabled:bg-gray-700/70 disabled:font-bold disabled:cursor-not-allowed"
                              >
                                  {pose}
                              </button>
                          ))}
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
          
          <div 
            id="pose-controls"
            className="flex items-center justify-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-full p-2 border border-gray-300/50 dark:border-gray-700/50"
            onMouseEnter={() => setIsPoseMenuOpen(true)}
          >
            <button 
              onClick={handlePreviousPose}
              aria-label="Previous pose"
              className="p-2 rounded-full hover:bg-white/80 dark:hover:bg-gray-700/80 active:scale-90 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-48 text-center truncate" title={poseInstructions[currentPoseIndex]}>
              {poseInstructions[currentPoseIndex]}
            </span>
            <button 
              onClick={handleNextPose}
              aria-label="Next pose"
              className="p-2 rounded-full hover:bg-white/80 dark:hover:bg-gray-700/80 active:scale-90 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <button 
              id="scene-controls"
              onClick={handleBackgroundButtonClick}
              aria-label="Change background"
              className="p-2 rounded-full hover:bg-white/80 dark:hover:bg-gray-700/80 active:scale-90 transition-all relative"
              title="Change Background"
            >
              <MountainIcon className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;