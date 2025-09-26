/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface TutorialProps {
    onFinish: () => void;
}

const tutorialSteps = [
    {
        title: "Welcome to Fit Check!",
        text: "Let's quickly walk through the creative tools at your disposal.",
        selector: null,
    },
    {
        title: "Outfit Stack",
        text: "As you add garments, they'll stack up here. You can easily remove the last item you added.",
        selector: "#outfit-stack-panel",
    },
    {
        title: "Your Wardrobe",
        text: "Select items from our default wardrobe or upload your own to try them on your model.",
        selector: "#wardrobe-panel",
    },
    {
        title: "Change Pose",
        text: "See your outfit from different angles. Hover over the main image to reveal the pose controls.",
        selector: "#pose-controls",
    },
    {
        title: "AI Stylist (Pro)",
        text: "Click here to get AI-powered style tips and a color palette for your current look.",
        selector: "#stylist-button",
    },
    {
        title: "AI Scene (Pro)",
        text: "You can also change the entire background scene with a simple text prompt. Find it in the pose controls.",
        selector: "#scene-controls",
    },
    {
        title: "You're all set!",
        text: "Enjoy creating your perfect look. You can start over any time with the button in the top left.",
        selector: null,
    }
];

const Tutorial: React.FC<TutorialProps> = ({ onFinish }) => {
    const [step, setStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const currentStep = tutorialSteps[step];
    
    useEffect(() => {
        const updatePosition = () => {
            // Clear previous highlights first
            document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
            
            if (currentStep.selector) {
                const element = document.querySelector(currentStep.selector);
                if (element) {
                    setTargetRect(element.getBoundingClientRect());
                    // Highlight the element
                    element.classList.add('tutorial-highlight');
                }
            } else {
                setTargetRect(null);
            }
        };

        // A small delay to allow UI to settle before calculating position
        const timer = setTimeout(updatePosition, 100);
        window.addEventListener('resize', updatePosition);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
            document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        };
    }, [step, currentStep.selector]);


    const handleNext = () => {
        if (step < tutorialSteps.length - 1) {
            setStep(step + 1);
        } else {
            onFinish();
        }
    };

    const getTooltipPosition = () => {
        if (!targetRect) return {};
        
        const tooltipHeight = tooltipRef.current?.offsetHeight || 150;
        const tooltipWidth = tooltipRef.current?.offsetWidth || 320;

        let top = targetRect.bottom + 16;
        let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        
        // Adjust if it goes off-screen vertically
        if (top + tooltipHeight > window.innerHeight - 16) {
            top = targetRect.top - tooltipHeight - 16;
        }

        // Adjust if it goes off-screen horizontally
        if (left < 16) left = 16;
        if (left + tooltipWidth > window.innerWidth - 16) {
            left = window.innerWidth - tooltipWidth - 16;
        }
        
        return { top, left };
    }
    

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onFinish}
            />
            <AnimatePresence>
                <motion.div
                    key={step}
                    ref={tooltipRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={targetRect ? getTooltipPosition() : {}}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        "absolute p-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-80 max-w-[calc(100vw-2rem)] border border-gray-200 dark:border-gray-700",
                        !targetRect && "m-4" // Margin for the centered, non-targeted tooltips
                    )}
                >
                    <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">{currentStep.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{currentStep.text}</p>
                    <div className="mt-6 flex items-center justify-between">
                        <button onClick={onFinish} className="text-sm text-gray-500 hover:underline">Skip Tutorial</button>
                        <button 
                            onClick={handleNext} 
                            className="px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 font-semibold rounded-md hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
                        >
                            {step === tutorialSteps.length - 1 ? "Finish" : "Next"}
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
            <style>{`
                .tutorial-highlight {
                    box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.7);
                    border-radius: 0.5rem;
                    transition: box-shadow 0.3s ease-in-out;
                    z-index: 101;
                    position: relative;
                }
            `}</style>
        </div>
    );
};

export default Tutorial;