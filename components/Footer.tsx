/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface FooterProps {
    onShowLegal: (content: 'privacy' | 'terms' | 'support') => void;
}

const Footer: React.FC<FooterProps> = ({ onShowLegal }) => {
    const handleFeedbackClick = () => {
        window.location.href = "mailto:myx2ytools@gmail.com?subject=Feedback for Fit Check App";
    };

    return (
        <footer className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200/80 dark:border-gray-800/80">
            <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs text-gray-600 dark:text-gray-400">
                <button
                    onClick={() => onShowLegal('support')}
                    className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline transition-colors font-semibold"
                >
                    Support Developer
                </button>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <button
                    onClick={handleFeedbackClick}
                    className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline transition-colors"
                >
                    Send Feedback
                </button>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <button
                    onClick={() => onShowLegal('privacy')}
                    className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline transition-colors"
                >
                    Privacy Policy
                </button>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <button
                    onClick={() => onShowLegal('terms')}
                    className="hover:text-gray-900 dark:hover:text-gray-200 hover:underline transition-colors"
                >
                    Terms of Service
                </button>
            </div>
        </footer>
    );
};

export default Footer;