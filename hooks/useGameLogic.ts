import React, { useReducer, useCallback, useEffect, useRef } from 'react';
// FIX: The type `LetterObject` is now correctly exported from `types.ts`.
import { Country, ChatMessage, LeaderboardEntry, RoundWinner, GameMode, AbcCategory, WordCategory, GameState, GameStyle, KnockoutPlayer, KnockoutBracket, KnockoutMatch, GameActionPayloads, KnockoutCategory, TriviaQuestion, GameAction, City, FootballStadium, LetterObject } from '../types';
import { countries } from '../data/countries';
import { fruits } from '../data/fruits';
import { animals } from '../data/animals';
import { objects } from '../data/objects';
import { professions } from '../data/professions';
import { indonesianCities } from '../data/indonesian_cities';
import { plants } from '../data/plants';
import { footballPlayers } from '../data/football_players';
import { footballClubs } from '../data/football_clubs';
import { footballStadiums } from '../data/football_stadiums';
import { triviaQuestions } from '../data/trivia';
import { kpopTrivia } from '../data/kpop_trivia';
import { cities } from '../data/cities';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, BASE_POINTS, SPEED_BONUS_MULTIPLIER, WINNER_MODAL_TIMEOUT_MS, UNIQUENESS_BONUS_POINTS, KNOCKOUT_TARGET_SCORE, KNOCKOUT_PREPARE_SECONDS, KNOCKOUT_WINNER_VIEW_SECONDS, KNOCKOUT_ROUND_TIMER_SECONDS, ANSWER_REVEAL_DELAY_SECONDS } from '../constants';

export interface InternalGameState {
  gameState: GameState;
  gameStyle: GameStyle;
  hostUsername: string | null;
  round: number;
  gameMode: GameMode | null;
  currentCountry: Country | null;
  currentLetter: string | null;
  currentCategory: AbcCategory | null;
  currentWord: string | null;
  currentWordCategory: WordCategory | null;
  currentTriviaQuestion: TriviaQuestion | null;
  currentCity: City | null;
  currentStadium: FootballStadium | null;
  usedAnswers: string[];
  scrambledWord: LetterObject[][];
  leaderboard: LeaderboardEntry[];
  sessionLeaderboard: LeaderboardEntry[];
  roundWinners: RoundWinner[];
  isRoundActive: boolean;
  roundTimer: number;
  showWinnerModal: boolean;
  availableAnswersCount: number | null;
  allAnswersFoundInRound: boolean;
  maxWinners: number;
  isPausedByAdmin: boolean;
  countdownValue: number | null;
  chatMessages: ChatMessage[]; // Added for ChatTab
  classicRoundDeck: GameMode[];

  // Knockout state
  knockoutCategory: KnockoutCategory | null;
  knockoutPlayers: KnockoutPlayer[];
  knockoutBracket: KnockoutBracket | null;
  currentBracketRoundIndex: number | null;
  currentMatchIndex: number | null;
  knockoutMatchPoints: { player1: number; player2: number };
}


const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const scrambleWord = (name:string): LetterObject[][] => {
    const words = name.toUpperCase().split(' ');
    const VOWELS = ['A', 'I', 'U', 'E', 'O'];

    // Find the index of the longest word to add decoys to
    let longestWordIndex = 0;
    let maxLength = 0;
    words.forEach((word, index) => {
        if (word.length > maxLength) {
            maxLength = word.length;
            longestWordIndex = index;
        }
    });

    return words.map((word, wordIndex) => {
        // Create an array of LetterObjects with stable IDs based on original index
        const lettersWithDecoys: LetterObject[] = word.split('').map((char, index) => ({
            id: `w${wordIndex}-i${index}`,
            letter: char,
            isDecoy: false,
        }));

        // Add 3 decoy vowels only to the longest word
        if (wordIndex === longestWordIndex) {
            for (let i = 0; i < 3; i++) {
                lettersWithDecoys.push({
                    id: `decoy-${wordIndex}-${i}`,
                    letter: VOWELS[Math.floor(Math.random() * VOWELS.length)],
                    isDecoy: true,
                });
            }
        }
        
        // Shuffle the combined array
        return shuffleArray(lettersWithDecoys);
    }).map(wordArray => [...wordArray]); // Return a new array of new arrays
};


const createInitialState = (): InternalGameState => ({
  gameState: GameState.Setup,
  gameStyle: GameStyle.Classic,
  hostUsername: null,
  round: 0,
  gameMode: null,
  currentCountry: null,
  currentLetter: null,
  currentCategory: null,
  currentWord: null,
  currentWordCategory: null,
  currentTriviaQuestion: null,
  currentCity: null,
  currentStadium: null,
  usedAnswers: [],
  scrambledWord: [],
  leaderboard: JSON.parse(localStorage.getItem('leaderboard') || '[]'),
  sessionLeaderboard: [],
  roundWinners: [],
  isRoundActive: false,
  roundTimer: ROUND_TIMER_SECONDS,
  showWinnerModal: false,
  availableAnswersCount: null,
  allAnswersFoundInRound: false,
  maxWinners: 5,
  isPausedByAdmin: false,
  countdownValue: null,
  chatMessages: [],
  classicRoundDeck: [],
  knockoutCategory: null,
  knockoutPlayers: [],
  knockoutBracket: null,
  currentBracketRoundIndex: null,
  currentMatchIndex: null,
  knockoutMatchPoints: { player1: 0, player2: 0 },
});

