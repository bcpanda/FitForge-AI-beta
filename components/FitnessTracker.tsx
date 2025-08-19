import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Exercise, WorkoutSession, FavoriteWorkout, WorkoutSource } from '../types';
import { generateWorkoutPlan, generateWorkoutPlanFromPdf, generateWorkoutPlanFromVideoUrl, getYouTubeVideoDetails, generateWorkoutPlanFromImage } from '../services/geminiService';
import { PlusIcon, TrashIcon, SparklesIcon, DumbbellIcon, CheckIcon, FileUpIcon, YouTubeIcon, EyeIcon, LoaderIcon, PencilIcon, PictureIcon, ArchiveIcon, UnarchiveIcon, ChevronDownIcon, StarIcon, PlayIcon, DownloadIcon, FileTextIcon, MicIcon } from './icons';
import AdBanner from './AdBanner';
import PdfViewer from './PdfViewer';
import SwipeToDelete from './SwipeToDelete';
import LifestyleChallenges from './LifestyleChallenges';

// Define a minimal interface for the Web Speech API to fix TypeScript errors.
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: () => void;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
  start: () => void;
  stop: () => void;
}

// Define helper components outside the main component to prevent re-renders.
interface WorkoutGeneratorProps {
  onPlanGenerated: (exercises: Exercise[], source?: { type: 'pdf' | 'youtube' | 'picture'; data: File | string }) => void;
  setIsGeneratingPlan: React.Dispatch<React.SetStateAction<boolean>>;
}

