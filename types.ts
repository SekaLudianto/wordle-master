// FIX: Import React to use React.ReactNode type.
import React from 'react';

// FIX: Export LetterObject interface to be used across multiple files.
export interface LetterObject {
  id: string;
  letter: string;
  isDecoy?: boolean;
}

export interface Country {
  name: string;
  code: string;
}

export interface City {
  name: string;
  region: string; // Province for Indonesia, Country for world cities
}

export interface FootballStadium {
  name: string;
  location: string; // Club or City
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  comment: string;
  profilePictureUrl?: string;
  isWinner?: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  score: number;
  profilePictureUrl?: string;
}

export interface RoundWinner extends LeaderboardEntry {
  time: number;
  answer?: string; // Jawaban spesifik untuk mode ABC 5 Dasar
  bonus?: number; // Poin bonus untuk jawaban unik
}

export interface GiftNotification {
  id: string;
  userId: string;
  nickname: string;
  profilePictureUrl: string;
  giftName: string;
  giftCount: number;
  giftId: number;
}

export interface RankNotification {
  id: string;
  userId: string;
  nickname: string;
  profilePictureUrl: string;
  rank: number;
  score: number;
}

export interface InfoNotification {
  id: string;
  content: React.ReactNode;
}

// Raw event from backend
export interface TikTokGiftEvent {
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  giftName: string;
  giftCount: number;
  giftId: number; // e.g., 5655 for Rose
}

export type DonationPlatform = 'saweria' | 'sociabuzz' | 'trakteer' | 'tako' | 'bagibagi' | 'sibagi';

export interface DonationEvent {
  id: string;
  platform: DonationPlatform;
  from_name: string;
  amount: number;
  message: string;
}

export type LiveFeedEvent = ChatMessage | GiftNotification | DonationEvent;

export enum ServerType {
  RAILWAY_1 = 'railway_1',
  RAILWAY_2 = 'railway_2',
  CUSTOM = 'custom',
  INDOFINITY_WEBSOCKET = 'indofinity_ws',
  INDOFINITY_SOCKETIO = 'indofinity_io',
}

export interface ServerConfig {
  type: ServerType;
  url?: string;
  username: string;
}

export enum GameStyle {
    Classic = 'classic',
    Knockout = 'knockout',
}

export enum GameState {
    Setup = 'setup',
    Connecting = 'connecting',
    ModeSelection = 'mode_selection',
    Playing = 'playing',
    ClassicAnswerReveal = 'classic_answer_reveal',
    Paused = 'paused',
    Champion = 'champion',
    Finished = 'finished',
    // Knockout Specific States
    KnockoutRegistration = 'knockout_registration',
    KnockoutDrawing = 'knockout_drawing',
    KnockoutReadyToPlay = 'knockout_ready_to_play',
    KnockoutPrepareMatch = 'knockout_prepare_match',
    KnockoutPlaying = 'knockout_playing',
    KnockoutShowWinner = 'knockout_show_winner',
}

export enum GameMode {
  GuessTheFlag = 'guess_the_flag',
  ABC5Dasar = 'abc_5_dasar',
  GuessTheWord = 'guess_the_word',
  Trivia = 'trivia',
  GuessTheCity = 'guess_the_city',
  ZonaBola = 'zona_bola',
}

export type AbcCategory = 'Negara' | 'Buah' | 'Hewan' | 'Benda' | 'Profesi' | 'Kota di Indonesia' | 'Tumbuhan';
export type WordCategory = 'Pemain Bola' | 'Klub Bola' | 'Stadion Bola' | 'Buah-buahan' | 'Hewan';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

// --- Knockout Mode Types ---
export type KnockoutCategory = 'GuessTheCountry' | 'Trivia' | 'ZonaBola' | 'GuessTheFruit' | 'GuessTheAnimal' | 'KpopTrivia';

export interface TriviaQuestion {
  question: string;
  answer: string;
}

export interface KnockoutPlayer {
  userId: string;
  nickname: string;
  profilePictureUrl?: string;
}

export interface KnockoutMatch {
  id: string;
  player1: KnockoutPlayer | null; // Null indicates a BYE or placeholder
  player2: KnockoutPlayer | null;
  winner: KnockoutPlayer | null;
  score?: string; // e.g., "2-1" or "WO"
  roundIndex: number; // The round this match belongs to (0 for first round)
  matchIndex: number; // The index of the match within its round
}

export type KnockoutRound = KnockoutMatch[];
export type KnockoutBracket = KnockoutRound[];

export interface ChampionRecord {
  wins: number;
  nickname: string;
}

export type KnockoutChampions = Record<string, ChampionRecord>; // Key is userId

// This will be used in useGameLogic.ts to set the word for a knockout match
export interface GameActionPayloads {
    'START_GAME': { 
      gameStyle: GameStyle; 
      maxWinners: number; 
      knockoutCategory?: KnockoutCategory; 
      classicRoundDeck?: GameMode[];
      firstRoundData?: {
        gameMode: GameMode,
        country?: Country, 
        letter?: string, 
        category?: AbcCategory, 
        availableAnswersCount?: number,
        triviaQuestion?: TriviaQuestion,
        city?: City,
      }
    };
    'NEXT_ROUND': { 
      gameMode: GameMode,
      nextCountry?: Country, 
      nextLetter?: string, 
      nextCategory?: AbcCategory, 
      availableAnswersCount?: number,
      nextWord?: string,
      nextWordCategory?: WordCategory,
      nextTriviaQuestion?: TriviaQuestion,
      nextCity?: City,
    };
    'PROCESS_COMMENT': ChatMessage;
    'REGISTER_PLAYER': KnockoutPlayer;
    'SET_HOST_USERNAME': { username: string };
    'SET_KNOCKOUT_COUNTRY': { country: Country };
    'SET_KNOCKOUT_TRIVIA': { question: TriviaQuestion };
    'SET_KNOCKOUT_ZONA_BOLA': { type: 'Pemain Bola' | 'Klub Bola' | 'Stadion Bola', data: string | FootballStadium };
    'SET_KNOCKOUT_GUESS_THE_FRUIT': { fruit: string };
    'SET_KNOCKOUT_GUESS_THE_ANIMAL': { animal: string };
    'SET_KNOCKOUT_KPOP_TRIVIA': { question: TriviaQuestion };
    'PREPARE_NEXT_MATCH': { roundIndex: number; matchIndex: number };
    'FINISH_KNOCKOUT_MATCH': { winner: KnockoutPlayer; score: string; };
    'DECLARE_WALKOVER_WINNER': { roundIndex: number; matchIndex: number; winner: KnockoutPlayer };
}

export type GameAction =
    | { [K in keyof GameActionPayloads]: { type: K; payload: GameActionPayloads[K] } }[keyof GameActionPayloads]
    | { type: 'END_ROUND' | 'TICK_TIMER' | 'SHOW_WINNER_MODAL' | 'HIDE_WINNER_MODAL' | 'PAUSE_GAME' | 'RESUME_GAME' | 'RESET_GAME' | 'START_COUNTDOWN' | 'TICK_COUNTDOWN' | 'END_REGISTRATION_AND_DRAW_BRACKET' | 'START_MATCH' | 'SET_READY_TO_PLAY' | 'KNOCKOUT_QUESTION_TIMEOUT' | 'SKIP_KNOCKOUT_MATCH' | 'REDRAW_BRACKET' | 'RETURN_TO_BRACKET' | 'FINISH_GAME' | 'RESET_KNOCKOUT_REGISTRATION' | 'RESTART_KNOCKOUT_COMPETITION' | 'RETURN_TO_MODE_SELECTION' };