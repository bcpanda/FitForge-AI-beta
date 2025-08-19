import React, { useState } from 'react';
import { SUPPLEMENTS } from '../constants';
import type { Product } from '../types';
import Card from './Card';
import { ShoppingCartIcon } from './icons';
import AdBanner from './AdBanner';

const SupplementStore: React.FC = () => {
  const [notification, setNotification] = useState<string | null>(null);

  const handleAddToCart = (product: Product) => {
    setNotification(`${product.name} added to cart!`);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-4 text-center">Supplement Store</h2>
      <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">Your one-stop shop for high-quality supplements to fuel your fitness journey.</p>
      
      <AdBanner
        title="15% Off All Fitness Apparel"
        description="Look good, feel good. Shop our new collection of high-performance workout gear."
        imageUrl="https://picsum.photos/seed/ad-apparel/400/300"
        callToAction="Shop Now"
        adUrl="#"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {SUPPLEMENTS.map((product) => (
          <Card key={product.id}>
            <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-t-lg" />
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-gray-400 mb-4 flex-grow">{product.description}</p>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-2xl font-extrabold text-brand-lime">${product.price.toFixed(2)}</span>
                <button 
                  onClick={() => handleAddToCart(product)}
                  className="bg-brand-lime text-brand-dark font-bold py-2 px-4 rounded-lg hover:bg-lime-500 transition-colors flex items-center"
                >
                  <ShoppingCartIcon />
                  <span className="ml-2">Add to Cart</span>
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {notification && (
        <div className="fixed bottom-10 right-10 bg-green-500 text-white py-3 px-6 rounded-lg shadow-lg animate-bounce">
          {notification}
        </div>
      )}
    </div>
  );
};

export default SupplementStore;