const WorkoutGenerator: React.FC<WorkoutGeneratorProps> = ({ onPlanGenerated, setIsGeneratingPlan }) => {
  const [mode, setMode] = useState<'prompt' | 'pdf' | 'youtube' | 'picture'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcribe, setTranscribe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSourceType, setPreviewSourceType] = useState<'pdf' | 'youtube' | 'picture' | null>(null);
  const [previewYoutubeUrl, setPreviewYoutubeUrl] = useState<string | null>(null);
  const [videoDetails, setVideoDetails] = useState<{ title: string; channel: string; description: string; } | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const [showManualExtractor, setShowManualExtractor] = useState(false);
  const [manualExercises, setManualExercises] = useState<Exercise[]>([]);
  const [currentManualExercise, setCurrentManualExercise] = useState({ name: '', sets: 1, reps: '' });

  const handleApiResponse = (plan: any, source?: { type: 'pdf' | 'youtube' | 'picture'; data: File | string }) => {
    if (plan && plan.workout && plan.workout.length > 0) {
      const formattedExercises: Exercise[] = plan.workout.map((ex: any) => ({
        name: ex.exerciseName,
        sets: Array(ex.sets).fill(null).map(() => ({ reps: 0, targetReps: ex.reps })),
      }));
      onPlanGenerated(formattedExercises, source);
    } else {
      throw new Error('Could not find a valid workout plan in the AI response.');
    }
  };
  
  const handlePreview = async () => {
    setError(null);
    if (mode === 'pdf' && file) {
      setPreviewSourceType('pdf');
      setIsPreviewing(true);
    } else if (mode === 'picture' && file) {
      setPreviewSourceType('picture');
      setIsPreviewing(true);
    } else if (mode === 'youtube' && youtubeUrl.trim()) {
        setPreviewSourceType('youtube');
        setIsPreviewing(true);
        setIsFetchingDetails(true);
        setVideoDetails(null);
        setError(null);

        try {
            const videoIdMatch = youtubeUrl.match(/(?:v=|\/embed\/|\.be\/)([\w-]{11})/);
            const videoId = videoIdMatch ? videoIdMatch[1] : null;

            if (!videoId) {
                throw new Error("Please enter a valid YouTube video URL to preview.");
            }
            
            setPreviewYoutubeUrl(`https://www.youtube.com/embed/${videoId}`);
            
            const details = await getYouTubeVideoDetails(youtubeUrl);
            setVideoDetails(details);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            setVideoDetails(null); 
        } finally {
            setIsFetchingDetails(false);
        }
    }
  };

  const handleClosePreview = () => {
      setIsPreviewing(false);
      setPreviewSourceType(null);
      setPreviewYoutubeUrl(null);
      setVideoDetails(null);
      setIsFetchingDetails(false);
  };

  const handlePromptGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter your fitness goal.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const plan = await generateWorkoutPlan(prompt);
      handleApiResponse(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfImport = async () => {
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setShowManualExtractor(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });
      const plan = await generateWorkoutPlanFromPdf(base64, transcribe);
      
      if (plan && plan.workout && plan.workout.length > 0) {
        handleApiResponse(plan, { type: 'pdf', data: file });
      } else {
        setError('AI failed to find a workout. Please review the document and add exercises manually.');
        setShowManualExtractor(true);
      }

    } catch (err) {
      setError(err instanceof Error ? `${err.message} Please add exercises manually.` : 'An unknown error occurred. Please add exercises manually.');
      setShowManualExtractor(true);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePictureImport = async () => {
    if (!file) {
      setError('Please select an image file.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setShowManualExtractor(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });
      const plan = await generateWorkoutPlanFromImage(base64, file.type, transcribe);
      
      if (plan && plan.workout && plan.workout.length > 0) {
        handleApiResponse(plan, { type: 'picture', data: file });
      } else {
        setError('AI failed to find a workout. Please review the image and add exercises manually.');
        setShowManualExtractor(true);
      }

    } catch (err) {
      setError(err instanceof Error ? `${err.message} Please add exercises manually.` : 'An unknown error occurred. Please add exercises manually.');
      setShowManualExtractor(true);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleYouTubeGenerate = async () => {
    if (!youtubeUrl.trim() || !youtubeUrl.includes('youtube.com')) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const plan = await generateWorkoutPlanFromVideoUrl(youtubeUrl, transcribe);
      handleApiResponse(plan, { type: 'youtube', data: youtubeUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddManualExercise = () => {
    if (!currentManualExercise.name.trim() || !currentManualExercise.reps.trim() || currentManualExercise.sets < 1) {
      return; // Basic validation
    }
    const newExercise: Exercise = {
      name: currentManualExercise.name,
      sets: Array(currentManualExercise.sets).fill(null).map(() => ({ reps: 0, targetReps: currentManualExercise.reps })),
    };
    setManualExercises([...manualExercises, newExercise]);
    setCurrentManualExercise({ name: '', sets: 1, reps: '' }); // Reset form
  };
  
  const handleRemoveManualExercise = (index: number) => {
    setManualExercises(manualExercises.filter((_, i) => i !== index));
  };
  
  const handleFinishManualExtraction = () => {
    if (!file) return;
    const sourceType = mode as 'pdf' | 'picture';
    onPlanGenerated(manualExercises, { type: sourceType, data: file });
  };


  const handleGenerate = () => {
    switch (mode) {
        case 'prompt':
            handlePromptGenerate();
            break;
        case 'pdf':
            handlePdfImport();
            break;
        case 'picture':
            handlePictureImport();
            break;
        case 'youtube':
            handleYouTubeGenerate();
            break;
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    switch (mode) {
        case 'prompt': return 'Generate Plan';
        case 'pdf': return 'Import & Generate';
        case 'picture': return 'Import & Generate';
        case 'youtube': return 'Analyze & Generate';
        default: return 'Generate';
    }
  };
  
  const handleModeChange = (newMode: 'prompt' | 'pdf' | 'youtube' | 'picture') => {
    setMode(newMode);
    setError(null);
    setShowManualExtractor(false);
    setFile(null);
    setTranscribe(false);
  };
  
  const TranscriptionToggle = () => (
    <div className="mt-4">
      <label htmlFor="transcribe-toggle" className="flex items-center cursor-pointer">
        <div className="relative">
          <input 
            id="transcribe-toggle" 
            type="checkbox" 
            className="sr-only peer" 
            checked={transcribe} 
            onChange={() => setTranscribe(!transcribe)} 
          />
          <div className="block bg-brand-dark border border-gray-600 w-14 h-8 rounded-full peer-checked:bg-brand-lime/50 peer-checked:border-brand-lime"></div>
          <div className="dot absolute left-1 top-1 bg-gray-400 w-6 h-6 rounded-full transition-transform peer-checked:transform peer-checked:translate-x-6 peer-checked:bg-brand-lime"></div>
        </div>
        <div className="ml-3 text-white">
          <p className="font-semibold">Transcribe exact workout</p>
          <p className="text-xs text-gray-400">{transcribe ? 'Extracts the workout as-is from the source.' : 'AI will generate a new, structured plan.'}</p>
        </div>
      </label>
    </div>
  );

  return (
    <>
      {isPreviewing && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4" onClick={handleClosePreview}>
              <div className="bg-brand-light-dark p-4 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] border border-gray-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-white">
                          {previewSourceType === 'pdf' ? 'PDF Preview' : previewSourceType === 'picture' ? 'Image Preview' : 'YouTube Preview'}
                      </h3>
                      <button onClick={handleClosePreview} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors">&times;</button>
                  </div>
                  <div className="flex-grow bg-brand-dark rounded-lg overflow-hidden flex items-center justify-center">
                    {previewSourceType === 'pdf' && file ? (
                        <PdfViewer file={file} />
                    ) : previewSourceType === 'picture' && file ? (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <img src={URL.createObjectURL(file)} alt="Workout preview" className="max-w-full max-h-full object-contain rounded-lg" />
                        </div>
                    ) : previewSourceType === 'youtube' ? (
                        <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-4">
                            {isFetchingDetails ? (
                                <div className="flex flex-col items-center justify-center w-full h-full text-white">
                                    <LoaderIcon className="w-12 h-12 mb-4" />
                                    <p className="text-lg font-semibold">Fetching Video Details...</p>
                                </div>
                            ) : videoDetails && previewYoutubeUrl ? (
                                <>
                                    <div className="w-full lg:w-2/3 h-64 lg:h-full flex-shrink-0 bg-black rounded-md">
                                        <iframe 
                                            src={previewYoutubeUrl}
                                            title="YouTube Video Preview"
                                            width="100%"
                                            height="100%"
                                            className="border-0 rounded-md"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                    <div className="w-full lg:w-1/3 flex-grow overflow-y-auto text-white pr-2">
                                        <h4 className="text-xl font-bold text-brand-lime mb-2">{videoDetails.title}</h4>
                                        <p className="text-sm font-semibold text-gray-300 mb-4">Channel: {videoDetails.channel}</p>
                                        <p className="text-gray-400 text-sm whitespace-pre-wrap">{videoDetails.description}</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full text-red-400">
                                    <p className="text-lg font-semibold">Could not load preview</p>
                                    {error && <p className="text-sm mt-2 text-center">{error}</p>}
                                </div>
                            )}
                        </div>
                    ) : null }
                  </div>
              </div>
          </div>
      )}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className={`bg-brand-light-dark p-6 rounded-xl shadow-2xl w-full border border-gray-700 ${showManualExtractor ? 'max-w-6xl' : 'max-w-lg'}`}>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <SparklesIcon className="text-brand-lime mr-2" />
            AI Workout Assistant
          </h2>

          {!showManualExtractor && (
            <div className="border-b border-gray-600 mb-4 flex space-x-1 flex-wrap">
              <button onClick={() => handleModeChange('prompt')} className={`px-3 py-2 text-sm font-semibold rounded-t-md transition-colors ${mode === 'prompt' ? 'text-brand-lime border-b-2 border-brand-lime' : 'text-gray-400 hover:text-white'}`}>
                Generate with AI
              </button>
              <button onClick={() => handleModeChange('pdf')} className={`px-3 py-2 text-sm font-semibold rounded-t-md transition-colors ${mode === 'pdf' ? 'text-brand-lime border-b-2 border-brand-lime' : 'text-gray-400 hover:text-white'}`}>
                Import from PDF
              </button>
              <button onClick={() => handleModeChange('picture')} className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-t-md transition-colors ${mode === 'picture' ? 'text-brand-lime border-b-2 border-brand-lime' : 'text-gray-400 hover:text-white'}`}>
                <PictureIcon className="h-5 w-5" />
                Import from Picture
              </button>
              <button onClick={() => handleModeChange('youtube')} className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-t-md transition-colors ${mode === 'youtube' ? 'text-brand-lime border-b-2 border-brand-lime' : 'text-gray-400 hover:text-white'}`}>
                <YouTubeIcon className="h-5 w-5" />
                Import from YouTube
              </button>
            </div>
          )}
          
          {mode === 'prompt' && !showManualExtractor && (
            <div>
              <p className="text-gray-400 mb-4">Describe your fitness goal. e.g., "A 3-day workout plan for building muscle at home with dumbbells."</p>
              <textarea
                  className="w-full p-3 bg-brand-dark border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-brand-lime focus:outline-none"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., build muscle, lose weight..."
              />
            </div>
          )}
          
          {showManualExtractor && file ? (
             <div>
              <p className="text-yellow-400 bg-yellow-900/50 p-3 rounded-lg mb-4 text-sm font-semibold">{error}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[65vh]">
                <div className="border border-gray-600 rounded-lg overflow-hidden bg-brand-dark">
                  {mode === 'pdf' ? (
                    <PdfViewer file={file} />
                   ) : mode === 'picture' ? (
                    <div className="w-full h-full flex items-center justify-center p-2 bg-brand-super-dark">
                      <img src={URL.createObjectURL(file)} alt="Workout to extract from" className="max-w-full max-h-full object-contain rounded-lg"/>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-4">
                   <div className="bg-brand-dark p-4 rounded-lg border border-gray-600">
                      <h3 className="text-lg font-semibold text-white mb-2">Add Exercise</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Exercise Name"
                          value={currentManualExercise.name}
                          onChange={(e) => setCurrentManualExercise({...currentManualExercise, name: e.target.value})}
                          className="sm:col-span-3 p-2 bg-brand-super-dark border border-gray-500 rounded-md text-white focus:ring-1 focus:ring-brand-lime focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Sets"
                          min="1"
                          value={currentManualExercise.sets}
                          onChange={(e) => setCurrentManualExercise({...currentManualExercise, sets: parseInt(e.target.value) || 1})}
                          className="p-2 bg-brand-super-dark border border-gray-500 rounded-md text-white focus:ring-1 focus:ring-brand-lime focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Reps (e.g., 8-12)"
                          value={currentManualExercise.reps}
                          onChange={(e) => setCurrentManualExercise({...currentManualExercise, reps: e.target.value})}
                          className="sm:col-span-2 p-2 bg-brand-super-dark border border-gray-500 rounded-md text-white focus:ring-1 focus:ring-brand-lime focus:outline-none"
                        />
                      </div>
                      <button onClick={handleAddManualExercise} className="mt-3 w-full py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors flex items-center justify-center">
                          <PlusIcon /><span className="ml-2">Add to List</span>
                      </button>
                    </div>
                    <div className="flex-grow bg-brand-dark p-4 rounded-lg border border-gray-600 overflow-y-auto">
                        <h3 className="text-lg font-semibold text-white mb-2">Workout List ({manualExercises.length})</h3>
                        <div className="space-y-2">
                            {manualExercises.map((ex, index) => (
                                <div key={index} className="flex justify-between items-center bg-brand-super-dark p-2 rounded-md">
                                    <p className="text-white">{ex.name} <span className="text-gray-400">({ex.sets.length} sets x {ex.sets[0].targetReps} reps)</span></p>
                                    <button onClick={() => handleRemoveManualExercise(index)} className="text-gray-500 hover:text-red-500"><TrashIcon /></button>
                                </div>
                            ))}
                            {manualExercises.length === 0 && <p className="text-gray-500 text-center py-4">No exercises added yet.</p>}
                        </div>
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {mode === 'pdf' && (
                <div>
                  <p className="text-gray-400 mb-4">Upload a PDF file with your workout plan. The AI will create a trackable session.</p>
                  <div className="bg-brand-dark border-2 border-dashed border-gray-600 rounded-lg hover:border-brand-lime/50 hover:bg-brand-dark/50 transition-colors">
                    <label htmlFor="pdf-upload" className={`w-full flex flex-col items-center justify-center p-6 cursor-pointer ${file ? 'hidden' : ''}`}>
                      <FileUpIcon className="text-gray-400 h-8 w-8 mb-2" />
                      <span className="text-white font-semibold">Click to upload PDF</span>
                      <span className="text-xs text-gray-500 mt-1">Max 10MB</span>
                    </label>
                    {file && (
                      <div className="p-4 flex flex-col sm:flex-row items-center justify-between">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <FileUpIcon className="text-brand-lime h-6 w-6 mr-3 flex-shrink-0" />
                          <p className="text-white truncate pr-4 font-medium" title={file.name}>{file.name}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button onClick={handlePreview} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-brand-lime bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                            <EyeIcon className="h-4 w-4" />
                            Preview
                          </button>
                          <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-500 p-1 rounded-full">
                             <TrashIcon />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <input id="pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
                  <TranscriptionToggle />
                </div>
              )}

              {mode === 'picture' && (
                <div>
                  <p className="text-gray-400 mb-4">Upload an image file (PNG, JPG) with your workout plan. The AI will create a trackable session.</p>
                  <div className="bg-brand-dark border-2 border-dashed border-gray-600 rounded-lg hover:border-brand-lime/50 hover:bg-brand-dark/50 transition-colors">
                    <label htmlFor="img-upload" className={`w-full flex flex-col items-center justify-center p-6 cursor-pointer ${file ? 'hidden' : ''}`}>
                      <PictureIcon className="text-gray-400 h-8 w-8 mb-2" />
                      <span className="text-white font-semibold">Click to upload Image</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</span>
                    </label>
                    {file && (
                      <div className="p-4 flex flex-col sm:flex-row items-center justify-between">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <PictureIcon className="text-brand-lime h-6 w-6 mr-3 flex-shrink-0" />
                          <p className="text-white truncate pr-4 font-medium" title={file.name}>{file.name}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button onClick={handlePreview} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-brand-lime bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                            <EyeIcon className="h-4 w-4" />
                            Preview
                          </button>
                          <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-500 p-1 rounded-full">
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <input id="img-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
                  <TranscriptionToggle />
                </div>
              )}

              {mode === 'youtube' && (
                <div>
                  <p className="text-gray-400 mb-4">Paste a link to a YouTube workout video. The AI will analyze it and create a plan.</p>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <YouTubeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="url"
                      className="w-full p-3 pl-10 pr-28 bg-brand-dark border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-brand-lime focus:outline-none"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                     <button 
                        onClick={handlePreview} 
                        disabled={!youtubeUrl.trim() || isFetchingDetails}
                        className="absolute inset-y-0 right-0 my-1.5 mr-1.5 flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-brand-lime bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isFetchingDetails ? <LoaderIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        {isFetchingDetails ? '...' : 'Preview'}
                    </button>
                  </div>
                   <TranscriptionToggle />
                </div>
              )}
            </>
          )}

          {error && !showManualExtractor && !isPreviewing && <p className="text-red-500 mt-2 text-sm">{error}</p>}

          <div className="mt-6 flex justify-end space-x-4">
            <button onClick={() => setIsGeneratingPlan(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors">Cancel</button>
            
            {showManualExtractor ? (
              <button onClick={handleFinishManualExtraction} disabled={manualExercises.length === 0} className="px-4 py-2 bg-brand-lime hover:bg-lime-500 rounded-lg font-bold text-brand-dark transition-colors flex items-center disabled:opacity-50">
                Finish & Add {manualExercises.length} Exercises
              </button>
            ) : (
              <button onClick={handleGenerate} disabled={isLoading} className="px-4 py-2 bg-brand-lime hover:bg-lime-500 rounded-lg font-bold text-brand-dark transition-colors flex items-center disabled:opacity-50">
                {getButtonText()}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

interface FitnessTrackerProps {
  uiOpacity: number;
}

const FitnessTracker: React.FC<FitnessTrackerProps> = ({ uiOpacity }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutLog, setWorkoutLog] = useState<WorkoutSession[]>([]);
  const [archivedWorkoutLog, setArchivedWorkoutLog] = useState<WorkoutSession[]>([]);
  const [favoriteWorkouts, setFavoriteWorkouts] = useState<FavoriteWorkout[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [workoutSource, setWorkoutSource] = useState<{ type: 'pdf' | 'youtube' | 'picture'; data: File | string } | null>(null);
  const [isViewingSource, setIsViewingSource] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null); // For YouTube embed URLs or image object URLs
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const isInitialMountArchive = useRef(true);
  const isInitialMountFavorites = useRef(true);
  const [notification, setNotification] = useState<{ message: string; onUndo?: () => void } | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);
  
  const [isViewingArchive, setIsViewingArchive] = useState(false);
  const [isArchiveMenuOpen, setIsArchiveMenuOpen] = useState(false);
  const archiveMenuRef = useRef<HTMLDivElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [favoriteNameInput, setFavoriteNameInput] = useState('');
  const [sessionToFavorite, setSessionToFavorite] = useState<WorkoutSession | null>(null);
  
  const [editingReps, setEditingReps] = useState<{ exIndex: number; setIndex: number } | null>(null);
  const repInputRef = useRef<HTMLInputElement>(null);

  const [viewingLoggedSource, setViewingLoggedSource] = useState<WorkoutSource | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNewExerciseName(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please allow microphone access in your browser settings to use this feature.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
  }, []);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
        alert("Sorry, your browser doesn't support voice input.");
        return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Could not start recording:", e);
        alert("Could not start voice recognition. Please ensure microphone permissions are granted.");
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
  });

  const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  };


  const showNotification = useCallback((message: string, onUndo?: () => void) => {
    if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
    }
    setNotification({ message, onUndo });
    notificationTimeoutRef.current = window.setTimeout(() => {
        setNotification(null);
    }, 5000); // 5-second timeout
  }, []);
  
  const handleUndo = () => {
    if (notification?.onUndo) {
        notification.onUndo();
    }
    if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (archiveMenuRef.current && !archiveMenuRef.current.contains(event.target as Node)) {
            setIsArchiveMenuOpen(false);
        }
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
            setIsExportMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    if (editingReps && repInputRef.current) {
      repInputRef.current.focus();
      repInputRef.current.select();
    }
  }, [editingReps]);


  // Load data from localStorage on initial component mount
  useEffect(() => {
    try {
      const storedLog = localStorage.getItem('workoutLog');
      if (storedLog) setWorkoutLog(JSON.parse(storedLog));

      const storedArchive = localStorage.getItem('archivedWorkoutLog');
      if (storedArchive) setArchivedWorkoutLog(JSON.parse(storedArchive));

      const storedFavorites = localStorage.getItem('favoriteWorkouts');
      if (storedFavorites) setFavoriteWorkouts(JSON.parse(storedFavorites));

    } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        setWorkoutLog([]);
        setArchivedWorkoutLog([]);
        setFavoriteWorkouts([]);
    }
  }, []);

  // Save workout log to localStorage whenever it changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem('workoutLog', JSON.stringify(workoutLog));
    } catch (error) {
      console.error("Failed to save workout log to localStorage", error);
    }
  }, [workoutLog]);
  
  // Save archived log to localStorage whenever it changes
  useEffect(() => {
    if (isInitialMountArchive.current) {
        isInitialMountArchive.current = false;
        return;
    }
    try {
      localStorage.setItem('archivedWorkoutLog', JSON.stringify(archivedWorkoutLog));
    } catch (error) {
      console.error("Failed to save archived workout log to localStorage", error);
    }
  }, [archivedWorkoutLog]);

  // Save favorite workouts to localStorage whenever they change
  useEffect(() => {
    if (isInitialMountFavorites.current) {
        isInitialMountFavorites.current = false;
        return;
    }
    try {
      localStorage.setItem('favoriteWorkouts', JSON.stringify(favoriteWorkouts));
    } catch (error) {
      console.error("Failed to save favorite workouts to localStorage", error);
    }
  }, [favoriteWorkouts]);

  const handlePlanGenerated = (
    newExercises: Exercise[], 
    source?: { type: 'pdf' | 'youtube' | 'picture'; data: File | string }
  ) => {
    setExercises(newExercises);
    setWorkoutSource(source || null);
    setIsGeneratingPlan(false);
  };
  
  const handleCloseSourceViewer = () => {
    // Revoke object URL if it was created for a picture preview
    if (workoutSource?.type === 'picture' && sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
    setIsViewingSource(false);
    setSourceUrl(null);
  };

  const handleReviewSource = () => {
    if (!workoutSource) return;

    if (workoutSource.type === 'youtube' && typeof workoutSource.data === 'string') {
      const videoIdMatch = workoutSource.data.match(/(?:v=|\/embed\/|\.be\/)([\w-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      if (videoId) {
        setSourceUrl(`https://www.youtube.com/embed/${videoId}`);
      } else {
        // Fallback: open in new tab if ID extraction fails
        window.open(workoutSource.data, '_blank');
        return;
      }
    } else if (workoutSource.type === 'picture' && workoutSource.data instanceof File) {
      setSourceUrl(URL.createObjectURL(workoutSource.data));
    }
    // For PDFs, we don't need to set a URL, we just open the viewer
    setIsViewingSource(true);
  };


  const addExercise = () => {
    if (newExerciseName.trim() && !exercises.some(ex => ex.name === newExerciseName.trim())) {
      setExercises([...exercises, { name: newExerciseName.trim(), sets: [{ reps: 0 }] }]);
      setNewExerciseName('');
    }
  };

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...exercises];
    const lastSet = newExercises[exerciseIndex].sets.slice(-1)[0];
    newExercises[exerciseIndex].sets.push({ reps: 0, targetReps: lastSet?.targetReps });
    setExercises(newExercises);
  };
  
  const handleRepChange = (exerciseIndex: number, setIndex: number, newReps: number) => {
    const newExercises = [...exercises];
    const validatedReps = Math.max(0, isNaN(newReps) ? 0 : newReps);
    newExercises[exerciseIndex].sets[setIndex].reps = validatedReps;
    setExercises(newExercises);
  };

  const removeExercise = useCallback((exerciseIndex: number) => {
    const exerciseToRemove = exercises[exerciseIndex];
    const newExercises = exercises.filter((_, i) => i !== exerciseIndex);
    setExercises(newExercises);

    showNotification('Exercise removed.', () => {
        const restoredExercises = [...newExercises];
        restoredExercises.splice(exerciseIndex, 0, exerciseToRemove);
        setExercises(restoredExercises);
    });
  }, [exercises, showNotification]);
  
  const finishWorkout = async () => {
    if (exercises.length === 0) return;
    
    let sessionSource: WorkoutSource | undefined = undefined;
    if (workoutSource && (workoutSource.type === 'pdf' || workoutSource.type === 'picture') && workoutSource.data instanceof File) {
      const base64Data = await fileToBase64(workoutSource.data);
      sessionSource = {
          type: workoutSource.type,
          data: base64Data,
          name: workoutSource.data.name,
          mimeType: workoutSource.data.type,
      };
    }

    if (editingSessionId) {
      const updatedLog = workoutLog.map(session => 
        session.id === editingSessionId 
          ? { ...session, exercises: exercises, source: session.source } // Keep original source on edit
          : session
      );
      setWorkoutLog(updatedLog);
      setEditingSessionId(null);
    } else {
      const session: WorkoutSession = {
        id: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        exercises: exercises,
        source: sessionSource,
      };
      setWorkoutLog([session, ...workoutLog]);
    }

    setExercises([]);
    setWorkoutSource(null);
  };
  
  const handleStartEditSession = (sessionToEdit: WorkoutSession) => {
    // Deep copy to avoid direct mutation of log state
    const exercisesToEdit = JSON.parse(JSON.stringify(sessionToEdit.exercises));
    setExercises(exercisesToEdit);
    setEditingSessionId(sessionToEdit.id);
  };
  
  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setExercises([]);
  };

  const handleDeleteSession = useCallback((sessionId: string) => {
    const sessionIndex = workoutLog.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;

    const sessionToRemove = workoutLog[sessionIndex];
    const newLog = workoutLog.filter(session => session.id !== sessionId);
    setWorkoutLog(newLog);

    showNotification('Workout session deleted.', () => {
        const restoredLog = [...newLog];
        restoredLog.splice(sessionIndex, 0, sessionToRemove);
        setWorkoutLog(restoredLog);
    });
  }, [workoutLog, showNotification]);

  const handleViewLoggedSource = (source: WorkoutSource) => {
    setViewingLoggedSource(source);
  };


  const clearLog = () => {
    if (window.confirm('Are you sure you want to delete your entire workout history? This action cannot be undone.')) {
      setWorkoutLog([]);
    }
  };
  
  const handleArchive = (period: 'last' | '7d' | '30d') => {
    if (workoutLog.length === 0) {
        showNotification('No workouts to archive.');
        setIsArchiveMenuOpen(false);
        return;
    };

    let sessionsToArchive: WorkoutSession[];
    let sessionsToKeep: WorkoutSession[];

    if (period === 'last') {
        sessionsToArchive = [workoutLog[0]];
        sessionsToKeep = workoutLog.slice(1);
    } else {
        const now = new Date();
        const days = period === '7d' ? 7 : 30;
        const cutoffDate = new Date(new Date().setDate(now.getDate() - days));

        sessionsToArchive = workoutLog.filter(session => new Date(session.id) >= cutoffDate);
        sessionsToKeep = workoutLog.filter(session => new Date(session.id) < cutoffDate);
    }
    
    if (sessionsToArchive.length > 0) {
        setArchivedWorkoutLog(prev => [...sessionsToArchive, ...prev].sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime()));
        setWorkoutLog(sessionsToKeep);
        showNotification(`${sessionsToArchive.length} workout(s) archived.`);
    } else {
        showNotification('No workouts found in the selected period to archive.');
    }
    
    setIsArchiveMenuOpen(false);
  };

  const handleUnarchive = (sessionId: string) => {
    const sessionToUnarchive = archivedWorkoutLog.find(s => s.id === sessionId);
    if (!sessionToUnarchive) return;

    const newArchivedLog = archivedWorkoutLog.filter(s => s.id !== sessionId);
    const newWorkoutLog = [sessionToUnarchive, ...workoutLog].sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());

    setArchivedWorkoutLog(newArchivedLog);
    setWorkoutLog(newWorkoutLog);
    showNotification('Workout unarchived.');
  };

  const handleDeleteArchivedSession = (sessionId: string) => {
    setArchivedWorkoutLog(prev => prev.filter(s => s.id !== sessionId));
    showNotification('Archived workout permanently deleted.');
  };

  const clearArchive = () => {
    if (window.confirm('Are you sure you want to permanently delete all archived workouts? This cannot be undone.')) {
      setArchivedWorkoutLog([]);
    }
  };

  const handleExport = (format: 'csv' | 'txt') => {
    if (archivedWorkoutLog.length === 0) {
      showNotification('No archived workouts to export.');
      return;
    }

    let content = '';
    const fileExtension = format;

    if (format === 'csv') {
      content = 'Date,Exercise,Set,Reps Accomplished,Target Reps\n';
      archivedWorkoutLog.forEach(session => {
        // Add a row for the date to group the exercises under it.
        // This creates a visual hierarchy in spreadsheet software.
        content += `"${session.date.replace(/"/g, '""')}",,,\n`;
        
        session.exercises.forEach(exercise => {
          exercise.sets.forEach((set, setIndex) => {
            const row = [
              '', // Empty cell for date to create the "tabbed" effect
              `"${exercise.name.replace(/"/g, '""')}"`,
              setIndex + 1,
              set.reps,
              `"${(set.targetReps || 'N/A').replace(/"/g, '""')}"`
            ];
            content += row.join(',') + '\n';
          });
        });
        content += '\n'; // Add a blank row for spacing between workout sessions
      });
    } else { // txt
      content = 'FitForge AI - Archived Workout Log\n\n';
      archivedWorkoutLog.forEach((session, sessionIndex) => {
        content += `Workout on: ${session.date}\n`;
        content += '----------------------------------------\n';
        
        session.exercises.forEach(exercise => {
          content += `  ${exercise.name}\n`;
          exercise.sets.forEach((set, setIndex) => {
            content += `    - Set ${setIndex + 1}: ${set.reps} of ${set.targetReps || 'N/A'} reps\n`;
          });
          content += '\n';
        });
        
        if (sessionIndex < archivedWorkoutLog.length - 1) {
            content += '========================================\n\n';
        }
      });
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fitforge-ai-archive-${new Date().toISOString().slice(0, 10)}.${fileExtension}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportMenuOpen(false);
    showNotification(`Archive exported as ${format.toUpperCase()} file.`);
  };
  
  const closeFavoriteModal = () => {
    setIsSavingFavorite(false);
    setFavoriteNameInput('');
    setSessionToFavorite(null);
  };

  const handleSaveFavorite = () => {
    if (!favoriteNameInput.trim()) return;

    // Determine which set of exercises to save: from a logged session or the current workout
    const exercisesToSave = sessionToFavorite 
        ? sessionToFavorite.exercises 
        : exercises;

    if (exercisesToSave.length === 0) {
        showNotification("Cannot save an empty workout.");
        return;
    }

    const newFavorite: FavoriteWorkout = {
      id: new Date().toISOString(),
      name: favoriteNameInput.trim(),
      exercises: JSON.parse(JSON.stringify(exercisesToSave)), // Deep copy is important
    };

    setFavoriteWorkouts(prev => [newFavorite, ...prev]);
    closeFavoriteModal(); // Reset state and close modal
    showNotification(`Workout "${newFavorite.name}" saved to favorites!`);
  };

  const handleInitiateFavoriteSession = (sessionToFav: WorkoutSession) => {
    setSessionToFavorite(sessionToFav);
    setFavoriteNameInput(`Workout from ${sessionToFav.date}`); // Pre-populate name
    setIsSavingFavorite(true);
  };

  const handleLoadFavorite = (favoriteId: string) => {
    const favoriteToLoad = favoriteWorkouts.find(f => f.id === favoriteId);
    if (!favoriteToLoad) return;

    if (exercises.length > 0 && !window.confirm('This will replace your current workout. Are you sure?')) {
        return;
    }
    
    // Deep copy exercises to prevent mutation of the favorite
    setExercises(JSON.parse(JSON.stringify(favoriteToLoad.exercises)));
    setWorkoutSource(null);
    setEditingSessionId(null);
    showNotification(`Loaded "${favoriteToLoad.name}" workout.`);
  };

  const handleDeleteFavorite = useCallback((favoriteId: string) => {
    const favoriteIndex = favoriteWorkouts.findIndex(f => f.id === favoriteId);
    if (favoriteIndex === -1) return;

    const favoriteToRemove = favoriteWorkouts[favoriteIndex];
    const newFavorites = favoriteWorkouts.filter(f => f.id !== favoriteId);
    setFavoriteWorkouts(newFavorites);

    showNotification('Favorite workout deleted.', () => {
        const restoredFavorites = [...newFavorites];
        restoredFavorites.splice(favoriteIndex, 0, favoriteToRemove);
        setFavoriteWorkouts(restoredFavorites);
    });
  }, [favoriteWorkouts, showNotification]);

  const currentLog = isViewingArchive ? archivedWorkoutLog : workoutLog;
  const hasWorkouts = workoutLog.length > 0;
  const hasArchivedWorkouts = archivedWorkoutLog.length > 0;
  
  const backgroundAlpha = uiOpacity / 100;
  // The color #1f2937 is rgb(31, 41, 55)
  const cardStyle = { backgroundColor: `rgba(31, 41, 55, ${backgroundAlpha})` };

  return (
    <>
      {isGeneratingPlan && <WorkoutGenerator onPlanGenerated={handlePlanGenerated} setIsGeneratingPlan={setIsGeneratingPlan} />}
      
      {isSavingFavorite && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-light-dark p-6 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Save Favorite Workout</h3>
                <p className="text-gray-400 mb-4 text-sm">Give this workout a name so you can easily find it later.</p>
                <input
                    type="text"
                    value={favoriteNameInput}
                    onChange={(e) => setFavoriteNameInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveFavorite()}
                    placeholder="e.g., Leg Day, Full Body HIIT"
                    className="w-full p-3 bg-brand-dark border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-brand-lime focus:outline-none"
                    autoFocus
                />
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={closeFavoriteModal} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors">Cancel</button>
                    <button onClick={handleSaveFavorite} disabled={!favoriteNameInput.trim()} className="px-4 py-2 bg-brand-lime hover:bg-lime-500 rounded-lg font-bold text-brand-dark transition-colors disabled:opacity-50">
                        Save
                    </button>
                </div>
            </div>
        </div>
      )}

      {isViewingSource && workoutSource && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={handleCloseSourceViewer}>
              <div className="bg-brand-light-dark p-4 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] border border-gray-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-white">Source Document</h3>
                      <button onClick={handleCloseSourceViewer} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors">&times;</button>
                  </div>
                  <div className="flex-grow bg-brand-dark rounded-lg overflow-hidden flex items-center justify-center">
                    {workoutSource.type === 'pdf' && workoutSource.data instanceof File ? (
                        <PdfViewer file={workoutSource.data} />
                    ) : workoutSource.type === 'youtube' && sourceUrl ? (
                        <iframe 
                            src={sourceUrl}
                            title="YouTube Video"
                            width="100%"
                            height="100%"
                            className="border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    ) : workoutSource.type === 'picture' && sourceUrl && workoutSource.data instanceof File ? (
                       <div className="w-full h-full flex items-center justify-center p-4">
                           <img src={sourceUrl} alt={workoutSource.data.name} className="max-w-full max-h-full object-contain rounded-lg" />
                       </div>
                    ) : null}
                  </div>
              </div>
          </div>
      )}
      
      {viewingLoggedSource && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setViewingLoggedSource(null)}>
              <div className="bg-brand-light-dark p-4 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] border border-gray-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-white truncate pr-4">Source: {viewingLoggedSource.name}</h3>
                      <button onClick={() => setViewingLoggedSource(null)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors flex-shrink-0">&times;</button>
                  </div>
                  <div className="flex-grow bg-brand-dark rounded-lg overflow-hidden flex items-center justify-center">
                    {viewingLoggedSource.type === 'pdf' ? (
                        <PdfViewer file={base64ToFile(viewingLoggedSource.data, viewingLoggedSource.name, viewingLoggedSource.mimeType)} />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center p-4">
                           <img src={`data:${viewingLoggedSource.mimeType};base64,${viewingLoggedSource.data}`} alt={viewingLoggedSource.name} className="max-w-full max-h-full object-contain rounded-lg" />
                       </div>
                    )}
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Workout Section */}
          <div 
            className="lg:col-span-2 p-6 rounded-xl shadow-xl border border-gray-700 flex flex-col transition-colors duration-300"
            style={cardStyle}
          >
            <div className="flex-grow">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <h2 className="text-3xl font-bold text-white">{editingSessionId ? 'Edit Workout' : 'Current Workout'}</h2>
                  {workoutSource && !editingSessionId && (
                      <button
                          onClick={handleReviewSource}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-lime bg-brand-dark border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                          {workoutSource.type === 'pdf' ? <FileUpIcon className="h-4 w-4" /> 
                           : workoutSource.type === 'youtube' ? <YouTubeIcon className="h-4 w-4" /> 
                           : <PictureIcon className="h-4 w-4" />}
                          Review Source
                      </button>
                  )}
              </div>
              
              <div className="space-y-4">
                {exercises.map((exercise, exIndex) => (
                  <SwipeToDelete key={exIndex} onDelete={() => removeExercise(exIndex)}>
                      <div className="bg-brand-dark p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-semibold text-brand-lime">{exercise.name}</h3>
                          <button onClick={() => removeExercise(exIndex)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <TrashIcon />
                          </button>
                      </div>
                      <div className="space-y-3">
                          {exercise.sets.map((set, setIndex) => (
                          <div key={setIndex} className="flex items-center justify-between bg-brand-super-dark p-3 rounded-md">
                              <div className="flex flex-col">
                              <span className="font-medium text-gray-300">Set {setIndex + 1}</span>
                              {set.targetReps && <span className="text-xs text-gray-500">Target: {set.targetReps} reps</span>}
                              </div>
                              <div className="flex items-center gap-4">
                                <button onClick={() => handleRepChange(exIndex, setIndex, set.reps - 1)} className="w-8 h-8 rounded-full bg-gray-600 text-white font-bold text-lg flex items-center justify-center hover:bg-gray-500">-</button>
                                {editingReps && editingReps.exIndex === exIndex && editingReps.setIndex === setIndex ? (
                                  <input
                                    ref={repInputRef}
                                    type="number"
                                    value={set.reps}
                                    onChange={(e) => handleRepChange(exIndex, setIndex, parseInt(e.target.value, 10))}
                                    onBlur={() => setEditingReps(null)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    className="text-2xl font-bold w-12 text-center bg-brand-dark text-white rounded-md p-0 focus:ring-2 focus:ring-brand-lime focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    style={{ MozAppearance: 'textfield' }}
                                  />
                                ) : (
                                  <span 
                                    onClick={() => setEditingReps({ exIndex, setIndex })}
                                    className="text-2xl font-bold w-12 text-center cursor-pointer select-none"
                                  >
                                    {set.reps}
                                  </span>
                                )}
                                <button onClick={() => handleRepChange(exIndex, setIndex, set.reps + 1)} className="w-8 h-8 rounded-full bg-brand-lime text-brand-dark font-bold text-lg flex items-center justify-center hover:bg-lime-500">+</button>
                              </div>
                          </div>
                          ))}
                      </div>
                      <button onClick={() => addSet(exIndex)} className="mt-4 w-full flex items-center justify-center py-2 px-4 border border-dashed border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition-colors">
                          <PlusIcon /> <span className="ml-2">Add Set</span>
                      </button>
                      </div>
                  </SwipeToDelete>
                ))}
              </div>

              <div className="mt-6 bg-brand-dark p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-grow">
                    <input 
                      type="text" 
                      value={newExerciseName}
                      onChange={(e) => setNewExerciseName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addExercise()}
                      placeholder={isRecording ? 'Listening...' : "Add new exercise (e.g., Push Ups)"}
                      className="w-full p-3 pr-12 bg-brand-super-dark border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-brand-lime focus:outline-none"
                    />
                    <button
                      onClick={handleToggleRecording}
                      title="Use voice input"
                      aria-label="Use voice input"
                      className={`absolute inset-y-0 right-0 flex items-center px-3 rounded-r-lg transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-lime ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                    >
                      <MicIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <button onClick={addExercise} className="flex-shrink-0 py-3 px-6 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors flex items-center justify-center">
                    <PlusIcon /><span className="ml-2">Add Exercise</span>
                  </button>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col sm:flex-row-reverse gap-4">
                  {editingSessionId ? (
                      <>
                          <button onClick={finishWorkout} disabled={exercises.length === 0} className="w-full flex items-center justify-center py-3 px-4 bg-brand-lime hover:bg-lime-500 rounded-lg font-bold text-brand-dark transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                              <CheckIcon /><span className="ml-2">Save Changes</span>
                          </button>
                          <button onClick={handleCancelEdit} className="w-full flex items-center justify-center py-3 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold text-white transition-colors shadow-lg">
                              Cancel Edit
                          </button>
                      </>
                  ) : (
                      <>
                      <button onClick={finishWorkout} disabled={exercises.length === 0} className="w-full flex items-center justify-center py-3 px-4 bg-brand-lime hover:bg-lime-500 rounded-lg font-bold text-brand-dark transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                          <CheckIcon /><span className="ml-2">Finish & Log Workout</span>
                      </button>
                      <button onClick={() => setIsSavingFavorite(true)} disabled={exercises.length === 0} className="w-full flex items-center justify-center py-3 px-4 bg-yellow-500 hover:bg-yellow-400 rounded-lg font-bold text-brand-dark transition-colors shadow-lg disabled:opacity-50">
                          <StarIcon className="h-5 w-5"/><span className="ml-2">Save as Favorite</span>
                      </button>
                      <button onClick={() => setIsGeneratingPlan(true)} className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-white transition-colors shadow-lg">
                          <SparklesIcon /><span className="ml-2">AI Workout Assistant</span>
                      </button>
                      </>
                  )}
              </div>
            </div>
            <div className="mt-auto pt-4">
              <AdBanner
                title="Go Pro for an Ad-Free Experience"
                description="Unlock advanced analytics, custom themes, and remove all ads."
                imageUrl="https://picsum.photos/seed/ad-pro/400/300"
                callToAction="Upgrade Now"
                adUrl="#"
              />
            </div>
          </div>

          {/* Workout Log Section */}
          <div 
            className="p-6 rounded-xl shadow-xl border border-gray-700 flex flex-col gap-8 transition-colors duration-300"
            style={cardStyle}
          >
            {/* Favorite Workouts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><StarIcon className="text-yellow-400" />Favorite Workouts</h2>
              </div>
               <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {favoriteWorkouts.length > 0 ? (
                  favoriteWorkouts.map(fav => (
                    <div key={fav.id} className="flex items-center justify-between bg-brand-dark p-3 rounded-lg hover:bg-brand-super-dark transition-colors">
                      <p className="font-semibold text-white truncate pr-2">{fav.name}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleLoadFavorite(fav.id)} aria-label={`Load ${fav.name} workout`} className="p-2 text-gray-400 hover:text-brand-lime rounded-full hover:bg-gray-700 transition-colors">
                            <PlayIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDeleteFavorite(fav.id)} aria-label={`Delete ${fav.name} from favorites`} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-700 transition-colors">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <StarIcon className="mx-auto h-10 w-10" />
                    <p className="mt-2 text-sm">No favorite workouts yet.</p>
                    <p className="text-xs">Finish a workout and save it as a favorite!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Workout Log */}
            <div className="flex-grow flex flex-col">
             <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">{isViewingArchive ? 'Archived Workouts' : 'Workout Log'}</h2>
               <div className="flex items-center gap-2">
                  {hasArchivedWorkouts || hasWorkouts ? (
                      <button
                          onClick={() => setIsViewingArchive(!isViewingArchive)}
                          className="px-3 py-1.5 text-sm font-semibold text-gray-300 bg-brand-dark rounded-lg hover:bg-gray-700 transition-colors"
                          aria-label={isViewingArchive ? "View active log" : "View archive"}
                      >
                          {isViewingArchive ? 'View Active Log' : 'View Archive'}
                      </button>
                  ) : null}

                  {!isViewingArchive && hasWorkouts && (
                    <div ref={archiveMenuRef} className="relative">
                      <button
                        onClick={() => setIsArchiveMenuOpen(!isArchiveMenuOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-300 bg-brand-dark rounded-lg hover:bg-gray-700 transition-colors"
                        aria-haspopup="true"
                        aria-expanded={isArchiveMenuOpen}
                      >
                        <ArchiveIcon className="h-4 w-4" /> Archive <ChevronDownIcon className={`h-4 w-4 transition-transform ${isArchiveMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isArchiveMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 origin-top-right bg-brand-super-dark rounded-md shadow-lg ring-1 ring-gray-700 z-20">
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            <a href="#" onClick={(e) => { e.preventDefault(); handleArchive('last'); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-dark" role="menuitem">Last Workout</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); handleArchive('7d'); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-dark" role="menuitem">Last 7 Days</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); handleArchive('30d'); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-dark" role="menuitem">Last 30 Days</a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                   {isViewingArchive && hasArchivedWorkouts && (
                      <div ref={exportMenuRef} className="relative">
                          <button
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-300 bg-brand-dark rounded-lg hover:bg-gray-700 transition-colors"
                            aria-haspopup="true"
                            aria-expanded={isExportMenuOpen}
                          >
                              <DownloadIcon className="h-4 w-4" /> Export <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isExportMenuOpen && (
                              <div className="absolute right-0 mt-2 w-56 origin-top-right bg-brand-super-dark rounded-md shadow-lg ring-1 ring-gray-700 z-20">
                                  <div className="py-1" role="menu" aria-orientation="vertical">
                                      <a href="#" onClick={(e) => { e.preventDefault(); handleExport('csv'); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-dark" role="menuitem">Export as CSV (Spreadsheet)</a>
                                      <a href="#" onClick={(e) => { e.preventDefault(); handleExport('txt'); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-brand-dark" role="menuitem">Export as Text (Note)</a>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {(hasWorkouts && !isViewingArchive) || (hasArchivedWorkouts && isViewingArchive) ? (
                    <button
                      onClick={isViewingArchive ? clearArchive : clearLog}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-400 bg-brand-dark rounded-lg hover:bg-red-900/50 hover:text-red-400 transition-colors"
                      aria-label={isViewingArchive ? "Clear all archived workouts" : "Clear all workout history"}
                    >
                      <TrashIcon className="h-4 w-4" />
                      {isViewingArchive ? 'Clear Archive' : 'Clear Log'}
                    </button>
                  ) : null}
              </div>
            </div>
            <div className="max-h-[800px] overflow-y-auto">
              {currentLog.length > 0 ? (
                <table className="w-full text-left table-fixed">
                  <thead className="sticky top-0 z-10" style={{ ...cardStyle, top: '-1px' /* Minor adjustment for clean scroll */ }}>
                    <tr className="border-b border-gray-600">
                      <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-1/3">Date</th>
                      <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Workout Summary</th>
                      <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {currentLog.map(session => (
                      <tr key={session.id} className="hover:bg-brand-dark/50 transition-colors">
                        <td className="p-4 align-top">
                          <p className="font-semibold text-white whitespace-nowrap">{session.date}</p>
                        </td>
                        <td className="p-4 align-top">
                          <ul className="space-y-1 text-gray-400 text-sm list-disc list-inside">
                            {session.exercises.map((ex, i) => {
                              const totalReps = ex.sets.reduce((sum, set) => sum + set.reps, 0);
                              return (
                                 <li key={i} className="truncate">
                                  <span className="font-medium text-gray-300">{ex.name}</span>: {ex.sets.length} sets ({totalReps} total reps)
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                        <td className="p-4 align-top text-right">
                           <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                            {isViewingArchive ? (
                                <>
                                  {session.source && (
                                    <button onClick={() => handleViewLoggedSource(session.source!)} aria-label="View source document" className="p-2 text-gray-400 hover:text-brand-lime rounded-full hover:bg-gray-700 transition-colors">
                                        <FileTextIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                  <button onClick={() => handleUnarchive(session.id)} aria-label="Unarchive workout" className="p-2 text-gray-400 hover:text-brand-lime rounded-full hover:bg-gray-700 transition-colors">
                                      <UnarchiveIcon className="h-5 w-5" />
                                  </button>
                                  <button onClick={() => handleDeleteArchivedSession(session.id)} aria-label="Delete archived workout permanently" className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-700 transition-colors">
                                      <TrashIcon className="h-5 w-5" />
                                  </button>
                                </>
                            ) : (
                                <>
                                  {session.source && (
                                    <button onClick={() => handleViewLoggedSource(session.source!)} aria-label="View source document" className="p-2 text-gray-400 hover:text-brand-lime rounded-full hover:bg-gray-700 transition-colors">
                                        <FileTextIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                  <button onClick={() => handleInitiateFavoriteSession(session)} aria-label="Save as favorite" className="p-2 text-gray-400 hover:text-yellow-400 rounded-full hover:bg-gray-700 transition-colors">
                                      <StarIcon className="h-5 w-5" />
                                  </button>
                                  <button onClick={() => handleStartEditSession(session)} aria-label="Edit workout" className="p-2 text-gray-400 hover:text-brand-lime rounded-full hover:bg-gray-700 transition-colors">
                                      <PencilIcon className="h-5 w-5" />
                                  </button>
                                  <button onClick={() => handleDeleteSession(session.id)} aria-label="Delete workout" className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-700 transition-colors">
                                      <TrashIcon className="h-5 w-5" />
                                  </button>
                                </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  <DumbbellIcon className="mx-auto h-12 w-12" />
                   {isViewingArchive ? (
                    <>
                      <p className="mt-2">No workouts archived yet.</p>
                      <p>Use the "Archive" feature in your active log.</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2">No workouts logged yet.</p>
                      <p>Finish a workout to see it here.</p>
                    </>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
        
        <LifestyleChallenges uiOpacity={uiOpacity} />
      </div>

       {notification && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 bg-brand-super-dark text-white py-3 px-5 rounded-lg shadow-2xl border border-gray-700 flex items-center justify-between z-[100]"
        >
          <p className="mr-4 text-gray-300">{notification.message}</p>
          {notification.onUndo && (
            <button
              onClick={handleUndo}
              className="font-bold text-brand-lime hover:text-lime-300 transition-colors text-sm uppercase tracking-wider"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default FitnessTracker;