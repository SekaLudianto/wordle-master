
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
  const [maxGuessesPerUser, setMaxGuessesPerUser] = useState<number>(1);
  
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
    if (confirm('Reset all ranking, host score, and supporter stats? This cannot be undone.')) {
        setLeaderboard([]);
        setHostScore(0);
        allSupportersRef.current = {};
        setTopLikers([]);
        setTopGifters([]);
        localStorage.removeItem('wordle_leaderboard');
        localStorage.removeItem('wordle_hostScore');
        localStorage.removeItem('wordle_supporters');
        addToast('All ranking data reset!', 'success');
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
    baselineLikeCountRef.current = null; // Reset baseline

    isProcessingRef.current = false;
    
    try {
      const dict = await fetchDictionary(language);
      setDictionary(dict);
      
      const word = getRandomWord(dict, wordLength);
      if (!word) {
        addToast(`No ${wordLength}-letter words found`, 'error');
        setTargetWord('');
      } else {
        setTargetWord(word);
        console.log('Target:', word); 
      }
    } catch (e) {
      addToast('Error loading dictionary', 'error');
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

  // --- CORE GAME LOGIC ---

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
  }, [dictionary, targetWord]); // Removed gameStatus dependency, relying on Ref

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

  // END GAME SEQUENCE MANAGER
  useEffect(() => {
    if (gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST) {
      // 1. Immediately start "Background" Waiting mode so gifts/likes count
      setIsWaitingForRestart(true);
      setShowRestartOverlay(false); // Ensure overlay is hidden initially
      
      // NOTE: Praise logic is triggered via setTimeout inside processGuess to give a 1s delay
      
      // 2. Wait 5 seconds (1s delay + 4s view time) then show Leaderboard
      const leaderboardTimer = setTimeout(() => {
        setPraise(null);
        setShowLeaderboard(true);
      }, 5000); 

      // 3. Leaderboard Duration Extended: 
      //    Wait 3.5s (View Top 5) + 2s (Scroll) + 3.5s (View Bottom 5) = ~9s Total
      //    Total Time = 5s + 9s = 14s
      const restartTimer = setTimeout(() => {
         setShowLeaderboard(false);
         
         // 4. CHECK TARGETS
         // If targets are 0, Auto Restart. Else show Locked Overlay.
         if (restartCoinTarget === 0 && restartLikeTarget === 0) {
             initGame();
         } else {
             setShowRestartOverlay(true);
         }
      }, 14000); // 14s Total Sequence

      return () => {
        clearTimeout(leaderboardTimer);
        clearTimeout(restartTimer);
      };
    } else {
        // Reset visuals if not won/lost
        setShowRestartOverlay(false);
        setShowLeaderboard(false);
        setPraise(null);
    }
  }, [gameStatus, restartCoinTarget, restartLikeTarget, initGame]);

  // Check if restart targets met (MANUAL TRIGGER)
  useEffect(() => {
      // Only trigger restart logic if we are waiting for restart
      if (isWaitingForRestart) {
          // Note: Auto-restart for 0 targets is now handled in the Sequence Effect above to ensure animations play.
          // This effect now only handles "Target Reached" interruption or completion.

          if ((restartCoinTarget > 0 && currentRestartCoins >= restartCoinTarget) || 
              (restartLikeTarget > 0 && currentRestartLikes >= restartLikeTarget)) {
              // Target met!
              addToast("Target Reached! Starting Game...", "success");
              // Delay slightly if overlay just popped up
              setTimeout(() => initGame(), 500);
          }
      }
  }, [isWaitingForRestart, currentRestartCoins, currentRestartLikes, restartCoinTarget, restartLikeTarget, initGame]);


  const processGuess = (guessWord: string, user?: TikTokUserData) => {
    // Use Ref for stricter control
    if (!isGameActiveRef.current || loading) return;

    if (user && maxGuessesPerUser > 0) {
        const currentCount = userGuessCounts[user.userId] || 0;
        if (currentCount >= maxGuessesPerUser) {
            console.log(`User ${user.nickname} limit reached`);
            processQueue(); 
            return;
        }
    }
    
    if (!dictionary || !isValidWord(guessWord, dictionary)) {
       setShake(true);
       const invalidMsg = user ? `Kata "${guessWord}" tidak ada di kamus!` : `Kata "${guessWord}" tidak valid!`;
       addToast(invalidMsg, 'error');
       setTimeout(() => setShake(false), 500);
       processQueue();
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
        isGameActiveRef.current = false;
        guessQueueRef.current = [];
        setQueueLength(0);
        
        setGameStatus(GameStatus.WON);
        isGameOver = true;
        addToast(`Benar! Oleh ${user?.nickname || 'Kamu'}`, 'success');
        
        setTimeout(() => {
            const praises = PRAISE_WORDS[language];
            setPraise(praises[Math.floor(Math.random() * praises.length)]);
            
            // Calculate points: maxGuesses - (rowIndex). rowIndex is length-1.
            const points = maxGuesses - (updatedGuesses.length - 1);
            
            if (user) {
              setWinner(user);
              updateLeaderboard(user, points > 0 ? points : 1);
            }
        }, 1000);

    } else if (updatedGuesses.length >= maxGuesses) {
        // LOST
        isGameActiveRef.current = false;
        guessQueueRef.current = [];
        setQueueLength(0);

        setGameStatus(GameStatus.LOST);
        isGameOver = true;
        
        setTimeout(() => {
            const mocks = MOCK_MESSAGES[language];
            setPraise(mocks[Math.floor(Math.random() * mocks.length)]);
            setHostScore(h => h + 1);
        }, 1000);
    }

    // Update Visual State
    setGuesses(updatedGuesses);
    setCurrentGuess('');

    setTimeout(() => {
        // Only process next item if game is NOT over
        if (!isGameOver && isGameActiveRef.current) {
            isProcessingRef.current = false;
            processQueue();
        } else {
             isProcessingRef.current = false; 
        }
    }, ANIMATION_DELAY);
  };

  // --- TIKTOK LOGIC & HANDLERS ---

  const handleTikTokGuess = (msg: TikTokChatEvent) => {
      // STRICT BLOCKING: Check Ref first
      if (!isGameActiveRef.current || isWaitingForRestart || loading) {
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
            <WifiOff size={100} className="text-white mb-6 animate-shake drop-shadow-lg" />
            <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-xl mb-4 leading-tight">
              {reconnectJoke}
            </h1>
            <div className="flex items-center gap-2 text-white/80 font-bold bg-black/40 px-4 py-2 rounded-full mt-4 border border-white/20">
               <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
               <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-100"></div>
               <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-200"></div>
               <span className="ml-2">TRYING TO RECONNECT</span>
            </div>
        </div>
      )}

      {/* RESTART REQUIRED OVERLAY */}
      {showRestartOverlay && !showNewRoundOverlay && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm animate-fade-in p-6">
           <div className="bg-zinc-900 w-full max-w-md p-6 rounded-3xl border border-zinc-700 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-6">
              
              <div className="flex items-center gap-2 text-rose-500 mb-2">
                 <Lock size={32} />
                 <h2 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">Next Round Locked</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                  {/* COIN TARGET */}
                  <div className={`flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border ${currentRestartCoins >= restartCoinTarget ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-zinc-700'}`}>
                     <Gift size={40} className={`mb-2 ${currentRestartCoins >= restartCoinTarget ? 'text-emerald-500' : 'text-amber-400 animate-bounce'}`} />
                     <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Send Gift</span>
                     <div className="text-3xl font-black text-white my-1">{restartCoinTarget} <span className="text-sm font-normal text-zinc-500">Coins</span></div>
                     
                     <div className="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden border border-zinc-700">
                        <div 
                          className="bg-amber-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (currentRestartCoins / restartCoinTarget) * 100)}%` }}
                        />
                     </div>
                     <span className="text-xs text-zinc-500 mt-1">{currentRestartCoins} / {restartCoinTarget}</span>
                  </div>

                  {/* LIKE TARGET */}
                  <div className={`flex flex-col items-center p-4 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border ${currentRestartLikes >= restartLikeTarget ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-zinc-700'}`}>
                     <Heart size={40} className={`mb-2 ${currentRestartLikes >= restartLikeTarget ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`} />
                     <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tap Screen</span>
                     <div className="text-3xl font-black text-white my-1">{restartLikeTarget}</div>
                     
                     <div className="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden border border-zinc-700">
                        <div 
                          className="bg-rose-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (currentRestartLikes / restartLikeTarget) * 100)}%` }}
                        />
                     </div>
                     <span className="text-xs text-zinc-500 mt-1">{currentRestartLikes} / {restartLikeTarget}</span>
                  </div>
              </div>

              <div className="text-center">
                 <p className="text-zinc-400 text-sm animate-pulse">Waiting for action to start...</p>
                 <button onClick={initGame} className="mt-4 text-xs text-zinc-600 hover:text-white underline">Host Bypass (Force Start)</button>
              </div>
           </div>
        </div>
      )}

      {/* LEADERBOARD OVERLAY */}
      {showLeaderboard && (
        <div className="absolute inset-0 z-[52] flex flex-col items-center justify-center pointer-events-none bg-zinc-950/80 backdrop-blur-md animate-fade-in p-4">
           <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-yellow-500/20 shadow-2xl overflow-hidden flex flex-col relative animate-slide-up">
              
              {/* Leaderboard Header */}
              <div className="bg-gradient-to-r from-yellow-600/30 to-amber-600/30 p-5 border-b border-yellow-500/10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Trophy className="text-yellow-400 fill-yellow-400 animate-bounce" size={28} />
                    <div>
                       <h2 className="text-xl font-black text-white uppercase tracking-wider drop-shadow-md">Top Players</h2>
                       <p className="text-[10px] text-yellow-400 font-bold tracking-widest drop-shadow-sm">SESSION RANKING</p>
                    </div>
                 </div>
                 
                 {/* Host Score */}
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">HOST SCORE</span>
                    <span className="text-2xl font-black text-rose-500 drop-shadow-md">{hostScore}</span>
                 </div>
              </div>

              {/* List */}
              <div 
                ref={leaderboardListRef}
                className="flex-1 space-y-3 custom-scrollbar overflow-hidden p-4 max-h-[380px]"
              >
                 {leaderboard.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 italic">No winners yet! Be the first!</div>
                 ) : (
                    leaderboard.map((player, idx) => (
                       <div key={player.userId} className={`flex items-center gap-3 p-3 rounded-xl border ${idx === 0 ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/20 border-yellow-500/60' : idx === 1 ? 'bg-zinc-800 border-zinc-400/50' : idx === 2 ? 'bg-orange-900/40 border-orange-700/50' : 'bg-zinc-800/40 border-white/5'} relative overflow-hidden shadow-lg flex-shrink-0`}>
                          
                          {/* Rank Badge */}
                          <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-sm z-10 ${idx === 0 ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]' : idx === 1 ? 'bg-zinc-300 text-black' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                             {idx + 1}
                          </div>

                          <img src={player.profilePictureUrl} className="w-10 h-10 rounded-full border-2 border-zinc-600 object-cover z-10" alt="pfp" />
                          
                          <div className="flex-1 z-10 overflow-hidden">
                             <div className="font-bold text-white truncate drop-shadow-md">{player.nickname}</div>
                             <div className="text-[10px] text-zinc-300 flex items-center gap-1 font-medium">
                                <Crown size={10} className="text-yellow-500" /> {player.wins} Wins
                             </div>
                          </div>

                          <div className="z-10 text-right">
                             <div className="text-lg font-black text-white drop-shadow-md">{player.score}</div>
                             <div className="text-[9px] text-zinc-500 font-bold uppercase">PTS</div>
                          </div>

                          {/* Shine Effect for #1 */}
                          {idx === 0 && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>}
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* PRAISE & WINNER OVERLAY */}
      {praise && !showRestartOverlay && !showLeaderboard && !showNewRoundOverlay && (
         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pb-52 pointer-events-none bg-black/70 backdrop-blur-[6px] animate-fade-in gap-4 p-4">
             {gameStatus === GameStatus.WON ? (
                <>
                  <div className="text-6xl mb-2 animate-bounce drop-shadow-2xl">{praise.emoji}</div>
                  <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] animate-pop tracking-tighter text-center">{praise.text}</h1>
                  {winner && (
                   <div className="flex flex-col items-center animate-slide-up bg-zinc-900/90 p-6 rounded-3xl border border-yellow-500/40 backdrop-blur-md shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                      <div className="relative mb-3">
                        <img src={winner.profilePictureUrl} alt={winner.nickname} className="w-24 h-24 rounded-full border-4 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.6)] object-cover" />
                        <Trophy className="absolute -bottom-2 -right-2 text-yellow-400 fill-yellow-400 drop-shadow-md" size={32} />
                      </div>
                      <h2 className="text-2xl font-black text-white text-center px-4 drop-shadow-md">{winner.nickname}</h2>
                      <p className="text-zinc-300 font-bold text-sm">@{winner.uniqueId}</p>
                   </div>
                  )}
                </>
             ) : (
                <>
                  <div className="text-6xl mb-2 animate-bounce drop-shadow-2xl">{praise.emoji}</div>
                  <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-red-600 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] animate-pop tracking-tighter text-center leading-tight">{praise.text}</h1>
                  <div className="flex flex-col items-center animate-slide-up bg-zinc-900/90 p-6 rounded-3xl border border-rose-500/40 backdrop-blur-md shadow-[0_0_50px_rgba(244,63,94,0.3)] mt-4">
                      <span className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2">JAWABANNYA ADALAH</span>
                      <h2 className="text-5xl sm:text-6xl font-black text-white text-center tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{targetWord}</h2>
                   </div>
                </>
             )}
         </div>
      )}

      {/* HEADER */}
      <header className="flex-none p-4 flex items-center justify-between bg-zinc-950/80 border-b border-white/10 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
           <button onClick={() => setShowConnect(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${getBadgeStyle()}`}>
              <div className={`w-2 h-2 rounded-full ${getBadgeDot()}`} />
              {getBadgeText()}
           </button>
           {queueLength > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                 <Layers size={12} className="text-indigo-400" />
                 <span className="text-xs font-bold text-indigo-300">QUEUE: {queueLength}</span>
              </div>
           )}
        </div>

        <div className="flex items-center gap-2">
           {/* ZOOM CONTROLS */}
           <div className="flex items-center bg-zinc-800 rounded-full p-1 mr-2 border border-zinc-700">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                  <ZoomOut size={16} />
              </button>
              <span className="text-[10px] font-bold text-zinc-500 w-8 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="p-1.5 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                  <ZoomIn size={16} />
              </button>
           </div>

           <button 
              onClick={() => setIsDragMode(!isDragMode)} 
              className={`p-2 rounded-full transition-all ${isDragMode ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
              title={isDragMode ? "Lock Position" : "Adjust Layout"}
           >
             <Move size={20} />
           </button>
           <button onClick={initGame} disabled={loading} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
           <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
             <Settings size={20} />
           </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {loading && !showNewRoundOverlay ? (
           <div className="flex-1 flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
           </div>
        ) : (
          <div 
             className={`flex-1 w-full h-full flex flex-col justify-center transition-transform duration-75 relative ${isDragMode ? 'cursor-move touch-none' : ''}`}
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onPointerCancel={handlePointerUp}
             style={{
               transform: `translate(${gridPosition.x}px, ${gridPosition.y}px) scale(${scale})`
             }}
          >
             {isDragMode && (
               <div className="absolute inset-4 border-2 border-dashed border-indigo-500/50 rounded-3xl z-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-zinc-900/90 px-4 py-2 rounded-lg text-indigo-400 font-bold backdrop-blur-md shadow-lg">
                     DRAG TO ADJUST
                  </span>
               </div>
             )}
             <Grid guesses={guesses} currentGuess={currentGuess} targetWord={targetWord} wordLength={wordLength} maxGuesses={maxGuesses} isShake={shake} />
          </div>
        )}
      </main>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 sticky top-0 z-10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings size={20} className="text-indigo-400" />
                Game Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar">
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Globe size={14} /> Language</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ID', 'EN'] as const).map((lang) => (
                    <button key={lang} onClick={() => setLanguage(lang)} className={`py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition-all ${language === lang ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 bg-zinc-800/50 text-zinc-400 hover:border-zinc-700'}`}>
                      {lang === 'ID' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Trophy size={14} /> Difficulty (Letters)</label>
                <div className="grid grid-cols-4 gap-2">
                  {letterOptions.map((len) => (
                    <button key={len} onClick={() => setWordLength(len)} className={`h-10 rounded-lg text-sm font-bold border-2 transition-all ${wordLength === len ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-800 bg-zinc-800/50 text-zinc-400 hover:border-zinc-700'}`}>
                      {len}
                    </button>
                  ))}
                </div>
              </div>
              
               <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><LayoutGrid size={14} /> Max Rounds (Rows)</label>
                <div className="flex items-center gap-4 bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                    <input type="range" min="1" max="12" value={maxGuesses} onChange={(e) => setMaxGuesses(parseInt(e.target.value))} className="flex-1 accent-indigo-500 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                    <span className="text-indigo-400 font-bold w-6 text-center">{maxGuesses}</span>
                </div>
              </div>
              
               <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Users size={14} /> Guesses Per User</label>
                <div className="flex items-center gap-4 bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                    <input type="range" min="0" max="5" value={maxGuessesPerUser} onChange={(e) => setMaxGuessesPerUser(parseInt(e.target.value))} className="flex-1 accent-rose-500 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer" />
                    <span className="text-rose-400 font-bold w-16 text-right">{maxGuessesPerUser === 0 ? "∞" : maxGuessesPerUser}</span>
                </div>
              </div>

              {/* RESTART SETTINGS */}
              <div className="pt-4 border-t border-zinc-800">
                  <h3 className="text-sm font-bold text-white mb-4">Restart Conditions</h3>
                  
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                             <Gift size={14} /> Target Gift Cost (Coins)
                          </label>
                          <div className="flex items-center gap-4 bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                              <input type="number" min="0" value={restartCoinTarget} onChange={(e) => setRestartCoinTarget(parseInt(e.target.value) || 0)} className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-white font-bold text-center outline-none focus:border-amber-500" />
                              <span className="text-xs text-zinc-400">Total coin value to restart</span>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                             <Heart size={14} /> Target Likes
                          </label>
                          <div className="flex items-center gap-4 bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                              <input type="number" min="0" step="10" value={restartLikeTarget} onChange={(e) => setRestartLikeTarget(parseInt(e.target.value) || 0)} className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-white font-bold text-center outline-none focus:border-rose-500" />
                              <span className="text-xs text-zinc-400">Total new likes to restart</span>
                          </div>
                      </div>
                  </div>
              </div>
              
               {/* GIFT VIDEO SETTINGS */}
              <div className="pt-4 border-t border-zinc-800">
                  <h3 className="text-sm font-bold text-white mb-4">Overlay</h3>
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                         <Video size={14} /> Gift Video URL
                      </label>
                      <input type="text" value={giftVideoUrl} onChange={(e) => setGiftVideoUrl(e.target.value)} placeholder="https://..." className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 placeholder:text-zinc-600" />
                      <p className="text-[10px] text-zinc-500 italic">Use a video with a BLACK background for transparency.</p>
                  </div>
              </div>
              
              {/* LAYOUT RESET */}
              <div className="pt-4 border-t border-zinc-800">
                 <button onClick={() => { setGridPosition({x:0, y:0}); setScale(1); setGifterPos({x:20, y:80}); setLikerPos({x:20, y:140}); setWidgetScale(0.85); }} className="text-xs font-bold text-zinc-500 hover:text-white underline w-full text-center">
                    Reset Layout Position
                 </button>
              </div>

              {/* DATA RESET */}
              <div className="pt-4 border-t border-zinc-800">
                 <button onClick={resetRankingData} className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                    <Trash2 size={14} />
                    Reset Ranking Data
                 </button>
                 <p className="text-[10px] text-zinc-500 text-center mt-1">Clears leaderboard, host score, and supporter stats.</p>
              </div>

            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 sticky bottom-0 z-10">
              <button onClick={() => { initGame(); setShowSettings(false); }} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <RefreshCw size={18} /> Apply & Restart Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONNECT MODAL */}
      {showConnect && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-700 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <LinkIcon size={24} className="text-emerald-500" />
                Connect TikTok
              </h2>
              <button onClick={() => setShowConnect(false)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">TikTok Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input type="text" value={tiktokUsername} onChange={(e) => setTiktokUsername(e.target.value)} placeholder="e.g. windahbasudara" className="w-full bg-zinc-800/50 border-2 border-zinc-700 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-all placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1 flex items-center gap-1">
                   Session ID <span className="text-xs text-zinc-600">(Optional)</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input type="text" value={tiktokSessionId} onChange={(e) => setTiktokSessionId(e.target.value)} placeholder="Enter Session ID" className="w-full bg-zinc-800/50 border-2 border-zinc-700 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-all placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20">Connect Live</button>
              </div>
              <div className="text-center">
                 <p className={`text-xs font-medium ${isReconnecting ? 'text-amber-400 animate-pulse' : isConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>Status: {connectionStatus}</p>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
