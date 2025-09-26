/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { ShirtIcon, MoonIcon, SunIcon } from './icons';

interface HeaderProps {
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
  return (
    <header className="w-full py-4 px-4 md:px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/80 dark:border-gray-800/80">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShirtIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <h1 className="text-2xl font-serif tracking-widest text-gray-800 dark:text-gray-200">
                Fit Check
            </h1>
          </div>
          <button 
            onClick={onToggleTheme}
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
          </button>
      </div>
    </header>
  );
};

export default Header;