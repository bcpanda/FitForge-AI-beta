export type View = 'tracker' | 'store';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface WorkoutSet {
  reps: number;
  targetReps?: string;
}

export interface Exercise {
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutSource {
  type: 'pdf' | 'picture';
  data: string; // Base64 encoded file
  name: string; // Original file name
  mimeType: string; // e.g., 'application/pdf', 'image/png'
}

export interface WorkoutSession {
  id: string;
  date: string;
  exercises: Exercise[];
  source?: WorkoutSource;
}

export interface FavoriteWorkout {
  id: string;
  name: string;
  exercises: Exercise[];
}