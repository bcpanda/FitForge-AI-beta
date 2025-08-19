import React, { useState, useEffect } from 'react';
import { IosShareIcon } from './icons';

const AddToHomeScreenPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user is on an iOS device
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if the app is in standalone mode (already on the homescreen)
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    // Check if the prompt was already dismissed
    const hasDismissed = localStorage.getItem('dismissed-pwa-prompt-ios');

    if (isIos && !isInStandaloneMode && !hasDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('dismissed-pwa-prompt-ios', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 flex justify-center animate-fade-in-up">
      <div 
        className="bg-brand-light-dark/80 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-4 text-center text-white relative"
        role="dialog"
        aria-live="polite"
        aria-labelledby="pwa-prompt-title"
      >
        <button 
          onClick={handleDismiss} 
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white rounded-full bg-black/20 hover:bg-black/40 transition-colors"
          aria-label="Close instruction"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <p id="pwa-prompt-title" className="font-semibold mb-2">Install FitForge AI</p>
        <p className="text-sm text-gray-300">
          For the best experience, add this app to your Home Screen. Tap the <IosShareIcon className="inline-block h-5 w-5 mx-1" /> icon and then select 'Add to Home Screen'.
        </p>
      </div>
       <style>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AddToHomeScreenPrompt;
