
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, RefreshCw, Trophy, Globe, X, Radio, Link as LinkIcon, User, Layers, Users, LayoutGrid, AlertCircle, CheckCircle, KeyRound, Gift, Heart, Lock, Wifi, WifiOff, PlugZap, Move, ZoomIn, ZoomOut, Crown, Medal, Flame, Star, Trash2, Video, Rocket } from 'lucide-react';
import { fetchDictionary, getRandomWord, isValidWord } from './services/wordService';
import { tiktokService } from './services/tiktokConnector';
import Grid from './components/Grid';
import { DictionaryData, GameStatus, GuessData, Language, TikTokChatEvent, TikTokMemberEvent, TikTokGiftEvent, TikTokLikeEvent, ToastMessage, TikTokUserData, PlayerScore, SupporterStats } from './types';

interface MessageData {
  text: string;
  emoji: string;
}

// Praise dictionary
const PRAISE_WORDS: Record<Language, MessageData[]> = {
  ID: [
    { text: 'LUAR BIASA!', emoji: '🤩' },
    { text: 'SEMPURNA!', emoji: '🔥' },
    { text: 'SANGAT HEBAT!', emoji: '💪' },
    { text: 'JENIUS!', emoji: '🧠' },
    { text: 'MANTAP JIWA!', emoji: '😎' },
    { text: 'KEREN ABIS!', emoji: '✨' },
    { text: 'SENSASIONAL!', emoji: '🌟' },
    { text: 'ISTIMEWA!', emoji: '🎉' }
  ],
  EN: [
    { text: 'MAGNIFICENT!', emoji: '🤩' },
    { text: 'OUTSTANDING!', emoji: '🔥' },
    { text: 'BRILLIANT!', emoji: '💎' },
    { text: 'PERFECT!', emoji: '✨' },
    { text: 'SPECTACULAR!', emoji: '🌟' },
    { text: 'GENIUS!', emoji: '🧠' },
    { text: 'UNSTOPPABLE!', emoji: '🚀' },
    { text: 'AMAZING!', emoji: '🎉' }
  ]
};

// Mock/Tease dictionary for losing
const MOCK_MESSAGES: Record<Language, MessageData[]> = {
  ID: [
    { text: 'YAHHH KALAH', emoji: '😜' },
    { text: 'COBA LAGI YA', emoji: '😛' },
    { text: 'BELUM BERUNTUNG', emoji: '🤪' },
    { text: 'ADUH SAYANG SEKALI', emoji: '😝' },
    { text: 'KURANG JAGO NIHH', emoji: '😜' },
    { text: 'UPS, GAGAL DEH', emoji: '🫠' }
  ],
  EN: [
    { text: 'OOPS, YOU LOST', emoji: '😜' },
    { text: 'NICE TRY THOUGH', emoji: '😛' },
    { text: 'BETTER LUCK NEXT TIME', emoji: '🤪' },
    { text: 'SO CLOSE!', emoji: '😝' },
    { text: 'NOT QUITE RIGHT', emoji: '😜' },
    { text: 'GAME OVER', emoji: '🫠' }
  ]
};

// Funny Reconnect Messages
const RECONNECT_JOKES: Record<Language, string[]> = {
  ID: [
    'SABAR WOY, KABELNYA KESANDUNG KUCING 🐈', 
    'LAGI NYARI SINYAL DI ATAS GENTENG 📡', 
    'SERVERNYA NGAMBEK, BENTAR YA 🙏', 
    'ADMIN LAGI NYOLONG WIFI TETANGGA 🤫', 
    'JANGAN KABUR DULU, INI LAGI DIURUS! 🔧',
    'INTERNETNYA LAGI TARIK NAPAS 😮‍💨',
    'LOADING... JANGAN LUPA KEDIP 👁️'
  ],
  EN: [
    'HOLD ON, FEEDING THE SERVER HAMSTERS 🐹', 
    'SEARCHING FOR SIGNAL ON MARS 🚀', 
    'SERVER IS TAKING A NAP, WAKING IT UP... 😴', 
    'WHO TRIPPED OVER THE CABLE?! 🔌', 
    'RECONNECTING... DON\'T PANIC! 😱',
    'WAITING FOR WIFI GODS TO BLESS US 🙏'
  ]
};

