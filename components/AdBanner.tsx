import React from 'react';
import { ExternalLinkIcon } from './icons';

interface AdBannerProps {
  title: string;
  description: string;
  imageUrl: string;
  callToAction: string;
  adUrl: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ title, description, imageUrl, callToAction, adUrl }) => {
  return (
    <div className="relative bg-brand-dark rounded-lg overflow-hidden border border-gray-700 my-8">
      <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-70 text-gray-300 text-xs font-semibold px-2 py-1 rounded">
        Ad
      </div>
      <div className="flex flex-col sm:flex-row items-center">
        <img src={imageUrl} alt={title} className="w-full sm:w-1/3 h-40 sm:h-full object-cover" />
        <div className="p-6 flex-grow">
          <h4 className="font-bold text-lg text-white">{title}</h4>
          <p className="text-gray-400 text-sm mt-1 mb-4">{description}</p>
          <a
            href={adUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors"
          >
            {callToAction}
            <ExternalLinkIcon className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
