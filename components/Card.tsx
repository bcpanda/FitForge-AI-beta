
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-brand-light-dark rounded-xl shadow-lg overflow-hidden border border-gray-700
                  hover:shadow-brand-lime/20 hover:border-brand-lime/50 transition-all duration-300 flex flex-col ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
