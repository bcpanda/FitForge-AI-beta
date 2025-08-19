
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FitnessTracker from './components/FitnessTracker';
import SupplementStore from './components/SupplementStore';
import WelcomeModal from './components/WelcomeModal';
import type { View } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('tracker');
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [uiOpacity, setUiOpacity] = useState<number>(100); // Default to 100% opaque
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('fitforge_has_seen_welcome');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }

    const savedWallpaper = localStorage.getItem('customWallpaper');
    if (savedWallpaper) {
      setWallpaper(savedWallpaper);
    }
    const savedOpacity = localStorage.getItem('uiOpacity');
    if (savedOpacity) {
      setUiOpacity(parseInt(savedOpacity, 10));
    }
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('fitforge_has_seen_welcome', 'true');
  };

  const handleWallpaperChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        localStorage.setItem('customWallpaper', base64String);
        setWallpaper(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveWallpaper = () => {
    localStorage.removeItem('customWallpaper');
    setWallpaper(null);
  };
  
  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseInt(event.target.value, 10);
    setUiOpacity(newOpacity);
    localStorage.setItem('uiOpacity', newOpacity.toString());
  };


  return (
    <div className="min-h-screen font-sans">
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
      <div 
        className="fixed inset-0 z-[-1] bg-brand-super-dark bg-cover bg-center transition-all duration-500"
        style={{ backgroundImage: wallpaper ? `url(${wallpaper})` : 'none' }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      </div>
      
      <div className="text-gray-200">
        <Header 
          activeView={activeView} 
          setActiveView={setActiveView}
          onWallpaperChange={handleWallpaperChange}
          onRemoveWallpaper={handleRemoveWallpaper}
          uiOpacity={uiOpacity}
          onOpacityChange={handleOpacityChange}
        />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'tracker' && <FitnessTracker uiOpacity={uiOpacity} />}
            {activeView === 'store' && <SupplementStore />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
