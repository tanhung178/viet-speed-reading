
export interface TextMaterial {
  id: string;
  title: string;
  category: 'literature' | 'news' | 'science' | 'skills' | 'custom';
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
  length: 'short' | 'medium' | 'long';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface UserSession {
  date: string;
  wpm: number;
  comprehensionScore: number;
  durationSeconds: number;
  textId: string;
}

export interface AppSettings {
  defaultWpm: number;
  defaultFontSize: number;
  defaultChunkSize: number;
  isBionicEnabled: boolean;
  activeDrill: ReadingDrill;
}

export enum AppView {
  Home = 'HOME',
  Reader = 'READER',
  Library = 'LIBRARY',
  Stats = 'STATS'
}

export type ReadingDrill = 'none' | 'peripheral' | 'z-pattern' | 'anti-regression';
