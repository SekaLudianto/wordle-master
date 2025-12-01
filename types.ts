export type Language = 'EN' | 'ID';

export enum GameStatus {
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost',
}

export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

export interface GameConfig {
  language: Language;
  wordLength: number;
}

export interface DictionaryData {
  [key: number]: string[];
}

export interface ToastMessage {
  id: number;
  message: string;
}

export interface TikTokUserData {
  userId: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
}

export interface GuessData {
  word: string;
  user?: TikTokUserData; // Optional, as some guesses might be manual (if enabled)
}

export interface TikTokChatEvent {
  comment: string;
  userId: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  // ... other fields from connector
}

export interface TikTokMemberEvent {
  userId: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  label: string; // e.g., "joined"
}