// Helper to load supporters synchronously for initial state
const loadSupportersFromStorage = (): Record<string, SupporterStats> => {
    try {
        const saved = localStorage.getItem('wordle_supporters');
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};

const App: React.FC = () => {
  // Config State
  const [language, setLanguage] = useState<Language>('ID');
  const [wordLength, setWordLength] = useState<number>(5);
  
  // Game Settings
  const [maxGuesses, setMaxGuesses] = useState<number>(6);
  const [maxGuessesPerUser, setMaxGuessesPerUser] = useState<number>(3); // Default 3 for easier testing
  
  // Restart Settings
  const [restartCoinTarget, setRestartCoinTarget] = useState<number>(1); // Default 1 coin
  const [restartLikeTarget, setRestartLikeTarget] = useState<number>(100); // Default 100 likes
  
  // Gift Video Settings
  const [giftVideoUrl, setGiftVideoUrl] = useState<string>('https://assets.mixkit.co/videos/preview/mixkit-golden-particles-falling-on-a-black-background-3518-large.mp4');
  const [showGiftVideo, setShowGiftVideo] = useState(false);
  const giftVideoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  
  // Layout / Drag State for GRID
  const [isDragMode, setIsDragMode] = useState(false);
  const [gridPosition, setGridPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const gridStartPos = useRef({ x: 0, y: 0 });

  // Layout / Drag State for STATS WIDGETS
  const [gifterPos, setGifterPos] = useState({ x: 20, y: 80 });
  const [likerPos, setLikerPos] = useState({ x: 20, y: 140 });
  const [widgetScale, setWidgetScale] = useState(0.85);

  const dragWidgetRef = useRef<'gifter' | 'liker' | null>(null);
  const widgetStartPosRef = useRef({ x: 0, y: 0 });
  
  // TikTok State
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [tiktokSessionId, setTiktokSessionId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false); 
  const [reconnectJoke, setReconnectJoke] = useState(''); // New State for funny message
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');

  // Data State
  const [dictionary, setDictionary] = useState<DictionaryData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Game State
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<GuessData[]>([]);
  // Synchronous mirror of guesses for immediate logic checks
  const guessesRef = useRef<GuessData[]>([]);
  
  const [userGuessCounts, setUserGuessCounts] = useState<Record<string, number>>({});
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [shake, setShake] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Praise & Winner State
  const [praise, setPraise] = useState<MessageData | null>(null);
  const [winner, setWinner] = useState<TikTokUserData | null>(null);

  // Leaderboard & Ranking State (Persisted)
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>(() => {
    try {
      const saved = localStorage.getItem('wordle_leaderboard');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const leaderboardListRef = useRef<HTMLDivElement>(null);
  
  const [hostScore, setHostScore] = useState(() => {
    try {
      const saved = localStorage.getItem('wordle_hostScore');
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // GLOBAL SUPPORTER STATS (Top Likers & Gifters) (Persisted)
  const allSupportersRef = useRef<Record<string, SupporterStats>>(loadSupportersFromStorage());
  
  const [topLikers, setTopLikers] = useState<SupporterStats[]>(() => {
     const all = Object.values(allSupportersRef.current) as SupporterStats[];
     return all.filter(u => u.totalLikes > 0).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 5);
  });
  
  const [topGifters, setTopGifters] = useState<SupporterStats[]>(() => {
     const all = Object.values(allSupportersRef.current) as SupporterStats[];
     return all.filter(u => u.totalCoins > 0).sort((a, b) => b.totalCoins - a.totalCoins).slice(0, 5);
  });
  
  // Restart Logic State
  const [isWaitingForRestart, setIsWaitingForRestart] = useState(false);
  const [showRestartOverlay, setShowRestartOverlay] = useState(false);
  const [showNewRoundOverlay, setShowNewRoundOverlay] = useState(false); // NEW STATE for 3s delay
  const [currentRestartCoins, setCurrentRestartCoins] = useState(0);
  const [currentRestartLikes, setCurrentRestartLikes] = useState(0);
  const baselineLikeCountRef = useRef<number | null>(null); 

  // Queue System
  const [queueLength, setQueueLength] = useState(0);
  const guessQueueRef = useRef<{word: string, user?: any}[]>([]);
  
  // -- CRITICAL FIX --
  // Immediate ref to lock game logic faster than state updates
  const isGameActiveRef = useRef(false);

  const isProcessingRef = useRef(false);
  const ANIMATION_DELAY = 1500;
  
  // Ref to hold the processQueue function to avoid circular dependencies
  const processQueueRef = useRef<() => void>(() => {});

  // Persist Leaderboard & Host Score
  useEffect(() => {
    localStorage.setItem('wordle_leaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    localStorage.setItem('wordle_hostScore', hostScore.toString());
  }, [hostScore]);


  const addToast = (msg: string, type: 'default' | 'error' | 'success' = 'default') => {
    const id = Date.now();
    setToasts(prev => {
      let currentToasts = prev;
      if (type === 'error') {
        currentToasts = prev.filter(t => t.type !== 'error');
      }
      if (currentToasts.length > 2) {
        currentToasts = currentToasts.slice(1);
      }
      return [...currentToasts, { id, message: msg, type }];
    });
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Helper to update leaderboard
  const updateLeaderboard = (user: TikTokUserData, points: number) => {
    setLeaderboard(prev => {
      const existingUserIndex = prev.findIndex(p => p.userId === user.userId);
      let newBoard = [...prev];
      
      if (existingUserIndex >= 0) {
        newBoard[existingUserIndex] = {
          ...newBoard[existingUserIndex],
          score: newBoard[existingUserIndex].score + points,
          wins: newBoard[existingUserIndex].wins + 1,
          nickname: user.nickname, // Update latest nickname/pfp
          profilePictureUrl: user.profilePictureUrl
        };
      } else {
        newBoard.push({
          userId: user.userId,
          uniqueId: user.uniqueId,
          nickname: user.nickname,
          profilePictureUrl: user.profilePictureUrl,
          score: points,
          wins: 1
        });
      }
      
      // Sort by score desc, take top 10
      return newBoard.sort((a, b) => b.score - a.score).slice(0, 10);
    });
  };

  // Helper to update global stats
  const updateSupporterStats = (user: {userId: string, uniqueId: string, nickname: string, profilePictureUrl: string}, type: 'like' | 'gift', amount: number) => {
      const currentStats = allSupportersRef.current[user.userId] || {
          userId: user.userId,
          uniqueId: user.uniqueId,
          nickname: user.nickname,
          profilePictureUrl: user.profilePictureUrl,
          totalLikes: 0,
          totalCoins: 0
      };

      // Update values
      if (type === 'like') currentStats.totalLikes += amount;
      if (type === 'gift') currentStats.totalCoins += amount;
      
      // Update nickname/pfp in case it changed
      currentStats.nickname = user.nickname;
      currentStats.profilePictureUrl = user.profilePictureUrl;

      allSupportersRef.current[user.userId] = currentStats;

      // Save to localStorage
      localStorage.setItem('wordle_supporters', JSON.stringify(allSupportersRef.current));

      // Recalculate Tops (throttled slightly in a real app, but direct here for simplicity)
      const allUsers = Object.values(allSupportersRef.current) as SupporterStats[];
      
      if (type === 'gift') {
          const sortedGifters = [...allUsers]
             .filter(u => u.totalCoins > 0)
             .sort((a, b) => b.totalCoins - a.totalCoins)
             .slice(0, 5);
          setTopGifters(sortedGifters);
      }
      
      if (type === 'like') {
          const sortedLikers = [...allUsers]
             .filter(u => u.totalLikes > 0)
             .sort((a, b) => b.totalLikes - a.totalLikes)
             .slice(0, 5);
          setTopLikers(sortedLikers);
      }
  };

  const resetRankingData = () => {
    if (confirm('Reset the main Leaderboard and Host Score? This cannot be undone.')) {
        setLeaderboard([]);
        setHostScore(0);
        localStorage.removeItem('wordle_leaderboard');
        localStorage.removeItem('wordle_hostScore');
        addToast('Ranking data has been reset!', 'success');
    }
  };

  const resetSupporterStats = () => {
    if (confirm('Reset all Top Liker and Top Gifter stats? This cannot be undone.')) {
        allSupportersRef.current = {};
        setTopLikers([]);
        setTopGifters([]);
        localStorage.removeItem('wordle_supporters');
        addToast('Supporter stats have been reset!', 'success');
    }
  };


  // --- GAME INITIALIZATION ---

  const initGame = useCallback(async () => {
    setLoading(true);
    // Explicitly lock game during transition
    isGameActiveRef.current = false;
    
    // Clear Queue completely
    guessQueueRef.current = [];
    setQueueLength(0);
    
    // Reset Guesses Ref
    guessesRef.current = [];

    setGameStatus(GameStatus.PLAYING);
    setGuesses([]);
    setUserGuessCounts({});
    setCurrentGuess('');
    setShake(false);
    setPraise(null);
    setWinner(null);
    setShowLeaderboard(false);
    setShowRestartOverlay(false);
    
    // Show the "New Round" Overlay
    setShowNewRoundOverlay(true);
    
    // Reset restart counters
    setIsWaitingForRestart(false);
    setCurrentRestartCoins(0);
    setCurrentRestartLikes(0); // Reset likes as well
    baselineLikeCountRef.current = null; // Reset baseline

    isProcessingRef.current = false;
    
    try {
      const dict = await fetchDictionary(language);
      setDictionary(dict);
      
      const word = getRandomWord(dict, wordLength);
      if (!word) {
        addToast(`No ${wordLength}-letter words found`, 'error');
        // Fallback to prevent hang
        setTargetWord('RESET');
      } else {
        setTargetWord(word);
        console.log('Target:', word); 
      }
    } catch (e) {
      addToast('Error loading dictionary', 'error');
      // Fallback
      setTargetWord('RESET');
    }
    
    // Force a 3-second delay for the "New Round" animation
    setTimeout(() => {
        setShowNewRoundOverlay(false);
        setLoading(false);
        isGameActiveRef.current = true; // Unlock inputs now
        // Ensure queue is empty again before enabling inputs
        guessQueueRef.current = []; 
        setQueueLength(0);
    }, 3000);

  }, [language, wordLength]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // --- CORE GAME LOGIC (Refactored to avoid stale closures) ---

  // 1. Define processGuess using useCallback
  const processGuess = useCallback((guessWord: string, user?: TikTokUserData) => {
    // Strict Input Gate
    if (!isGameActiveRef.current || loading) {
        return;
    }

    // Wrap in try-catch to ensure robustness against crashes
    try {
        if (user && maxGuessesPerUser > 0) {
            const currentCount = userGuessCounts[user.userId] || 0;
            if (currentCount >= maxGuessesPerUser) {
                console.log(`User ${user.nickname} limit reached`);
                processQueueRef.current(); // Call queue via Ref
                return;
            }
        }
        
        if (!dictionary || !isValidWord(guessWord, dictionary)) {
           setShake(true);
           const invalidMsg = user ? `Kata "${guessWord}" tidak ada di kamus!` : `Kata "${guessWord}" tidak valid!`;
           addToast(invalidMsg, 'error');
           setTimeout(() => setShake(false), 500);
           processQueueRef.current(); // Call queue via Ref
           return;
        }

        isProcessingRef.current = true;
        const newGuessObj: GuessData = { word: guessWord, user };
        
        // Update Guesses Sync via Ref to prevent stale closures/race conditions
        const updatedGuesses = [...guessesRef.current, newGuessObj];
        guessesRef.current = updatedGuesses;

        let isGameOver = false;
        
        // Update User Counts State
        if (user) {
            setUserGuessCounts(prevCounts => ({
                ...prevCounts,
                [user.userId]: (prevCounts[user.userId] || 0) + 1
            }));
        }

        // CHECK WIN/LOSS SYNCHRONOUSLY
        if (guessWord === targetWord) {
            // WIN
            isGameActiveRef.current = false; // LOCK IMMEDIATELY
            guessQueueRef.current = []; // NUKE QUEUE
            setQueueLength(0);
            
            setGameStatus(GameStatus.WON);
            isGameOver = true;
            addToast(`Benar! Oleh ${user?.nickname || 'Kamu'}`, 'success');
            
            // Calculate points: maxGuesses - (rowIndex). rowIndex is length-1.
            const points = maxGuesses - (updatedGuesses.length - 1);
            if (user) {
              setWinner(user);
              updateLeaderboard(user, points > 0 ? points : 1);
            }

        } else if (updatedGuesses.length >= maxGuesses) {
            // LOST
            isGameActiveRef.current = false; // LOCK IMMEDIATELY
            guessQueueRef.current = []; // NUKE QUEUE
            setQueueLength(0);

            setGameStatus(GameStatus.LOST);
            isGameOver = true;
            
            setHostScore(h => h + 1);
        }

        // Update Visual State
        setGuesses(updatedGuesses);
        setCurrentGuess('');

        setTimeout(() => {
            // Only process next item if game is NOT over
            if (!isGameOver && isGameActiveRef.current) {
                isProcessingRef.current = false;
                processQueueRef.current(); // Call queue via Ref
            } else {
                 isProcessingRef.current = false; 
            }
        }, ANIMATION_DELAY);
    } catch (e) {
        console.error("Critical error in processGuess:", e);
        // Force release lock so queue doesn't stick
        isProcessingRef.current = false;
        processQueueRef.current(); // Call queue via Ref
    }
  }, [loading, targetWord, dictionary, maxGuessesPerUser, maxGuesses, language, userGuessCounts]);

  // 2. Define processQueue using useCallback
  const processQueue = useCallback(() => {
    // Check Ref instead of State for immediate response
    if (isProcessingRef.current || guessQueueRef.current.length === 0 || !isGameActiveRef.current) {
      return;
    }
    const nextItem = guessQueueRef.current.shift();
    setQueueLength(guessQueueRef.current.length);
    if (nextItem) {
      processGuess(nextItem.word, nextItem.user);
    }
  }, [processGuess]); 

  // 3. Sync processQueueRef
  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  // Auto-process queue effect
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && !loading && targetWord && guessQueueRef.current.length > 0) {
      processQueue();
    }
  }, [gameStatus, loading, targetWord, processQueue]);

  // LEADERBOARD AUTO SCROLL EFFECT
  useEffect(() => {
    if (showLeaderboard && leaderboardListRef.current) {
        // Reset scroll position immediately
        leaderboardListRef.current.scrollTop = 0;

        // If we have more than 5 users, we initiate auto-scroll
        if (leaderboard.length > 5) {
            const scrollTimer = setTimeout(() => {
                if (leaderboardListRef.current) {
                    leaderboardListRef.current.scrollTo({
                        top: leaderboardListRef.current.scrollHeight, // Scroll to bottom
                        behavior: 'smooth'
                    });
                }
            }, 3500); // Wait 3.5s before scrolling

            return () => clearTimeout(scrollTimer);
        }
    }
  }, [showLeaderboard, leaderboard.length]);

  // END GAME SEQUENCE MANAGER (TIMELINE)
  useEffect(() => {
    if (gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST) {
      // 1. LOCK & WAIT (Start Timeline)
      setIsWaitingForRestart(true);
      setShowRestartOverlay(false);
      setShowLeaderboard(false);
      setPraise(null); // Clear previous praise
      
      // -- T + 1s: Show Praise --
      const praiseTimer = setTimeout(() => {
          if (gameStatus === GameStatus.WON) {
             const praises = PRAISE_WORDS[language];
             setPraise(praises[Math.floor(Math.random() * praises.length)]);
          } else {
             const mocks = MOCK_MESSAGES[language];
             setPraise(mocks[Math.floor(Math.random() * mocks.length)]);
          }
      }, 1000); 

      // -- T + 5s: Hide Praise, Show Leaderboard --
      const leaderboardTimer = setTimeout(() => {
        setPraise(null);
        setShowLeaderboard(true);
      }, 5000); 

      // -- T + 14s: Hide Leaderboard, Show Locked or Restart --
      const restartTimer = setTimeout(() => {
         setShowLeaderboard(false);
         
         if (restartCoinTarget === 0 && restartLikeTarget === 0) {
             initGame(); // Auto restart
         } else {
             setShowRestartOverlay(true); // Locked mode
         }
      }, 14000);

      return () => {
        clearTimeout(praiseTimer);
        clearTimeout(leaderboardTimer);
        clearTimeout(restartTimer);
      };
    } else {
        // PLAYING or IDLE
        setShowRestartOverlay(false);
        setShowLeaderboard(false);
        setPraise(null);
    }
  }, [gameStatus, restartCoinTarget, restartLikeTarget, initGame, language]);

  // Check if restart targets met (MANUAL TRIGGER)
  useEffect(() => {
      // FIX: Strictly wait for the "Locked" overlay state.
      // This forces the game to play the full Praise -> Leaderboard sequence (approx 14s)
      // before checking if the targets are met to start the new round.
      if (isWaitingForRestart && showRestartOverlay) {
          if ((restartCoinTarget > 0 && currentRestartCoins >= restartCoinTarget) || 
              (restartLikeTarget > 0 && currentRestartLikes >= restartLikeTarget)) {
              
              addToast("Target Reached! Starting Game...", "success");
              setTimeout(() => initGame(), 500);
          }
      }
  }, [isWaitingForRestart, showRestartOverlay, currentRestartCoins, currentRestartLikes, restartCoinTarget, restartLikeTarget, initGame]);


  // --- TIKTOK LOGIC & HANDLERS ---

  const handleTikTokGuess = (msg: TikTokChatEvent) => {
      // STRICT BLOCKING: Check ALL overlay/lock states
      // If ANY overlay is showing, we must reject the guess
      if (
          !isGameActiveRef.current || 
          isWaitingForRestart || 
          loading || 
          praise !== null || 
          showLeaderboard || 
          showRestartOverlay || 
          showNewRoundOverlay
      ) {
          return;
      }

      if (guessQueueRef.current.length > 50) return;
      const potentialWords = msg.comment.toUpperCase().split(/[^A-Z]+/);
      const cleanGuess = potentialWords.find(w => w.length === wordLength);
      if (!cleanGuess) return;
      
      guessQueueRef.current.push({
        word: cleanGuess,
        user: {
          userId: msg.userId,
          uniqueId: msg.uniqueId,
          nickname: msg.nickname,
          profilePictureUrl: msg.profilePictureUrl
        }
      });
      setQueueLength(guessQueueRef.current.length);
      processQueue();
  };

  const triggerGiftOverlay = () => {
    setShowGiftVideo(true);
    if (giftVideoTimerRef.current) clearTimeout(giftVideoTimerRef.current);
    
    giftVideoTimerRef.current = setTimeout(() => {
       setShowGiftVideo(false);
    }, 5000); // Play for 5 seconds
  };

  const handleTikTokGift = (msg: TikTokGiftEvent) => {
      // FIX: TikTok emits streakable gifts (type 1) twice (progress + end).
      // We ignore the 'repeatEnd' event to prevent double counting.
      if (msg.giftType === 1 && msg.repeatEnd) {
          return;
      }

      // Trigger Video Overlay
      if (msg.diamondCount > 0 && giftVideoUrl) {
          triggerGiftOverlay();
      }

      // Global Tracking
      if(msg.diamondCount > 0) {
          updateSupporterStats(
              { userId: msg.userId, uniqueId: msg.uniqueId, nickname: msg.nickname, profilePictureUrl: msg.profilePictureUrl },
              'gift',
              msg.diamondCount
          );
      }

      // Restart Logic
      if (isWaitingForRestart) {
          if(msg.diamondCount > 0) {
             setCurrentRestartCoins(prev => prev + msg.diamondCount);
          }
      }
  };

  const handleTikTokLike = (msg: TikTokLikeEvent) => {
      const thisBatch = Number(msg.likeCount);
      
      // Global Tracking (Accumulate batch counts for user leaderboard)
      if (thisBatch > 0) {
          updateSupporterStats(
              { userId: msg.userId, uniqueId: msg.uniqueId, nickname: msg.nickname, profilePictureUrl: msg.profilePictureUrl },
              'like',
              thisBatch
          );
      }

      // Restart Logic (Diff strategy for accuracy against total)
      if (isWaitingForRestart) {
          const currentTotal = Number(msg.totalLikeCount);

          if (baselineLikeCountRef.current === null) {
              baselineLikeCountRef.current = currentTotal - thisBatch;
          }

          const likesSinceStart = currentTotal - (baselineLikeCountRef.current || 0);
          
          if (currentTotal > 0 && likesSinceStart >= 0) {
              setCurrentRestartLikes(likesSinceStart);
          } else {
               setCurrentRestartLikes(prev => prev + thisBatch);
          }
      }
  };

  // Store handlers in refs
  const handleTikTokGuessRef = useRef(handleTikTokGuess);
  const handleTikTokGiftRef = useRef(handleTikTokGift);
  const handleTikTokLikeRef = useRef(handleTikTokLike);

  // Sync refs on render
  useEffect(() => {
    handleTikTokGuessRef.current = handleTikTokGuess;
    handleTikTokGiftRef.current = handleTikTokGift;
    handleTikTokLikeRef.current = handleTikTokLike;
  });

  // Reconnection Effect
  useEffect(() => {
    if (isReconnecting) {
        const jokes = RECONNECT_JOKES[language];
        setReconnectJoke(jokes[Math.floor(Math.random() * jokes.length)]);
    }
  }, [isReconnecting, language]);

  // SETUP SOCKET
  useEffect(() => {
    tiktokService.connectToBackend();

    const onChat = (msg: TikTokChatEvent) => handleTikTokGuessRef.current(msg);
    const onGift = (msg: TikTokGiftEvent) => handleTikTokGiftRef.current(msg);
    const onLike = (msg: TikTokLikeEvent) => handleTikTokLikeRef.current(msg);

    const onConnected = (state: any) => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionStatus(`Connected to room ${state.roomId}`);
      addToast('Terhubung ke TikTok Live!', 'success');
    };

    const onDisconnected = (msg: string) => {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    };

    const onReconnecting = () => {
        setIsReconnecting(true);
        setConnectionStatus('Reconnecting...');
    };

    const onReconnectSuccess = () => {
        setIsReconnecting(false);
        setIsConnected(true);
        setConnectionStatus('Reconnected!');
        addToast('Koneksi pulih!', 'success');
    };

    const onReconnectFailed = () => {
        setIsReconnecting(false);
        setIsConnected(false);
        setConnectionStatus('Connection Failed');
        addToast('Gagal menyambung ulang.', 'error');
    };

    tiktokService.onChat(onChat);
    tiktokService.onGift(onGift);
    tiktokService.onLike(onLike);
    
    // Connection Events
    tiktokService.onConnected(onConnected);
    tiktokService.onDisconnected(onDisconnected);
    tiktokService.onReconnecting(onReconnecting);
    tiktokService.onReconnectSuccess(onReconnectSuccess);
    tiktokService.onReconnectFailed(onReconnectFailed);
    
    tiktokService.onError((err) => {
        console.error("Socket error:", err);
        if(err.includes("websocket upgrade") || err.includes("sessionId")) {
            addToast("Gagal koneksi: Butuh Session ID (Cek Settings)", "error");
        }
    });

    return () => {
      tiktokService.offChat(onChat);
      tiktokService.offGift(onGift);
      tiktokService.offLike(onLike);
      tiktokService.disconnect();
    };
  }, []);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (tiktokUsername) {
      tiktokService.setUniqueId(tiktokUsername, tiktokSessionId);
      setShowConnect(false);
      addToast(`Connecting to @${tiktokUsername}...`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') initGame(); 
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initGame]);

  // --- DRAG / LAYOUT LOGIC MAIN GRID ---
  
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragMode) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    gridStartPos.current = { x: gridPosition.x, y: gridPosition.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragMode || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    setGridPosition({
      x: gridStartPos.current.x + dx,
      y: gridStartPos.current.y + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragMode) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // --- DRAG / LAYOUT LOGIC STATS WIDGETS ---
  const handleWidgetDown = (e: React.PointerEvent, type: 'gifter' | 'liker') => {
      if (!isDragMode) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      
      if (type === 'gifter') {
          widgetStartPosRef.current = { ...gifterPos };
          dragWidgetRef.current = 'gifter';
      } else {
          widgetStartPosRef.current = { ...likerPos };
          dragWidgetRef.current = 'liker';
      }
  };

  const handleWidgetMove = (e: React.PointerEvent) => {
      if (!isDragMode || !dragWidgetRef.current) return;
      e.stopPropagation();

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;

      const newPos = {
          x: widgetStartPosRef.current.x + dx,
          y: widgetStartPosRef.current.y + dy
      };

      if (dragWidgetRef.current === 'gifter') setGifterPos(newPos);
      else setLikerPos(newPos);
  };

  const handleWidgetUp = (e: React.PointerEvent) => {
      if (!isDragMode) return;
      e.stopPropagation();
      dragWidgetRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
  }


  const letterOptions = Array.from({ length: 12 }, (_, i) => i + 4);

  // Helper for Header Badge Color
  const getBadgeStyle = () => {
      if (isReconnecting) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse';
      if (isConnected) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
  };
  
  const getBadgeText = () => {
      if (isReconnecting) return 'RECONNECTING...';
      if (isConnected) return 'LIVE';
      return 'CONNECT TIKTOK';
  };

  const getBadgeDot = () => {
      if (isReconnecting) return 'bg-amber-500 animate-ping';
      if (isConnected) return 'bg-emerald-500';
      return 'bg-rose-500';
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      
      {/* --- GIFT VIDEO OVERLAY --- */}
      {showGiftVideo && giftVideoUrl && (
         <div className="absolute inset-0 z-[45] pointer-events-none flex items-center justify-center overflow-hidden">
             <video 
                src={giftVideoUrl} 
                autoPlay 
                muted 
                loop 
                className="w-full h-full object-cover animate-fade-in mix-blend-screen opacity-90"
             />
         </div>
      )}

      {/* --- TOP GIFTERS HORIZONTAL BAR --- */}
      <div
        className={`absolute z-30 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-950/85 backdrop-blur-sm border border-amber-500/30 shadow-2xl select-none transition-transform duration-75 overflow-hidden ${isDragMode ? 'cursor-move touch-none border-2 border-dashed border-amber-500/80' : ''}`}
        onPointerDown={(e) => handleWidgetDown(e, 'gifter')}
        onPointerMove={handleWidgetMove}
        onPointerUp={handleWidgetUp}
        onPointerCancel={handleWidgetUp}
        style={{
            transform: `translate(${gifterPos.x}px, ${gifterPos.y}px) scale(${widgetScale})`,
            width: '320px',
            transformOrigin: 'left center'
        }}
      >
         <div className="flex items-center gap-1.5 text-amber-300 font-black whitespace-nowrap border-r border-white/20 pr-3 mr-1 drop-shadow-md">
             <Gift size={18} className="animate-bounce" />
             <span className="text-xs uppercase tracking-wider">TOP GIFTERS</span>
         </div>
         
         <div className="flex-1 overflow-hidden relative h-6 w-full mask-linear-fade">
             <div className="flex gap-6 items-center absolute whitespace-nowrap animate-marquee">
                 {/* Duplicate content for seamless loop */}
                 {[...topGifters, ...topGifters].length > 0 ? (
                     [...topGifters, ...topGifters].map((user, i) => (
                         <div key={`${user.userId}-${i}`} className="flex items-center gap-2">
                             <span className="text-amber-400 font-bold text-xs drop-shadow-sm">#{ (i % topGifters.length) + 1}</span>
                             <img src={user.profilePictureUrl} className="w-5 h-5 rounded-full border border-zinc-600 shadow-sm" alt=""/>
                             <span className="text-white text-xs font-bold drop-shadow-md">{user.nickname}</span>
                             <span className="text-[10px] text-amber-300 font-bold drop-shadow-sm">({user.totalCoins})</span>
                         </div>
                     ))
                 ) : (
                     <span className="text-zinc-500 text-xs italic">Waiting for gifts... 🎁</span>
                 )}
             </div>
         </div>

         {/* Zoom Controls (Visible in Drag Mode) */}
         {isDragMode && (
              <div 
                  onPointerDown={(e) => e.stopPropagation()} 
                  className="absolute -top-10 left-0 bg-zinc-900/90 text-white text-[10px] p-1 rounded-lg flex gap-2 pointer-events-auto z-50 shadow-lg"
              >
                  <button onClick={() => setWidgetScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-zinc-700 rounded"><ZoomOut size={14}/></button>
                  <span className="p-1 min-w-[30px] text-center">{Math.round(widgetScale * 100)}%</span>
                  <button onClick={() => setWidgetScale(s => Math.min(1.5, s + 0.1))} className="p-1 hover:bg-zinc-700 rounded"><ZoomIn size={14}/></button>
              </div>
         )}
      </div>

      {/* --- TOP LIKERS HORIZONTAL BAR --- */}
      <div
        className={`absolute z-30 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-950/85 backdrop-blur-sm border border-rose-500/30 shadow-2xl select-none transition-transform duration-75 overflow-hidden ${isDragMode ? 'cursor-move touch-none border-2 border-dashed border-rose-500/80' : ''}`}
        onPointerDown={(e) => handleWidgetDown(e, 'liker')}
        onPointerMove={handleWidgetMove}
        onPointerUp={handleWidgetUp}
        onPointerCancel={handleWidgetUp}
        style={{
            transform: `translate(${likerPos.x}px, ${likerPos.y}px) scale(${widgetScale})`,
            width: '320px',
            transformOrigin: 'left center'
        }}
      >
         <div className="flex items-center gap-1.5 text-rose-300 font-black whitespace-nowrap border-r border-white/20 pr-3 mr-1 drop-shadow-md">
             <Heart size={18} className="animate-pulse" />
             <span className="text-xs uppercase tracking-wider">TOP LIKERS</span>
         </div>
         
         <div className="flex-1 overflow-hidden relative h-6 w-full mask-linear-fade">
             <div className="flex gap-6 items-center absolute whitespace-nowrap animate-marquee">
                 {/* Duplicate content for seamless loop */}
                 {[...topLikers, ...topLikers].length > 0 ? (
                     [...topLikers, ...topLikers].map((user, i) => (
                         <div key={`${user.userId}-${i}`} className="flex items-center gap-2">
                             <span className="text-rose-400 font-bold text-xs drop-shadow-sm">#{ (i % topLikers.length) + 1}</span>
                             <img src={user.profilePictureUrl} className="w-5 h-5 rounded-full border border-zinc-600 shadow-sm" alt=""/>
                             <span className="text-white text-xs font-bold drop-shadow-md">{user.nickname}</span>
                             <span className="text-[10px] text-rose-300 font-bold drop-shadow-sm">({user.totalLikes})</span>
                         </div>
                     ))
                 ) : (
                     <span className="text-zinc-500 text-xs italic">Tap tap tap! ❤️</span>
                 )}
             </div>
         </div>
      </div>


      {/* TOAST NOTIFICATIONS */}
      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`px-6 py-3 rounded-full font-bold shadow-2xl backdrop-blur-md animate-pop flex items-center gap-2 border ${toast.type === 'error' ? 'bg-rose-600 text-white border-rose-400' : toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-zinc-800 text-white border-zinc-500'}`}>
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'success' && <CheckCircle size={18} />}
            <span className="text-sm tracking-wide text-center drop-shadow-md">{toast.message}</span>
          </div>
        ))}
      </div>
      
      {/* NEW ROUND STARTING OVERLAY */}
      {showNewRoundOverlay && (
         <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in pointer-events-none">
            <Rocket size={80} className="text-indigo-400 mb-6 animate-bounce drop-shadow-[0_0_25px_rgba(99,102,241,0.6)]" />
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 drop-shadow-xl animate-pulse text-center leading-tight">
               NEW ROUND<br/>STARTING...
            </h1>
            <div className="mt-8 flex gap-2">
               <div className="w-4 h-4 bg-indigo-500 rounded-full animate-ping"></div>
               <div className="w-4 h-4 bg-purple-500 rounded-full animate-ping delay-100"></div>
               <div className="w-4 h-4 bg-pink-500 rounded-full animate-ping delay-200"></div>
            </div>
            <p className="text-zinc-400 mt-4 font-bold tracking-widest text-sm uppercase">Get Ready to Guess!</p>
         </div>
      )}

      {/* RECONNECTING OVERLAY (FUNNY) */}
      {isReconnecting && (
        <div className="absolute inset-0 z-[70] bg-amber-600/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-fade-in text-center">
            <WifiOff size={80} className="text-white mb-6 animate-shake drop-shadow-lg" />
            <h2 className="text-4xl font-black text-white drop-shadow-md mb-4 tracking-wider">CONNECTION LOST!</h2>
            <p className="text-2xl text-amber-100 font-bold italic animate-pulse">"{reconnectJoke}"</p>
            <div className="mt-8 flex gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-200"></div>
            </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="z-40 p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex flex-col">
              <h1 className="text-lg sm:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 drop-shadow-md">
                WORDLE LIVE
              </h1>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Interactive Game</span>
          </div>

          {/* Connection Badge */}
          <button 
            onClick={() => setShowConnect(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wide transition-all shadow-md ${getBadgeStyle()}`}
          >
            <div className={`w-2 h-2 rounded-full ${getBadgeDot()}`} />
            {getBadgeText()}
          </button>
        </div>

        <div className="flex gap-2 items-center">
            {/* Zoom Controls */}
            <div className="flex bg-zinc-800 rounded-lg p-1 border border-zinc-700">
               <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"><ZoomOut size={16}/></button>
               <span className="text-[10px] text-zinc-500 w-8 flex items-center justify-center font-mono">{Math.round(scale * 100)}%</span>
               <button onClick={() => setScale(s => Math.min(1.5, s + 0.1))} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"><ZoomIn size={16}/></button>
            </div>

            {/* Layout Toggle */}
            <button 
              onClick={() => setIsDragMode(!isDragMode)}
              className={`p-2 rounded-lg transition-all ${isDragMode ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
              title="Adjust Layout"
            >
              <LayoutGrid size={20} />
            </button>

            {/* Settings Toggle */}
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </button>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 relative flex flex-col min-h-0 touch-none">
        
        {/* GRID CONTAINER (DRAGGABLE & ZOOMABLE) */}
        <div 
           className={`absolute top-0 left-0 w-full h-full flex items-center justify-center ${isDragMode ? 'cursor-move' : ''}`}
           onPointerDown={handlePointerDown}
           onPointerMove={handlePointerMove}
           onPointerUp={handlePointerUp}
           onPointerCancel={handlePointerUp}
        >
            <div 
               style={{ 
                   transform: `translate(${gridPosition.x}px, ${gridPosition.y}px) scale(${scale})`,
                   transformOrigin: 'center center',
                   transition: isDragMode ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
               }}
               className={`w-full max-w-3xl flex flex-col items-center justify-center ${isDragMode ? 'border-2 border-dashed border-indigo-500/50 rounded-2xl bg-indigo-500/5' : ''}`}
            >
                <Grid 
                  guesses={guesses}
                  currentGuess={currentGuess}
                  targetWord={targetWord}
                  wordLength={wordLength}
                  maxGuesses={maxGuesses}
                  isShake={shake}
                />
            </div>
        </div>

        {/* OVERLAYS */}
        
        {/* PRAISE / MOCK OVERLAY */}
        {praise && !showLeaderboard && !showRestartOverlay && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pb-52 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-none">
            <div className="animate-pop flex flex-col items-center">
               <div className="text-6xl mb-4 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] filter contrast-125 saturate-150 transform hover:scale-110 transition-transform">
                  {praise.emoji}
               </div>
               <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-center tracking-tighter leading-none">
                 {praise.text}
               </h1>
            </div>

            {winner && (
              <div className="mt-8 flex flex-col items-center animate-slide-up bg-zinc-900/80 p-6 rounded-2xl border border-emerald-500/30 shadow-2xl backdrop-blur-md">
                <div className="relative">
                   <img src={winner.profilePictureUrl} alt="" className="w-24 h-24 rounded-full border-4 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]" />
                   <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                      <Trophy size={20} fill="white" />
                   </div>
                </div>
                <div className="mt-4 text-center">
                    <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1">WINNER</p>
                    <p className="text-2xl font-black text-white drop-shadow-md">{winner.nickname}</p>
                    <p className="text-emerald-400 font-bold">@{winner.uniqueId}</p>
                </div>
              </div>
            )}
            
            {/* Show Correct Word on Loss */}
            {gameStatus === GameStatus.LOST && (
                <div className="mt-8 flex flex-col items-center animate-slide-up bg-rose-950/80 p-6 rounded-2xl border border-rose-500/30 shadow-2xl backdrop-blur-md">
                    <p className="text-rose-300 text-sm font-bold uppercase tracking-wider mb-2">THE WORD WAS</p>
                    <p className="text-4xl font-black text-white tracking-widest drop-shadow-[0_2px_10px_rgba(225,29,72,0.6)]">{targetWord}</p>
                </div>
            )}
          </div>
        )}
        
        {/* LEADERBOARD OVERLAY */}
        {showLeaderboard && (
            <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in">
                <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <Crown size={48} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-bounce" fill="currentColor" />
                        <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">LEADERBOARD</h2>
                    </div>
                    
                    {/* HOST SCORE CARD */}
                    <div className="bg-gradient-to-r from-rose-900/50 to-rose-800/50 rounded-xl p-4 mb-6 border border-rose-500/30 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="bg-rose-500/20 p-2 rounded-lg"><Flame size={24} className="text-rose-400" /></div>
                            <div>
                                <p className="text-rose-200 text-xs font-bold uppercase tracking-wider">HOST WINS</p>
                                <p className="text-white text-lg font-bold">The House</p>
                            </div>
                        </div>
                        <span className="text-3xl font-black text-rose-400 drop-shadow-md">{hostScore}</span>
                    </div>

                    {/* USERS LIST */}
                    <div ref={leaderboardListRef} className="space-y-3 max-h-[380px] overflow-hidden pr-2 relative">
                        {leaderboard.map((user, index) => {
                             let rankStyle = "bg-zinc-800/50 border-zinc-700/50 text-zinc-400";
                             let icon = <span className="font-mono font-bold text-zinc-500 w-6 text-center">#{index+1}</span>;
                             
                             if (index === 0) {
                                 rankStyle = "bg-gradient-to-r from-amber-900/40 to-amber-800/40 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
                                 icon = <Crown size={20} className="text-amber-400" fill="currentColor"/>;
                             } else if (index === 1) {
                                 rankStyle = "bg-gradient-to-r from-zinc-800 to-zinc-700 border-zinc-400/30";
                                 icon = <Medal size={20} className="text-zinc-300" />;
                             } else if (index === 2) {
                                 rankStyle = "bg-gradient-to-r from-orange-900/30 to-orange-800/30 border-orange-700/30";
                                 icon = <Medal size={20} className="text-orange-400" />;
                             }

                             return (
                                <div key={user.userId} className={`flex items-center justify-between p-3 rounded-xl border ${rankStyle} backdrop-blur-sm transition-all hover:scale-[1.02]`}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8">{icon}</div>
                                        <img src={user.profilePictureUrl} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                                        <div>
                                            <p className="font-bold text-white text-sm leading-tight">{user.nickname}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                               <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded flex gap-1 items-center font-bold"><Trophy size={8}/> {user.wins} Wins</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xl font-black text-white">{user.score}</span>
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase">PTS</span>
                                    </div>
                                </div>
                             );
                        })}
                        {leaderboard.length === 0 && (
                            <div className="text-center p-8 text-zinc-500 italic border-2 border-dashed border-zinc-800 rounded-xl">
                                No winners yet. Be the first!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        
        {/* RESTART / LOCKED OVERLAY */}
        {showRestartOverlay && !showLeaderboard && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md animate-fade-in pb-20">
                <div className="mb-8 relative">
                   <div className="absolute inset-0 bg-rose-500 blur-[60px] opacity-20 animate-pulse"></div>
                   <Lock size={64} className="text-rose-400 relative z-10 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                </div>
                
                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">NEXT ROUND LOCKED</h2>
                <p className="text-zinc-400 mb-10 font-medium">Send Gifts or Likes to Start!</p>

                <div className="w-full max-w-sm space-y-6 px-8">
                    {/* Coin Target */}
                    {restartCoinTarget > 0 && (
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-2">
                                <span className="flex items-center gap-2 text-amber-400"><Gift size={16}/> COIN TARGET</span>
                                <span className="text-white">{currentRestartCoins} / {restartCoinTarget}</span>
                            </div>
                            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                                <div 
                                   className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                   style={{ width: `${Math.min(100, (currentRestartCoins / restartCoinTarget) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                    
                    {/* Like Target */}
                    {restartLikeTarget > 0 && (
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-2">
                                <span className="flex items-center gap-2 text-rose-400"><Heart size={16}/> LIKE TARGET</span>
                                <span className="text-white">{currentRestartLikes} / {restartLikeTarget}</span>
                            </div>
                            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                                <div 
                                   className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                   style={{ width: `${Math.min(100, (currentRestartLikes / restartLikeTarget) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-12 animate-bounce">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.2em]">WAITING FOR SUPPORT</p>
                </div>
            </div>
        )}
      </main>

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm bg-zinc-900 h-full shadow-2xl border-l border-zinc-800 p-6 overflow-y-auto animate-slide-in-right">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={24}/> Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-zinc-800 rounded-full"><X size={20} /></button>
            </div>

            <div className="space-y-8">
              {/* Language */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Globe size={14}/> Language</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ID', 'EN'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${
                        language === lang 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-zinc-800 border-transparent text-zinc-400 hover:bg-zinc-750'
                      }`}
                    >
                      {lang === 'ID' ? '🇮🇩 Indonesia' : '🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Length */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><LayoutGrid size={14}/> Word Length</label>
                <div className="grid grid-cols-4 gap-2">
                  {letterOptions.map((len) => (
                    <button
                      key={len}
                      onClick={() => setWordLength(len)}
                      className={`py-2 rounded-lg font-bold text-sm border transition-all ${
                        wordLength === len 
                          ? 'bg-zinc-100 text-zinc-900 border-white' 
                          : 'bg-zinc-800 text-zinc-400 border-transparent hover:bg-zinc-700'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Max Guesses Global */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Layers size={14}/> Max Attempts (Rows)</label>
                <div className="flex items-center gap-4 bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                    <button onClick={() => setMaxGuesses(Math.max(3, maxGuesses-1))} className="w-8 h-8 flex items-center justify-center bg-zinc-700 rounded-lg hover:bg-zinc-600 font-bold text-lg">-</button>
                    <span className="flex-1 text-center font-bold text-xl">{maxGuesses}</span>
                    <button onClick={() => setMaxGuesses(Math.min(10, maxGuesses+1))} className="w-8 h-8 flex items-center justify-center bg-zinc-700 rounded-lg hover:bg-zinc-600 font-bold text-lg">+</button>
                </div>
              </div>

              {/* Max Guesses Per User */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><User size={14}/> Limit Per User</label>
                <div className="flex items-center gap-4 bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                    <button onClick={() => setMaxGuessesPerUser(Math.max(0, maxGuessesPerUser-1))} className="w-8 h-8 flex items-center justify-center bg-zinc-700 rounded-lg hover:bg-zinc-600 font-bold text-lg">-</button>
                    <span className="flex-1 text-center font-bold text-xl">{maxGuessesPerUser === 0 ? '∞' : maxGuessesPerUser}</span>
                    <button onClick={() => setMaxGuessesPerUser(Math.min(10, maxGuessesPerUser+1))} className="w-8 h-8 flex items-center justify-center bg-zinc-700 rounded-lg hover:bg-zinc-600 font-bold text-lg">+</button>
                </div>
                <p className="text-[10px] text-zinc-500 px-1">0 = Unlimited guesses per person</p>
              </div>

              {/* RESTART TARGETS */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-white font-bold text-sm">Restart Conditions</h3>
                  
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2"><Gift size={14}/> Coins to Restart</label>
                     <input 
                       type="number" 
                       value={restartCoinTarget}
                       onChange={(e) => setRestartCoinTarget(Math.max(0, parseInt(e.target.value) || 0))}
                       className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 outline-none font-mono"
                     />
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2"><Heart size={14}/> Likes to Restart</label>
                     <input 
                       type="number" 
                       value={restartLikeTarget}
                       onChange={(e) => setRestartLikeTarget(Math.max(0, parseInt(e.target.value) || 0))}
                       className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 outline-none font-mono"
                     />
                  </div>
              </div>

              {/* GIFT VIDEO SETTINGS */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-white font-bold text-sm">Video Overlay</h3>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2"><Video size={14}/> Gift Video URL</label>
                     <input 
                       type="text" 
                       value={giftVideoUrl}
                       onChange={(e) => setGiftVideoUrl(e.target.value)}
                       placeholder="https://..."
                       className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-xs focus:border-indigo-500 outline-none font-mono"
                     />
                     <p className="text-[10px] text-zinc-500">Video with black background (Screen Blend Mode)</p>
                  </div>
              </div>

              {/* DANGER ZONE */}
              <div className="pt-8 mt-4 border-t border-zinc-800 space-y-3">
                 <button 
                   onClick={resetRankingData}
                   className="w-full py-3 rounded-xl bg-rose-900/30 text-rose-500 border border-rose-900/50 hover:bg-rose-900/50 hover:text-rose-400 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                 >
                    <Trophy size={16} /> RESET RANKING & HOST SCORE
                 </button>
                 <button 
                   onClick={resetSupporterStats}
                   className="w-full py-3 rounded-xl bg-cyan-900/30 text-cyan-500 border border-cyan-900/50 hover:bg-cyan-900/50 hover:text-cyan-400 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                 >
                    <Gift size={16} /> RESET LIKES & GIFTS STATS
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* --- CONNECT MODAL --- */}
      {showConnect && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 p-6 animate-pop">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">Connect TikTok</h2>
                <button onClick={() => setShowConnect(false)} className="p-2 hover:bg-zinc-800 rounded-full"><X size={20} /></button>
             </div>
             
             <form onSubmit={handleConnect} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">TikTok Username</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">@</span>
                      <input 
                        type="text" 
                        value={tiktokUsername}
                        onChange={(e) => setTiktokUsername(e.target.value)}
                        className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-xl py-3 pl-8 pr-4 text-white font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="username"
                        required
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Session ID (Optional)</label>
                   <input 
                     type="text" 
                     value={tiktokSessionId}
                     onChange={(e) => setTiktokSessionId(e.target.value)}
                     className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-xl py-3 px-4 text-zinc-300 text-xs font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                     placeholder="Paste sessionid cookie here if needed"
                   />
                   <p className="text-[10px] text-zinc-600 mt-2">Required if connection fails with "Websocket Upgrade" error.</p>
                </div>

                <div className="pt-2">
                   <button 
                     type="submit" 
                     className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                   >
                     <PlugZap size={20} /> CONNECT
                   </button>
                </div>
             </form>

             <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
                 <p className={`text-xs font-bold ${isConnected ? 'text-emerald-500' : 'text-zinc-500'}`}>
                    Status: {connectionStatus}
                 </p>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