// --- KNOCKOUT HELPERS ---
const generateBracket = (players: KnockoutPlayer[]): KnockoutBracket => {
    const shuffledPlayers = shuffleArray(players);
    const numPlayers = shuffledPlayers.length;
    if (numPlayers < 2) return [];

    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    const numByes = nextPowerOfTwo - numPlayers;
    const numFirstRoundMatches = (numPlayers - numByes) / 2;

    const bracket: KnockoutBracket = [];
    const firstRound: KnockoutMatch[] = [];
    
    let playerIndex = 0;

    for (let i = 0; i < numFirstRoundMatches; i++) {
        firstRound.push({
            id: `r0-m${i}`,
            player1: shuffledPlayers[playerIndex++],
            player2: shuffledPlayers[playerIndex++],
            winner: null,
            roundIndex: 0,
            matchIndex: i,
        });
    }

    for (let i = 0; i < numByes; i++) {
        const playerWithBye = shuffledPlayers[playerIndex++];
        firstRound.push({
            id: `r0-m${numFirstRoundMatches + i}`,
            player1: playerWithBye,
            player2: null,
            winner: playerWithBye, 
            roundIndex: 0,
            matchIndex: numFirstRoundMatches + i,
        });
    }

    bracket.push(firstRound);

    let currentRoundWinners = numFirstRoundMatches + numByes;
    let roundIndex = 1;
    while (currentRoundWinners > 1) {
        const numMatchesInNextRound = currentRoundWinners / 2;
        const nextRound: KnockoutMatch[] = [];
        for (let i = 0; i < numMatchesInNextRound; i++) {
            nextRound.push({
                id: `r${roundIndex}-m${i}`,
                player1: null,
                player2: null,
                winner: null,
                roundIndex,
                matchIndex: i,
            });
        }
        if(nextRound.length > 0) bracket.push(nextRound);
        currentRoundWinners /= 2;
        roundIndex++;
    }
    
    // Auto-populate winners from BYE matches to the next round
    if (bracket.length > 1) {
        for(let i=0; i < bracket[0].length; i++) {
            const match = bracket[0][i];
            if (match.winner) {
                const nextRoundMatchIndex = Math.floor(i / 2);
                const nextMatch = bracket[1][nextRoundMatchIndex];
                if (nextMatch) {
                    if (!nextMatch.player1) nextMatch.player1 = match.winner;
                    else if (!nextMatch.player2) nextMatch.player2 = match.winner;
                }
            }
        }
    }

    return bracket;
};

const advanceWinnerInBracket = (bracket: KnockoutBracket, winner: KnockoutPlayer, roundIndex: number, matchIndex: number): KnockoutBracket => {
    const newBracket = JSON.parse(JSON.stringify(bracket));
    const nextRoundIndex = roundIndex + 1;
    if (newBracket[nextRoundIndex]) {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        if (newBracket[nextRoundIndex][nextMatchIndex]) {
            const nextMatch = newBracket[nextRoundIndex][nextMatchIndex];
            if (!nextMatch.player1) {
                nextMatch.player1 = winner;
            } else if (!nextMatch.player2) {
                nextMatch.player2 = winner;
            }
        }
    }
    return newBracket;
};

const isTournamentOver = (bracket: KnockoutBracket, roundIndex: number): boolean => {
    if (!bracket || bracket.length === 0) return false;
    // The tournament is over if the current round is the last round
    return roundIndex === bracket.length - 1;
};

