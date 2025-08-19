
import React, { useState, useEffect, useRef } from 'react';
import { TargetIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, LoaderIcon, MessageSquareIcon, PencilIcon, TrashIcon, CheckIcon, PlusIcon } from './icons';
import { generateLifestyleChallenge } from '../services/geminiService';

interface Challenge {
  id: string;
  text: string;
  completed: boolean;
  notes?: string;
}

const DEFAULT_CHALLENGES: Omit<Challenge, 'id' | 'completed' | 'notes'>[] = [
  { text: 'Drink 8 glasses of water' },
  { text: 'Get 8 hours of sleep' },
  { text: 'Walk 10,000 steps' },
  { text: 'Eat 5 servings of fruits/vegetables' },
  { text: 'Avoid processed sugar for a day' },
];

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

interface LifestyleChallengesProps {
  uiOpacity: number;
}

const LifestyleChallenges: React.FC<LifestyleChallengesProps> = ({ uiOpacity }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingChallenge, setEditingChallenge] = useState<{ id: string; text: string } | null>(null);
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  const [newChallengeText, setNewChallengeText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingChallenge && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChallenge]);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem('lifestyleChallenges');
      const today = getTodayDateString();

      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.date === today) {
          setChallenges(parsedData.challenges);
          return;
        }
      }
      
      const newChallenges: Challenge[] = DEFAULT_CHALLENGES.map((c, i) => ({
        id: `default-${i}-${Date.now()}`,
        text: c.text,
        completed: false,
        notes: '',
      }));
      setChallenges(newChallenges);

    } catch (e) {
      console.error("Failed to load challenges from localStorage", e);
      const newChallenges: Challenge[] = DEFAULT_CHALLENGES.map((c, i) => ({
        id: `default-${i}-${Date.now()}`,
        text: c.text,
        completed: false,
        notes: '',
      }));
      setChallenges(newChallenges);
    }
  }, []);

  useEffect(() => {
    if (challenges.length > 0) {
      const dataToStore = {
        date: getTodayDateString(),
        challenges: challenges,
      };
      localStorage.setItem('lifestyleChallenges', JSON.stringify(dataToStore));
    }
  }, [challenges]);

  const handleToggleChallenge = (id: string) => {
    setChallenges(prevChallenges =>
      prevChallenges.map(c =>
        c.id === id ? { ...c, completed: !c.completed } : c
      )
    );
  };

  const handleStartEdit = (challenge: Challenge) => {
    setEditingChallenge({ id: challenge.id, text: challenge.text });
  };

  const handleSaveEdit = () => {
    if (!editingChallenge || !editingChallenge.text.trim()) {
      setEditingChallenge(null);
      return;
    };
    setChallenges(prev =>
        prev.map(c =>
            c.id === editingChallenge.id ? { ...c, text: editingChallenge.text.trim() } : c
        )
    );
    setEditingChallenge(null);
  };

  const handleDeleteChallenge = (id: string) => {
    setChallenges(prev => prev.filter(c => c.id !== id));
  };
  
  const handleToggleNotes = (id: string) => {
    setExpandedNotesId(prev => (prev === id ? null : id));
  };

  const handleNotesChange = (id: string, newNotes: string) => {
    setChallenges(prev =>
        prev.map(c => (c.id === id ? { ...c, notes: newNotes } : c))
    );
  };

  const handleAddChallenge = () => {
    if (!newChallengeText.trim()) return;
    const newChallenge: Challenge = {
        id: `manual-${Date.now()}`,
        text: newChallengeText.trim(),
        completed: false,
        notes: ''
    };
    setChallenges(prev => [...prev, newChallenge]);
    setNewChallengeText('');
  };

  const handleGenerateChallenge = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const existingChallengeTexts = challenges.map(c => c.text);
      const newChallengeText = await generateLifestyleChallenge(existingChallengeTexts);
      const newChallenge: Challenge = {
        id: `ai-${Date.now()}`,
        text: newChallengeText,
        completed: false,
        notes: '',
      };
      setChallenges(prev => [...prev, newChallenge]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestion.');
    } finally {
      setIsLoading(false);
    }
  };

  const backgroundAlpha = uiOpacity / 100;
  const cardStyle = { backgroundColor: `rgba(31, 41, 55, ${backgroundAlpha})` };

  return (
    <div 
        className="rounded-xl shadow-xl border border-gray-700 flex flex-col transition-all duration-300"
        style={cardStyle}
    >
        <div className="flex justify-between items-center cursor-pointer p-6" onClick={() => setIsCollapsed(!isCollapsed)}>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <TargetIcon className="text-brand-lime" />
                Lifestyle Challenges
            </h2>
            <button 
                aria-label={isCollapsed ? "Show challenges" : "Hide challenges"}
                className="p-2 text-gray-400 hover:text-white"
            >
                {isCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
            </button>
        </div>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[1000px]'}`}>
          <div className="px-6 pb-6">
              <p className="text-gray-400 mb-4 border-t border-gray-700 pt-4">Complete these daily challenges to build healthy habits.</p>
              <div className="space-y-3">
                  {challenges.map(challenge => (
                      <div key={challenge.id} className="bg-brand-dark p-3 rounded-lg transition-all">
                          <div className="flex items-center gap-4">
                              <input
                                  type="checkbox"
                                  checked={challenge.completed}
                                  onChange={() => handleToggleChallenge(challenge.id)}
                                  className="h-6 w-6 rounded border-gray-600 bg-brand-super-dark text-brand-lime focus:ring-brand-lime transition-colors flex-shrink-0"
                              />
                              
                              <div className="flex-grow">
                                {editingChallenge?.id === challenge.id ? (
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editingChallenge.text}
                                        onChange={(e) => setEditingChallenge(prev => prev ? {...prev, text: e.target.value} : null)}
                                        onBlur={handleSaveEdit}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit();
                                            if (e.key === 'Escape') setEditingChallenge(null);
                                        }}
                                        className="w-full bg-brand-super-dark text-white p-1 rounded-md border border-brand-lime focus:outline-none"
                                    />
                                ) : (
                                    <span className={`text-white transition-colors ${challenge.completed ? 'line-through text-gray-500' : ''}`}>
                                        {challenge.text}
                                    </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1 text-gray-400 flex-shrink-0">
                                  <button onClick={() => handleToggleNotes(challenge.id)} className="p-2 hover:text-brand-lime rounded-full hover:bg-gray-700 transition-colors" aria-label="Toggle notes">
                                      <MessageSquareIcon className="h-5 w-5"/>
                                  </button>
                                  <button onClick={() => editingChallenge?.id === challenge.id ? handleSaveEdit() : handleStartEdit(challenge)} className="p-2 hover:text-brand-lime rounded-full hover:bg-gray-700 transition-colors" aria-label={editingChallenge?.id === challenge.id ? 'Save changes' : 'Edit challenge'}>
                                      {editingChallenge?.id === challenge.id ? <CheckIcon className="h-5 w-5" /> : <PencilIcon className="h-5 w-5"/>}
                                  </button>
                                  <button onClick={() => handleDeleteChallenge(challenge.id)} className="p-2 hover:text-red-500 rounded-full hover:bg-gray-700 transition-colors" aria-label="Delete challenge">
                                      <TrashIcon className="h-5 w-5"/>
                                  </button>
                              </div>
                          </div>
                          {expandedNotesId === challenge.id && (
                              <div className="mt-3 pl-10">
                                  <textarea
                                      value={challenge.notes || ''}
                                      onChange={(e) => handleNotesChange(challenge.id, e.target.value)}
                                      placeholder="Add notes..."
                                      className="w-full p-2 bg-brand-super-dark border border-gray-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-brand-lime focus:outline-none"
                                      rows={3}
                                  />
                              </div>
                          )}
                      </div>
                  ))}
              </div>

              <div className="mt-6 border-t border-gray-700 pt-6 space-y-4">
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={newChallengeText}
                        onChange={(e) => setNewChallengeText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddChallenge()}
                        placeholder="Add a new custom challenge"
                        className="w-full p-3 bg-brand-super-dark border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-brand-lime focus:outline-none"
                    />
                    <button onClick={handleAddChallenge} className="flex-shrink-0 py-3 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white transition-colors flex items-center justify-center" aria-label="Add custom challenge">
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>
                  <button 
                      onClick={handleGenerateChallenge} 
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-white transition-colors shadow-lg disabled:opacity-50"
                  >
                      {isLoading ? <LoaderIcon /> : <SparklesIcon />}
                      <span className="ml-2">{isLoading ? 'Generating...' : 'Suggest a New Challenge'}</span>
                  </button>
                  {error && <p className="text-red-500 mt-2 text-sm text-center">{error}</p>}
              </div>
          </div>
        </div>
    </div>
  );
};

export default LifestyleChallenges;
