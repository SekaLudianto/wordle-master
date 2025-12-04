
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
  type?: 'default' | 'error' | 'success';
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

export interface TikTokGiftEvent {
  giftId: number;
  repeatCount: number;
  diamondCount: number; // Cost in coins
  userId: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  giftName: string;
  giftType: number;
  repeatEnd?: boolean;
}

export interface TikTokLikeEvent {
  likeCount: number;
  totalLikeCount: number;
  userId: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  label: string;
}

export interface PlayerScore {
  userId: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  score: number;
  wins: number;
}

export interface SupporterStats {
  userId: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  totalLikes: number;
  totalCoins: number;
}

// Moved from Grid.tsx to be a shared utility for validation
export const getRowStatuses = (guess: string, target: string): LetterStatus[] => {
  const length = guess.length;
  const statuses: LetterStatus[] = Array(length).fill('absent');
  const targetChars: (string | null)[] = target.split('');
  const guessChars: (string | null)[] = guess.split('');

  // First pass for correct letters
  for (let i = 0; i < length; i++) {
    if (guessChars[i] === targetChars[i]) {
      statuses[i] = 'correct';
      targetChars[i] = null; // Mark as used
      guessChars[i] = null;  // Mark as used
    }
  }

  // Second pass for present letters
  for (let i = 0; i < length; i++) {
    if (guessChars[i] !== null) {
      const index = targetChars.indexOf(guessChars[i]);
      if (index !== -1) {
        statuses[i] = 'present';
        targetChars[index] = null; // Mark as used
      }
    }
  }

  return statuses;
};