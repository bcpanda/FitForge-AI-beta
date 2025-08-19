
import React, { useState } from 'react';
import { SparklesIcon, DumbbellIcon, TargetIcon, ImageIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon } from './icons';

interface WelcomeModalProps {
  onClose: () => void;
}

const tourSteps = [
  {
    icon: <SparklesIcon className="h-12 w-12 text-brand-lime" />,
    title: 'AI Workout Assistant',
    description: 'Generate personalized workout plans from a simple text prompt, a PDF file, or even a YouTube video.',
  },
  {
    icon: <DumbbellIcon className="h-12 w-12 text-brand-lime" />,
    title: 'Track Your Progress',
    description: "Log your sets and reps in the 'Current Workout' panel. Finished workouts are saved to your log for easy review and progress tracking.",
  },
  {
    icon: <TargetIcon className="h-12 w-12 text-brand-lime" />,
    title: 'Build Healthy Habits',
    description: 'Take on daily lifestyle challenges to build consistency beyond the gym. Customize, add notes, and track your goals.',
  },
  {
    icon: <ImageIcon className="h-12 w-12 text-brand-lime" />,
    title: 'Make It Yours',
    description: "Customize the app's appearance by changing the wallpaper and UI transparency. Find these options in the top-right menu.",
  },
];

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentTourStep = tourSteps[currentStep];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="bg-brand-light-dark border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md text-center p-8 flex flex-col items-center">
        <DumbbellIcon className="h-10 w-10 text-brand-lime mb-4" />
        <h2 id="welcome-title" className="text-3xl font-bold text-white mb-2">Welcome to FitForge AI!</h2>
        <p className="text-gray-400 mb-8">Your personal fitness companion. Here's a quick tour:</p>

        <div className="flex flex-col items-center w-full min-h-[180px]">
          <div className="mb-4">{currentTourStep.icon}</div>
          <h3 className="text-2xl font-semibold text-brand-lime mb-2">{currentTourStep.title}</h3>
          <p className="text-gray-300">{currentTourStep.description}</p>
        </div>
        
        <div className="flex justify-center items-center my-6 gap-3">
            {tourSteps.map((_, index) => (
                <div 
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${index === currentStep ? 'bg-brand-lime w-6' : 'bg-gray-600'}`}
                />
            ))}
        </div>

        <div className="flex justify-between items-center w-full mt-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous step"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back
          </button>

          {currentStep === tourSteps.length - 1 ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2 bg-brand-lime hover:bg-lime-500 rounded-lg font-bold text-brand-dark transition-colors shadow-lg"
              aria-label="Get started"
            >
              Get Started! <CheckIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-brand-lime hover:bg-lime-500 rounded-lg font-bold text-brand-dark transition-colors"
              aria-label="Next step"
            >
              Next <ArrowRightIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
