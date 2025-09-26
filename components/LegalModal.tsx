/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from './icons';

interface LegalModalProps {
    content: 'privacy' | 'terms' | null;
    onClose: () => void;
}

const PrivacyPolicyContent: React.FC = () => (
    <>
        <h2 className="text-2xl font-serif font-bold mb-4">Privacy Policy</h2>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <p>This is a placeholder for your Privacy Policy. In a real application, you would detail how you collect, use, and protect user data.</p>
            <p><strong>Data Collection:</strong> We collect images you upload solely for the purpose of generating virtual try-on results. We do not store your images after the session ends.</p>
            <p><strong>Data Usage:</strong> Your images are processed by the x2y tools api to create fashion models and apply garments. They are not used for any other purpose.</p>
            <p><strong>Third-Party Services:</strong> This app uses x2y tools api. Their privacy policy may also apply.</p>
            <p><strong>Contact:</strong> For any privacy concerns, please contact us via the feedback button.</p>
        </div>
    </>
);

const TermsOfServiceContent: React.FC = () => (
     <>
        <h2 className="text-2xl font-serif font-bold mb-4">Terms of Service</h2>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <p>This is a placeholder for your Terms of Service. This is where you would outline the rules and agreements for using your application.</p>
            <p><strong>User Conduct:</strong> You agree not to use this service to create harmful, offensive, or illegal content. Users are responsible for the images they upload.</p>
            <p><strong>Intellectual Property:</strong> You retain all rights to the images you upload. You grant us a temporary license to process them as required to provide the service.</p>
            <p><strong>Disclaimer:</strong> This service is provided "as is". We make no warranties regarding the accuracy or reliability of the AI-generated images.</p>
            <p><strong>Changes to Terms:</strong> We may update these terms from time to time. Continued use of the service constitutes acceptance of the new terms.</p>
        </div>
    </>
);

const LegalModal: React.FC<LegalModalProps> = ({ content, onClose }) => {
    return (
        <AnimatePresence>
            {content && (
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
                        className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                             <div className="w-6 h-6"></div> {/* Spacer */}
                             <button
                                onClick={onClose}
                                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Close"
                            >
                                <XIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                           {content === 'privacy' ? <PrivacyPolicyContent /> : <TermsOfServiceContent />}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LegalModal;