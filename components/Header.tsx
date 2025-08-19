
import React, { useState, useRef, useEffect } from 'react';
import type { View } from '../types';
import { DumbbellIcon, StoreIcon, ImageIcon, SlidersHorizontalIcon } from './icons';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
  onWallpaperChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveWallpaper: () => void;
  uiOpacity: number;
  onOpacityChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onWallpaperChange, onRemoveWallpaper, uiOpacity, onOpacityChange }) => {
  const navItems = [
    { id: 'tracker', label: 'Tracker', icon: <DumbbellIcon /> },
    { id: 'store', label: 'Store', icon: <StoreIcon /> },
  ];

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomizeClick = () => {
    fileInputRef.current?.click();
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-brand-dark/50 backdrop-blur-md sticky top-0 z-10 shadow-lg shadow-brand-super-dark/50 border-b border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <DumbbellIcon className="h-8 w-8 text-brand-lime" />
            <h1 className="text-2xl sm:text-3xl font-bold ml-3 text-white">FitForge AI</h1>
            <span className="ml-2 mt-1 text-xs font-mono bg-gray-700 text-brand-lime px-2 py-0.5 rounded-full">BETA</span>
          </div>
          <div className="flex items-center gap-2">
            <nav className="bg-brand-light-dark p-1 rounded-lg flex">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as View)}
                  className={`flex items-center justify-center px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-dark focus:ring-brand-lime
                    ${
                      activeView === item.id
                        ? 'bg-brand-lime text-brand-dark shadow'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-3 bg-brand-light-dark text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                aria-label="Customize appearance"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right bg-brand-super-dark rounded-md shadow-lg ring-1 ring-gray-700 z-20">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleCustomizeClick(); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-dark" role="menuitem">
                      Change Wallpaper
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); onRemoveWallpaper(); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-dark" role="menuitem">
                      Remove Wallpaper
                    </a>
                    <div className="border-t border-gray-700 my-1"></div>
                    <div className="px-4 py-2" role="none">
                      <label htmlFor="opacity-slider" className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                        <SlidersHorizontalIcon className="h-4 w-4" />
                        UI Transparency
                      </label>
                      <input
                        id="opacity-slider"
                        type="range"
                        min="20"
                        max="100"
                        value={uiOpacity}
                        onChange={onOpacityChange}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-lime"
                        aria-label="UI Transparency"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onWallpaperChange}
              className="hidden"
              accept="image/png, image/jpeg, image/gif, image/webp"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