const gameReducer = (state: InternalGameState, action: GameAction): InternalGameState => {
  switch (action.type) {
    case 'START_GAME': {
      const initialState = createInitialState();
      const { gameStyle, maxWinners, knockoutCategory, classicRoundDeck, firstRoundData } = action.payload;

      if (gameStyle === GameStyle.Classic && firstRoundData) {
        return {
          ...initialState,
          hostUsername: state.hostUsername,
          leaderboard: state.leaderboard, // Preserve global leaderboard across sessions
          gameStyle: gameStyle,
          maxWinners: maxWinners,
          classicRoundDeck: classicRoundDeck || [],
          gameState: GameState.Playing,
          round: 1,
          gameMode: firstRoundData.gameMode,
          currentCountry: firstRoundData.country || null,
          currentLetter: firstRoundData.letter || null,
          currentCategory: firstRoundData.category || null,
          currentTriviaQuestion: firstRoundData.triviaQuestion || null,
          currentCity: firstRoundData.city || null,
          availableAnswersCount: firstRoundData.availableAnswersCount || null,
          scrambledWord: firstRoundData.country ? scrambleWord(firstRoundData.country.name) : firstRoundData.triviaQuestion ? scrambleWord(firstRoundData.triviaQuestion.answer) : firstRoundData.city ? scrambleWord(firstRoundData.city.name) : [],
          isRoundActive: true,
          roundTimer: ROUND_TIMER_SECONDS,
        };
      } else { // Knockout
        return {
          ...initialState,
          hostUsername: state.hostUsername,
          leaderboard: state.leaderboard, // Preserve global leaderboard
          gameStyle: gameStyle,
          maxWinners: maxWinners,
          knockoutCategory: knockoutCategory || null,
          gameState: GameState.KnockoutRegistration,
        };
      }
    }
    case 'NEXT_ROUND': {
      if (state.round >= TOTAL_ROUNDS) {
        return { ...state, gameState: GameState.Champion, isRoundActive: false };
      }
      const newRound = state.round + 1;
      const { gameMode, nextCountry, nextLetter, nextCategory, availableAnswersCount, nextWord, nextWordCategory, nextTriviaQuestion, nextCity } = action.payload;

      return {
        ...state,
        gameState: GameState.Playing,
        round: newRound,
        gameMode: gameMode,
        currentCountry: nextCountry || null,
        currentLetter: nextLetter || null,
        currentCategory: nextCategory || null,
        currentWord: nextWord || null,
        currentWordCategory: nextWordCategory || null,
        currentTriviaQuestion: nextTriviaQuestion || null,
        currentCity: nextCity || null,
        availableAnswersCount: availableAnswersCount || null,
        scrambledWord: nextCountry ? scrambleWord(nextCountry.name) : nextWord ? scrambleWord(nextWord) : nextTriviaQuestion ? scrambleWord(nextTriviaQuestion.answer) : nextCity ? scrambleWord(nextCity.name) : [],
        usedAnswers: [],
        isRoundActive: true,
        roundWinners: [],
        roundTimer: ROUND_TIMER_SECONDS,
        showWinnerModal: false,
        allAnswersFoundInRound: false,
        isPausedByAdmin: false,
        countdownValue: null,
      };
    }
    case 'PROCESS_COMMENT': {
        const message = action.payload;
        const newChatMessages = [message, ...state.chatMessages].slice(0, 100);
        if (!state.isRoundActive) return { ...state, chatMessages: newChatMessages };
        
        const comment = message.comment.trim();

        // Helper function to check for a whole word/phrase match, case-insensitively
        const checkAnswer = (commentText: string, answer: string): boolean => {
          if (!answer) return false;
          // Escape special regex characters in the answer
          const escapedAnswer = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Create a regex to find the answer as a whole word/phrase
          const regex = new RegExp(`\\b${escapedAnswer}\\b`, 'i');
          return regex.test(commentText);
        };
        
        let isCorrect = false;
        let foundAnswer = '';

        if (state.gameMode === GameMode.ABC5Dasar && state.currentLetter && state.currentCategory) {
            const validationList = getValidationList(state.currentCategory)
                .filter(item => item.toLowerCase().startsWith(state.currentLetter!.toLowerCase()))
                .filter(item => !state.usedAnswers.includes(item.toLowerCase()));
            
            validationList.sort((a, b) => b.length - a.length);

            for (const validItem of validationList) {
                if (checkAnswer(comment, validItem)) {
                    isCorrect = true;
                    foundAnswer = validItem;
                    break;
                }
            }
        } else {
            let expectedAnswer = '';
            switch (state.gameMode) {
                case GameMode.GuessTheFlag: expectedAnswer = state.currentCountry?.name || ''; break;
                case GameMode.GuessTheWord: expectedAnswer = state.currentWord || ''; break;
                case GameMode.GuessTheCity: expectedAnswer = state.currentCity?.name || ''; break;
                case GameMode.Trivia: expectedAnswer = state.currentTriviaQuestion?.answer || ''; break;
                case GameMode.ZonaBola: expectedAnswer = state.currentWord || state.currentStadium?.name || ''; break;
            }
            if (expectedAnswer && checkAnswer(comment, expectedAnswer)) {
                isCorrect = true;
                foundAnswer = expectedAnswer;
            }
        }

        if (isCorrect) {
            // Special handling for host/admin answers. Mark as winner for visual feedback but don't affect game.
            if (state.hostUsername && message.userId.toLowerCase() === state.hostUsername.toLowerCase()) {
                return {
                    ...state,
                    chatMessages: [ { ...message, isWinner: true }, ...state.chatMessages].slice(0,100),
                };
            }

            const winnerPlayer = { userId: message.userId, nickname: message.nickname, profilePictureUrl: message.profilePictureUrl };
            if (state.gameStyle === GameStyle.Classic) {
                if (state.roundWinners.some(w => w.userId === message.userId)) return { ...state, chatMessages: newChatMessages };
                const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
                        ? Math.min(state.maxWinners, state.availableAnswersCount) 
                        : state.maxWinners;
                if (state.roundWinners.length >= currentMaxWinners) return { ...state, chatMessages: newChatMessages };

                const timeTaken = ROUND_TIMER_SECONDS - state.roundTimer;
                const score = BASE_POINTS + Math.max(0, (ROUND_TIMER_SECONDS - timeTaken) * SPEED_BONUS_MULTIPLIER);
                const newWinner: RoundWinner = { ...winnerPlayer, score, time: timeTaken, answer: state.gameMode === GameMode.ABC5Dasar ? foundAnswer : undefined };
                
                const updatedLeaderboard = [...state.leaderboard];
                const playerIndex = updatedLeaderboard.findIndex(p => p.userId === message.userId);
                if (playerIndex > -1) updatedLeaderboard[playerIndex].score += score;
                else updatedLeaderboard.push({ ...winnerPlayer, score });
                updatedLeaderboard.sort((a, b) => b.score - a.score);
                localStorage.setItem('leaderboard', JSON.stringify(updatedLeaderboard));
                
                const updatedSessionLeaderboard = [...state.sessionLeaderboard];
                const sessionPlayerIndex = updatedSessionLeaderboard.findIndex(p => p.userId === message.userId);
                if (sessionPlayerIndex > -1) updatedSessionLeaderboard[sessionPlayerIndex].score += score;
                else updatedSessionLeaderboard.push({ ...winnerPlayer, score });
                updatedSessionLeaderboard.sort((a, b) => b.score - a.score);

                return {
                    ...state,
                    chatMessages: [ { ...message, isWinner: true }, ...state.chatMessages].slice(0,100),
                    roundWinners: [...state.roundWinners, newWinner],
                    leaderboard: updatedLeaderboard,
                    sessionLeaderboard: updatedSessionLeaderboard,
                    usedAnswers: state.gameMode === GameMode.ABC5Dasar ? [...state.usedAnswers, foundAnswer.toLowerCase()] : state.usedAnswers,
                };
            } else { // Knockout mode point scored
                const { knockoutMatchPoints, currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
                if (currentBracketRoundIndex === null || currentMatchIndex === null || !knockoutBracket) return state;
                const match = knockoutBracket![currentBracketRoundIndex!][currentMatchIndex!];
                
                if (winnerPlayer.userId !== match.player1?.userId && winnerPlayer.userId !== match.player2?.userId) {
                    return { ...state, chatMessages: newChatMessages };
                }
                
                const newPoints = {...knockoutMatchPoints};
                if(winnerPlayer.userId === match.player1?.userId) newPoints.player1++;
                else newPoints.player2++;
                
                return { 
                    ...state, 
                    isRoundActive: false,
                    knockoutMatchPoints: newPoints,
                    chatMessages: [ { ...message, isWinner: true }, ...state.chatMessages].slice(0,100),
                };
            }
        }
        return { ...state, chatMessages: newChatMessages };
    }
    case 'TICK_TIMER': {
        if (!state.isRoundActive) return state;
        if (state.roundTimer > 0) {
            return { ...state, roundTimer: state.roundTimer - 1 };
        }
        return state;
    }
    case 'END_ROUND': {
      if (!state.isRoundActive) return state;
    
      const correctlyOrderedWord: LetterObject[][] = state.scrambledWord.map(wordArray => {
        const realLetters = wordArray.filter(letterObj => !letterObj.isDecoy);
        return realLetters.sort((a, b) => {
          const getIndex = (id: string) => parseInt(id.split('-i')[1], 10);
          return getIndex(a.id) - getIndex(b.id);
        });
      });
    
      let updatedWinners = [...state.roundWinners];
      let updatedSessionLeaderboard = [...state.sessionLeaderboard];
      if (state.gameMode === GameMode.ABC5Dasar) {
        const answerCounts = new Map<string, number>();
        updatedWinners.forEach(w => {
          if (w.answer) {
            answerCounts.set(w.answer.toLowerCase(), (answerCounts.get(w.answer.toLowerCase()) || 0) + 1);
          }
        });
        updatedWinners = updatedWinners.map(w => {
          if (w.answer && answerCounts.get(w.answer.toLowerCase()) === 1) {
            const newScore = w.score + UNIQUENESS_BONUS_POINTS;
            const sessionPlayer = updatedSessionLeaderboard.find(p => p.userId === w.userId);
            if (sessionPlayer) sessionPlayer.score += UNIQUENESS_BONUS_POINTS;
            return { ...w, score: newScore, bonus: UNIQUENESS_BONUS_POINTS };
          }
          return w;
        });
        updatedSessionLeaderboard.sort((a, b) => b.score - a.score);
      }
    
      return {
        ...state,
        isRoundActive: false,
        gameState: GameState.ClassicAnswerReveal,
        roundWinners: updatedWinners,
        sessionLeaderboard: updatedSessionLeaderboard,
        scrambledWord: correctlyOrderedWord,
      };
    }
    case 'SHOW_WINNER_MODAL':
        return { ...state, showWinnerModal: true };
    case 'HIDE_WINNER_MODAL':
        return { ...state, showWinnerModal: false };
    case 'PAUSE_GAME':
        return { ...state, isRoundActive: false, isPausedByAdmin: true, gameState: GameState.Paused };
    case 'RESUME_GAME':
        return { ...state, isRoundActive: true, isPausedByAdmin: false, gameState: state.gameStyle === GameStyle.Classic ? GameState.Playing : GameState.KnockoutPlaying };
    case 'RESET_GAME':
      return createInitialState();
    case 'START_COUNTDOWN':
      return { ...state, countdownValue: 3 };
    case 'TICK_COUNTDOWN':
      if (state.countdownValue && state.countdownValue > 0) {
        return { ...state, countdownValue: state.countdownValue - 1 };
      }
      if (state.gameState === GameState.KnockoutPrepareMatch && state.countdownValue === 1) {
          return { ...state, countdownValue: 0, gameState: GameState.KnockoutPlaying }
      }
      return state;
    case 'SET_HOST_USERNAME':
        return { ...state, hostUsername: action.payload.username };

    // --- KNOCKOUT REDUCERS ---
    case 'REGISTER_PLAYER':
        if (state.knockoutPlayers.some(p => p.userId === action.payload.userId)) return state;
        return { ...state, knockoutPlayers: [...state.knockoutPlayers, action.payload] };
    case 'RESET_KNOCKOUT_REGISTRATION':
        return { ...state, knockoutPlayers: [] };
    case 'END_REGISTRATION_AND_DRAW_BRACKET': {
        if(state.knockoutPlayers.length < 2) return state; // Do nothing if not enough players
        const bracket = generateBracket(state.knockoutPlayers);
        return { ...state, gameState: GameState.KnockoutDrawing, knockoutBracket: bracket };
    }
    case 'PREPARE_NEXT_MATCH': {
        const { roundIndex, matchIndex } = action.payload;
        const bracket = state.knockoutBracket;
        const matchToStart = bracket?.[roundIndex]?.[matchIndex];

        if (!matchToStart || !matchToStart.player1 || !matchToStart.player2) {
            console.error("BUG PREVENTED: Attempted to start an incomplete match.", matchToStart);
            return state; 
        }

        return {
            ...state,
            gameState: GameState.KnockoutPrepareMatch,
            countdownValue: KNOCKOUT_PREPARE_SECONDS,
            currentBracketRoundIndex: roundIndex,
            currentMatchIndex: matchIndex,
        };
    }
    case 'START_MATCH': {
        return {
            ...state,
            gameState: GameState.KnockoutPlaying,
            knockoutMatchPoints: { player1: 0, player2: 0 },
            currentCountry: null,
            currentTriviaQuestion: null,
            currentWord: null,
            currentWordCategory: null,
            currentStadium: null,
        };
    }
    case 'FINISH_KNOCKOUT_MATCH': {
        const { winner, score } = action.payload;
        const { currentBracketRoundIndex, currentMatchIndex, knockoutBracket } = state;
        if (currentBracketRoundIndex === null || currentMatchIndex === null || !knockoutBracket) return state;

        let newBracket = JSON.parse(JSON.stringify(knockoutBracket));
        newBracket[currentBracketRoundIndex][currentMatchIndex].winner = winner;
        newBracket[currentBracketRoundIndex][currentMatchIndex].score = score;

        if (isTournamentOver(newBracket, currentBracketRoundIndex)) {
            return {
                ...state,
                isRoundActive: false,
                knockoutBracket: newBracket,
                sessionLeaderboard: [{ ...winner, score: 1 }],
                gameState: GameState.Champion,
            };
        } else {
            const advancedBracket = advanceWinnerInBracket(newBracket, winner, currentBracketRoundIndex, currentMatchIndex);
            return {
                ...state,
                isRoundActive: false,
                knockoutBracket: advancedBracket,
                gameState: GameState.KnockoutShowWinner,
            };
        }
    }
    case 'DECLARE_WALKOVER_WINNER': {
        const { roundIndex, matchIndex, winner } = action.payload;
        if (!state.knockoutBracket) return state;
        
        let newBracket = JSON.parse(JSON.stringify(state.knockoutBracket));
        newBracket[roundIndex][matchIndex].winner = winner;
        newBracket[roundIndex][matchIndex].score = 'WO';

        if (isTournamentOver(newBracket, roundIndex)) {
            return {
                ...state,
                knockoutBracket: newBracket,
                sessionLeaderboard: [{ ...winner, score: 1 }],
                gameState: GameState.Champion,
            };
        } else {
            const advancedBracket = advanceWinnerInBracket(newBracket, winner, roundIndex, matchIndex);
            return {
                ...state,
                knockoutBracket: advancedBracket,
                gameState: GameState.KnockoutReadyToPlay,
            };
        }
    }
    case 'SET_READY_TO_PLAY': {
        return { ...state, gameState: GameState.KnockoutReadyToPlay };
    }
    case 'RETURN_TO_BRACKET': {
        return { ...state, gameState: GameState.KnockoutReadyToPlay };
    }
    case 'REDRAW_BRACKET': {
        if (!state.knockoutPlayers || state.knockoutPlayers.length < 2) {
            return state; // Not enough players to redraw
        }
        const newBracket = generateBracket(state.knockoutPlayers);
        return {
            ...state,
            knockoutBracket: newBracket,
            currentBracketRoundIndex: null,
            currentMatchIndex: null,
            knockoutMatchPoints: { player1: 0, player2: 0 },
            gameState: GameState.KnockoutDrawing,
        };
    }
    case 'RESTART_KNOCKOUT_COMPETITION':
      return {
        ...state,
        gameState: GameState.KnockoutRegistration,
        knockoutPlayers: [],
        knockoutBracket: null,
        currentBracketRoundIndex: null,
        currentMatchIndex: null,
        knockoutMatchPoints: { player1: 0, player2: 0 },
        sessionLeaderboard: [],
      };
    case 'SET_KNOCKOUT_COUNTRY': {
        return {
            ...state,
            gameMode: GameMode.GuessTheFlag,
            currentCountry: action.payload.country,
            scrambledWord: scrambleWord(action.payload.country.name),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_TRIVIA': {
        return {
            ...state,
            gameMode: GameMode.Trivia,
            currentTriviaQuestion: action.payload.question,
            scrambledWord: scrambleWord(action.payload.question.answer),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_ZONA_BOLA': {
        const { type, data } = action.payload;
        const name = typeof data === 'string' ? data : data.name;
        return {
            ...state,
            gameMode: GameMode.ZonaBola,
            currentWordCategory: type,
            currentWord: type !== 'Stadion Bola' ? name : null,
            currentStadium: type === 'Stadion Bola' ? (data as FootballStadium) : null,
            scrambledWord: scrambleWord(name),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
     case 'SET_KNOCKOUT_GUESS_THE_FRUIT': {
        return {
            ...state,
            gameMode: GameMode.GuessTheWord,
            currentWordCategory: 'Buah-buahan',
            currentWord: action.payload.fruit,
            scrambledWord: scrambleWord(action.payload.fruit),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_GUESS_THE_ANIMAL': {
        return {
            ...state,
            gameMode: GameMode.GuessTheWord,
            currentWordCategory: 'Hewan',
            currentWord: action.payload.animal,
            scrambledWord: scrambleWord(action.payload.animal),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'SET_KNOCKOUT_KPOP_TRIVIA': {
        return {
            ...state,
            gameMode: GameMode.Trivia,
            currentTriviaQuestion: action.payload.question,
            scrambledWord: scrambleWord(action.payload.question.answer),
            roundTimer: KNOCKOUT_ROUND_TIMER_SECONDS,
            isRoundActive: true,
        };
    }
    case 'KNOCKOUT_QUESTION_TIMEOUT': {
        return { ...state, isRoundActive: false };
    }
    case 'SKIP_KNOCKOUT_MATCH': {
        return {
            ...state,
            isRoundActive: false,
            gameState: GameState.KnockoutReadyToPlay,
            knockoutMatchPoints: { player1: 0, player2: 0 },
            currentCountry: null,
            currentTriviaQuestion: null,
            scrambledWord: [],
        };
    }
    case 'FINISH_GAME':
        return { ...state, gameState: GameState.Finished };
    case 'RETURN_TO_MODE_SELECTION':
        return {
            ...createInitialState(),
            leaderboard: state.leaderboard, // Keep global leaderboard
            gameState: GameState.ModeSelection,
        };
    default:
      return state;
  }
};

const abcCategories: AbcCategory[] = ['Negara', 'Buah', 'Hewan', 'Benda', 'Profesi', 'Kota di Indonesia', 'Tumbuhan'];
const getValidationList = (category: AbcCategory): string[] => {
    switch(category){
        case 'Negara': return countries.map(c => c.name);
        case 'Buah': return fruits;
        case 'Hewan': return animals;
        case 'Benda': return objects;
        case 'Profesi': return professions;
        case 'Kota di Indonesia': return indonesianCities;
        case 'Tumbuhan': return plants;
        default: return [];
    }
};

export const useGameLogic = () => {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const countryDeck = useRef<Country[]>([]);
  const knockoutCountryDeck = useRef<Country[]>([]);
  const triviaDeck = useRef<TriviaQuestion[]>([]);
  const kpopTriviaDeck = useRef<TriviaQuestion[]>([]);
  const footballPlayerDeck = useRef<string[]>([]);
  const footballClubDeck = useRef<string[]>([]);
  const footballStadiumDeck = useRef<FootballStadium[]>([]);
  const cityDeck = useRef<City[]>([]);
  const fruitDeck = useRef<string[]>([]);
  const animalDeck = useRef<string[]>([]);
  const usedAbcCombinations = useRef<Set<string>>(new Set());
  const getRandomLetter = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];

  const prepareNewDecks = useCallback(() => {
    countryDeck.current = shuffleArray(countries);
    knockoutCountryDeck.current = shuffleArray(countries);
    triviaDeck.current = shuffleArray(triviaQuestions);
    kpopTriviaDeck.current = shuffleArray(kpopTrivia);
    footballPlayerDeck.current = shuffleArray(footballPlayers);
    footballClubDeck.current = shuffleArray(footballClubs);
    footballStadiumDeck.current = shuffleArray(footballStadiums);
    cityDeck.current = shuffleArray(cities);
    fruitDeck.current = shuffleArray(fruits);
    animalDeck.current = shuffleArray(animals);
    usedAbcCombinations.current.clear();
  }, []);

  const getNextCountry = useCallback(() => {
    if(countryDeck.current.length === 0) countryDeck.current = shuffleArray(countries);
    return countryDeck.current.pop()!
  }, []);
  
  const getNextTrivia = useCallback(() => {
    if (triviaDeck.current.length === 0) triviaDeck.current = shuffleArray(triviaQuestions);
    return triviaDeck.current.pop()!;
  }, []);

  const getNextCity = useCallback(() => {
    if(cityDeck.current.length === 0) cityDeck.current = shuffleArray(cities);
    return cityDeck.current.pop()!
  }, []);
  
  const getNextAbcCombo = useCallback(() => {
    let letter: string, category: AbcCategory, combo: string, attempts = 0;
    do {
        letter = getRandomLetter();
        category = abcCategories[Math.floor(Math.random() * abcCategories.length)];
        combo = `${letter}-${category}`;
        attempts++;
    } while (usedAbcCombinations.current.has(combo) && attempts < 100);
    usedAbcCombinations.current.add(combo);
    const validationList = getValidationList(category);
    const availableAnswers = validationList.filter(item => item.toLowerCase().startsWith(letter.toLowerCase()));
    
    return { letter, category, availableAnswersCount: availableAnswers.length };
  }, []);


  const getNewKnockoutCountry = useCallback(() => {
    if (knockoutCountryDeck.current.length === 0) knockoutCountryDeck.current = shuffleArray(countries);
    return knockoutCountryDeck.current.pop()!;
  }, []);

  const getNewKnockoutTriviaQuestion = useCallback(() => {
    if (triviaDeck.current.length === 0) triviaDeck.current = shuffleArray(triviaQuestions);
    return triviaDeck.current.pop()!;
  }, []);

  const getNewKnockoutKpopTrivia = useCallback(() => {
    if (kpopTriviaDeck.current.length === 0) kpopTriviaDeck.current = shuffleArray(kpopTrivia);
    return kpopTriviaDeck.current.pop()!;
  }, []);

  const getNewKnockoutFruit = useCallback(() => {
    if (fruitDeck.current.length === 0) fruitDeck.current = shuffleArray(fruits);
    return fruitDeck.current.pop()!;
  }, []);

  const getNewKnockoutAnimal = useCallback(() => {
    if (animalDeck.current.length === 0) animalDeck.current = shuffleArray(animals);
    return animalDeck.current.pop()!;
  }, []);

  const getNewKnockoutZonaBola = useCallback(() => {
      const choice = Math.floor(Math.random() * 3);
      if (choice === 0) { // Player
          if (footballPlayerDeck.current.length === 0) footballPlayerDeck.current = shuffleArray(footballPlayers);
          return { type: 'Pemain Bola' as const, data: footballPlayerDeck.current.pop()! };
      } else if (choice === 1) { // Club
          if (footballClubDeck.current.length === 0) footballClubDeck.current = shuffleArray(footballClubs);
          return { type: 'Klub Bola' as const, data: footballClubDeck.current.pop()! };
      } else { // Stadium
          if (footballStadiumDeck.current.length === 0) footballStadiumDeck.current = shuffleArray(footballStadiums);
          return { type: 'Stadion Bola' as const, data: footballStadiumDeck.current.pop()! };
      }
  }, []);
  
  const startGame = useCallback((gameStyle: GameStyle, maxWinners: number, knockoutCategory?: KnockoutCategory) => {
    prepareNewDecks();
    if (gameStyle === GameStyle.Classic) {
        const roundDeck: GameMode[] = [
            ...Array(5).fill(GameMode.GuessTheFlag),
            ...Array(3).fill(GameMode.ABC5Dasar),
            ...Array(3).fill(GameMode.Trivia),
            ...Array(4).fill(GameMode.GuessTheCity),
        ];
        const classicRoundDeck = shuffleArray(roundDeck);
        const firstRoundMode = classicRoundDeck[0];
        const firstRoundData: GameActionPayloads['START_GAME']['firstRoundData'] = { gameMode: firstRoundMode };

        if (firstRoundMode === GameMode.GuessTheFlag) firstRoundData.country = getNextCountry();
        else if (firstRoundMode === GameMode.ABC5Dasar) {
            const { letter, category, availableAnswersCount } = getNextAbcCombo();
            firstRoundData.letter = letter;
            firstRoundData.category = category;
            firstRoundData.availableAnswersCount = availableAnswersCount;
        } else if (firstRoundMode === GameMode.Trivia) {
            firstRoundData.triviaQuestion = getNextTrivia();
        } else if (firstRoundMode === GameMode.GuessTheCity) {
            firstRoundData.city = getNextCity();
        }
        
        dispatch({ type: 'START_GAME', payload: { gameStyle, maxWinners, classicRoundDeck, firstRoundData } });

    } else { // Knockout
        dispatch({ type: 'START_GAME', payload: { gameStyle, maxWinners, knockoutCategory } });
    }
  }, [prepareNewDecks, getNextCountry, getNextAbcCombo, getNextTrivia, getNextCity]);
  
  const nextRound = useCallback(() => {
    const nextRoundNumber = state.round + 1;
    if (nextRoundNumber > TOTAL_ROUNDS || state.gameStyle !== GameStyle.Classic) return;

    const nextGameMode = state.classicRoundDeck[state.round]; // round is 1-based, deck is 0-based
    const payload: Partial<GameActionPayloads['NEXT_ROUND']> = { gameMode: nextGameMode };
    
    if (nextGameMode === GameMode.GuessTheFlag) {
      payload.nextCountry = getNextCountry();
    } else if (nextGameMode === GameMode.ABC5Dasar) {
        const { letter, category, availableAnswersCount } = getNextAbcCombo();
        payload.nextLetter = letter;
        payload.nextCategory = category;
        payload.availableAnswersCount = availableAnswersCount;
    } else if (nextGameMode === GameMode.Trivia) {
        payload.nextTriviaQuestion = getNextTrivia();
    } else if (nextGameMode === GameMode.GuessTheCity) {
        payload.nextCity = getNextCity();
    }
    dispatch({ type: 'NEXT_ROUND', payload: payload as GameActionPayloads['NEXT_ROUND'] });
  }, [state.round, state.gameStyle, state.classicRoundDeck, getNextCountry, getNextAbcCombo, getNextTrivia, getNextCity]);

  const finishWinnerDisplay = useCallback(() => {
      dispatch({ type: 'HIDE_WINNER_MODAL' });
      if (state.round < TOTAL_ROUNDS) {
          dispatch({ type: 'START_COUNTDOWN' });
      } else {
          dispatch({ type: 'NEXT_ROUND', payload: {} as GameActionPayloads['NEXT_ROUND'] });
      }
  }, [state.round]);

  const resetGame = useCallback(() => dispatch({ type: 'RESET_GAME' }), []);
  
  const processComment = useCallback((message: ChatMessage) => {
    dispatch({ type: 'PROCESS_COMMENT', payload: message });
  }, []);

  const skipRound = useCallback(() => {
    if (state.isRoundActive || state.gameState === GameState.KnockoutPlaying) {
        if (state.gameStyle === GameStyle.Classic) {
            dispatch({ type: 'END_ROUND' });
        } else if (state.gameStyle === GameStyle.Knockout) {
            dispatch({ type: 'SKIP_KNOCKOUT_MATCH' });
        }
    }
  }, [state.isRoundActive, state.gameStyle, state.gameState]);

  const registerPlayer = useCallback((player: KnockoutPlayer) => {
    if(state.gameState === GameState.KnockoutRegistration) {
      dispatch({ type: 'REGISTER_PLAYER', payload: player });
    }
  }, [state.gameState]);
  
  const resetKnockoutRegistration = useCallback(() => {
    dispatch({ type: 'RESET_KNOCKOUT_REGISTRATION' });
  }, []);

  const endRegistrationAndDrawBracket = useCallback(() => {
    if(state.gameState === GameState.KnockoutRegistration) {
        dispatch({ type: 'END_REGISTRATION_AND_DRAW_BRACKET' });
    }
  }, [state.gameState]);

  const prepareNextMatch = useCallback((payload: { roundIndex: number; matchIndex: number }) => {
      if(state.gameState === GameState.KnockoutReadyToPlay) {
          dispatch({ type: 'PREPARE_NEXT_MATCH', payload });
      }
  }, [state.gameState]);
  
  const declareWalkoverWinner = useCallback((payload: GameActionPayloads['DECLARE_WALKOVER_WINNER']) => {
    dispatch({ type: 'DECLARE_WALKOVER_WINNER', payload });
  }, []);
  
  const returnToBracket = useCallback(() => dispatch({ type: 'RETURN_TO_BRACKET' }), []);
  const redrawBracket = useCallback(() => dispatch({ type: 'REDRAW_BRACKET' }), []);
  const finishGame = useCallback(() => dispatch({ type: 'FINISH_GAME' }), []);
  const restartKnockoutCompetition = useCallback(() => dispatch({ type: 'RESTART_KNOCKOUT_COMPETITION' }), []);
  const returnToModeSelection = useCallback(() => dispatch({ type: 'RETURN_TO_MODE_SELECTION' }), []);

  const pauseGame = useCallback(() => dispatch({ type: 'PAUSE_GAME' }), []);
  const resumeGame = useCallback(() => dispatch({ type: 'RESUME_GAME' }), []);
  
  const setHostUsername = useCallback((username: string) => {
    dispatch({ type: 'SET_HOST_USERNAME', payload: { username } });
  }, []);

  const getCurrentKnockoutMatch = useCallback(() => {
      const { knockoutBracket, currentBracketRoundIndex, currentMatchIndex } = state;
      if (knockoutBracket && currentBracketRoundIndex !== null && currentMatchIndex !== null) {
          return knockoutBracket[currentBracketRoundIndex][currentMatchIndex];
      }
      return null;
  }, [state.knockoutBracket, state.currentBracketRoundIndex, state.currentMatchIndex]);

  useEffect(() => { prepareNewDecks(); }, [prepareNewDecks]);

  // Timers for timed transitions
  useEffect(() => {
    let timerId: number;
    if (state.isRoundActive && state.roundTimer > 0) {
      timerId = window.setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    } else if (state.roundTimer <= 0) {
      if (state.gameStyle === GameStyle.Classic && state.isRoundActive) {
          dispatch({ type: 'END_ROUND' });
      } else if (state.gameStyle === GameStyle.Knockout && state.isRoundActive) {
          dispatch({ type: 'KNOCKOUT_QUESTION_TIMEOUT' });
      }
    }
    return () => clearInterval(timerId);
  }, [state.isRoundActive, state.roundTimer, state.gameState, state.gameStyle]);

  useEffect(() => {
    let timerId: number;
    if (state.countdownValue && state.countdownValue > 0) {
      timerId = window.setInterval(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
    } else if (state.countdownValue === 0) {
        if(state.gameState === GameState.KnockoutPrepareMatch) {
            dispatch({ type: 'START_MATCH' });
        } else {
            nextRound();
        }
    }
    return () => clearInterval(timerId);
  }, [state.countdownValue, state.gameState, nextRound]);
  
  useEffect(() => {
    if(state.gameState === GameState.KnockoutDrawing) {
        const timer = setTimeout(() => dispatch({ type: 'SET_READY_TO_PLAY' }), 2000); // 2 seconds to view the bracket
        return () => clearTimeout(timer);
    }
    if(state.gameState === GameState.KnockoutShowWinner) {
        const timer = setTimeout(() => dispatch({ type: 'SET_READY_TO_PLAY' }), KNOCKOUT_WINNER_VIEW_SECONDS * 1000);
        return () => clearTimeout(timer);
    }
    if(state.gameState === GameState.ClassicAnswerReveal) {
        const timer = setTimeout(() => dispatch({ type: 'SHOW_WINNER_MODAL' }), ANSWER_REVEAL_DELAY_SECONDS * 1000);
        return () => clearTimeout(timer);
    }
  }, [state.gameState]);

  // Logic triggers based on state changes
  useEffect(() => {
    if (state.gameState === GameState.KnockoutPlaying && !state.isRoundActive && !state.currentCountry && !state.currentTriviaQuestion && !state.currentWord && !state.currentStadium) {
        if(state.knockoutCategory === 'GuessTheCountry') {
            const country = getNewKnockoutCountry();
            dispatch({ type: 'SET_KNOCKOUT_COUNTRY', payload: { country } });
        } else if (state.knockoutCategory === 'Trivia') {
            const question = getNewKnockoutTriviaQuestion();
            dispatch({ type: 'SET_KNOCKOUT_TRIVIA', payload: { question } });
        } else if (state.knockoutCategory === 'ZonaBola') {
            const payload = getNewKnockoutZonaBola();
            dispatch({ type: 'SET_KNOCKOUT_ZONA_BOLA', payload });
        } else if (state.knockoutCategory === 'GuessTheFruit') {
            const fruit = getNewKnockoutFruit();
            dispatch({ type: 'SET_KNOCKOUT_GUESS_THE_FRUIT', payload: { fruit } });
        } else if (state.knockoutCategory === 'GuessTheAnimal') {
            const animal = getNewKnockoutAnimal();
            dispatch({ type: 'SET_KNOCKOUT_GUESS_THE_ANIMAL', payload: { animal } });
        } else if (state.knockoutCategory === 'KpopTrivia') {
            const question = getNewKnockoutKpopTrivia();
            dispatch({ type: 'SET_KNOCKOUT_KPOP_TRIVIA', payload: { question } });
        }
    }
  }, [state.gameState, state.isRoundActive, state.knockoutCategory, getNewKnockoutCountry, getNewKnockoutTriviaQuestion, getNewKnockoutZonaBola, getNewKnockoutFruit, getNewKnockoutAnimal, getNewKnockoutKpopTrivia]);

  // This effect handles advancing the knockout game after a question is finished
  useEffect(() => {
    if (state.gameState === GameState.KnockoutPlaying && !state.isRoundActive && (state.currentCountry || state.currentTriviaQuestion || state.currentCity || state.currentWord || state.currentStadium)) {
      const timeoutId = setTimeout(() => {
        const { player1, player2 } = state.knockoutMatchPoints;
        const match = getCurrentKnockoutMatch();
        if (match && (player1 >= KNOCKOUT_TARGET_SCORE || player2 >= KNOCKOUT_TARGET_SCORE)) {
          const winner = player1 >= KNOCKOUT_TARGET_SCORE ? match.player1! : match.player2!;
          const score = `${player1}-${player2}`;
          dispatch({ type: 'FINISH_KNOCKOUT_MATCH', payload: { winner, score } });
        } else {
          // Start next question
          if(state.knockoutCategory === 'GuessTheCountry') {
              const country = getNewKnockoutCountry();
              dispatch({ type: 'SET_KNOCKOUT_COUNTRY', payload: { country } });
          } else if (state.knockoutCategory === 'Trivia') {
              const question = getNewKnockoutTriviaQuestion();
              dispatch({ type: 'SET_KNOCKOUT_TRIVIA', payload: { question } });
          } else if (state.knockoutCategory === 'ZonaBola') {
              const payload = getNewKnockoutZonaBola();
              dispatch({ type: 'SET_KNOCKOUT_ZONA_BOLA', payload });
          } else if (state.knockoutCategory === 'GuessTheFruit') {
              const fruit = getNewKnockoutFruit();
              dispatch({ type: 'SET_KNOCKOUT_GUESS_THE_FRUIT', payload: { fruit } });
          } else if (state.knockoutCategory === 'GuessTheAnimal') {
              const animal = getNewKnockoutAnimal();
              dispatch({ type: 'SET_KNOCKOUT_GUESS_THE_ANIMAL', payload: { animal } });
          } else if (state.knockoutCategory === 'KpopTrivia') {
              const question = getNewKnockoutKpopTrivia();
              dispatch({ type: 'SET_KNOCKOUT_KPOP_TRIVIA', payload: { question } });
          }
        }
      }, 3000); // 3-second delay to show the answer

      return () => clearTimeout(timeoutId);
    }
  }, [state.isRoundActive, state.gameState, state.knockoutMatchPoints, state.knockoutCategory, getCurrentKnockoutMatch, getNewKnockoutCountry, getNewKnockoutTriviaQuestion, getNewKnockoutZonaBola, getNewKnockoutFruit, getNewKnockoutAnimal, getNewKnockoutKpopTrivia]);
  
  useEffect(() => {
    // FIX: Changed GameState.Classic to GameStyle.Classic as the check is against state.gameStyle.
    if (state.gameStyle === GameStyle.Classic && state.isRoundActive) {
        const currentMaxWinners = state.gameMode === GameMode.ABC5Dasar && state.availableAnswersCount != null 
              ? Math.min(state.maxWinners, state.availableAnswersCount) 
              : state.maxWinners;
        if (state.roundWinners.length >= currentMaxWinners) {
            dispatch({ type: 'END_ROUND' });
        }
    }
  }, [state.roundWinners.length, state.isRoundActive, state.gameStyle, state.maxWinners, state.gameMode, state.availableAnswersCount]);

  const getCurrentAnswer = () => {
    switch (state.gameMode) {
      case GameMode.GuessTheFlag:
        return state.currentCountry?.name || '';
      case GameMode.GuessTheWord:
        return state.currentWord || '';
      case GameMode.GuessTheCity:
        return state.currentCity?.name || '';
      case GameMode.ABC5Dasar:
        return `(Jawaban Kategori ${state.currentCategory} diawali huruf ${state.currentLetter})`;
      case GameMode.Trivia:
        return state.currentTriviaQuestion?.answer || '';
      case GameMode.ZonaBola:
        return state.currentWord || state.currentStadium?.name || '';
      default:
        return 'Tidak ada soal aktif';
    }
  };

  return { state, startGame, resetGame, processComment, skipRound, pauseGame, resumeGame, registerPlayer, endRegistrationAndDrawBracket, prepareNextMatch, getCurrentKnockoutMatch, returnToBracket, redrawBracket, declareWalkoverWinner, finishGame, resetKnockoutRegistration, restartKnockoutCompetition, returnToModeSelection, finishWinnerDisplay, setHostUsername, currentAnswer: getCurrentAnswer() };
};