/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, ShirtIcon } from './icons';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {

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
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm flex flex-col items-center shadow-2xl border border-gray-200 dark:border-gray-700 p-8 text-center"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Close"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                        
                        <div className="inline-block p-3 bg-gray-100 dark:bg-gray-700/50 rounded-full mb-4">
                            <ShirtIcon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">
                            Support the Developer
                        </h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">
                            If you enjoy using Fit Check, please consider supporting its development. Your contribution helps keep the app running and free for everyone.
                        </p>

                        <div className="mt-6 w-full">
                           <a 
                                href="https://www.paypal.com/ncp/payment/UF2EMD8VRUXJ8"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full max-w-[250px] text-center bg-[#0070ba] text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 ease-in-out hover:bg-[#005ea6] active:scale-95 text-base"
                            >
                                Support with PayPal
                            </a>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SupportModal;