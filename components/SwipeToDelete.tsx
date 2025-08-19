import React, { useState, useRef, ReactNode } from 'react';
import { TrashIcon } from './icons';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  threshold?: number;
}

const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({ children, onDelete, threshold = 0.3 }) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  const getClientX = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    return 'touches' in e ? e.touches[0].clientX : e.clientX;
  };

  const setItemTransition = (duration: number) => {
    if (itemRef.current) {
      itemRef.current.style.transition = `transform ${duration}ms ease-out`;
    }
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isAnimating.current || ('button' in e && e.button !== 0)) return; // Ignore right-clicks
    
    setStartX(getClientX(e));
    setIsSwiping(true);
    setItemTransition(0); // Remove transition while dragging
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping) return;
    const clientX = getClientX(e);
    const deltaX = clientX - startX;
    
    // Only allow swiping left and provide some resistance
    if (deltaX < 0) {
      setCurrentX(deltaX);
    }
  };

  const handleEnd = () => {
    if (!isSwiping) return;

    isAnimating.current = true;
    setItemTransition(300);

    const itemWidth = itemRef.current?.offsetWidth || 0;
    const deleteThreshold = itemWidth * threshold;
    
    if (Math.abs(currentX) > deleteThreshold) {
      // Animate out and delete
      if (itemRef.current) {
        itemRef.current.style.transform = `translateX(-100%)`;
      }
      setTimeout(() => {
        onDelete();
        // State reset isn't strictly necessary as component will likely unmount,
        // but it's good practice.
        resetSwipeState(false); 
        isAnimating.current = false;
      }, 300);
    } else {
      // Snap back
      resetSwipeState(true);
      setTimeout(() => {
        isAnimating.current = false;
      }, 300);
    }
  };
  
  const resetSwipeState = (withAnimation: boolean) => {
    if (withAnimation) {
      setItemTransition(300);
    }
    if (itemRef.current) {
      itemRef.current.style.transform = 'translateX(0)';
    }
    setIsSwiping(false);
    setStartX(0);
    setCurrentX(0);
  };

  // Add mouse event listeners for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e as unknown as React.MouseEvent);
  };

  const handleMouseUp = () => {
    handleEnd();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
  
  const itemWidth = itemRef.current?.offsetWidth || 1;
  const opacity = Math.min(1, Math.abs(currentX) / (itemWidth * threshold));

  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      <div 
        className="absolute inset-0 flex justify-end items-center bg-red-600 pr-6" 
        style={{ opacity }}
        aria-hidden="true"
      >
        <TrashIcon className="text-white h-6 w-6" />
      </div>
      <div
        ref={itemRef}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleMouseDown}
        style={{ transform: `translateX(${currentX}px)`, touchAction: 'pan-y' }}
        className="relative z-10 w-full"
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeToDelete;
