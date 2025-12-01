
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, RefreshCw, Trophy, Globe, X, Radio, Link as LinkIcon, User, Layers, Users, LayoutGrid, AlertCircle, CheckCircle, KeyRound, Gift, Heart, Lock } from 'lucide-react';
import { fetchDictionary, getRandomWord, isValidWord } from './services/wordService';
import { tiktokService } from './services/tiktokConnector';
import Grid from './components/Grid';
import { DictionaryData, GameStatus, GuessData, Language, TikTokChatEvent, TikTokMemberEvent, ToastMessage, TikTokUserData, TikTokGiftEvent, TikTokLikeEvent } from './types';

// Praise dictionary
const PRAISE_WORDS: Record<Language, string[]> = {
  ID: ['LUAR BIASA!', 'SEMPURNA!', 'SANGAT HEBAT!', 'JENIUS!', 'MANTAP JIWA!', 'KEREN ABIS!', 'SENSASIONAL!', 'ISTIMEWA!'],
  EN: ['MAGNIFICENT!', 'OUTSTANDING!', 'BRILLIANT!', 'PERFECT!', 'SPECTACULAR!', 'GENIUS!', 'UNSTOPPABLE!', 'AMAZING!']
};

// Mock/Tease dictionary for losing
const MOCK_MESSAGES: Record<Language, string[]> = {
  ID: ['YAHHH KALAH 😜', 'COBA LAGI YA 😛', 'BELUM BERUNTUNG 🤪', 'ADUH SAYANG SEKALI 😝', 'KURANG JAGO NIHH 😜', 'UPS, GAGAL DEH 🫠'],
  EN: ['OOPS, YOU LOST 😜', 'NICE TRY THOUGH 😛', 'BETTER LUCK NEXT TIME 🤪', 'SO CLOSE! 😝', 'NOT QUITE RIGHT 😜', 'GAME OVER 🫠']
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
  
  const [showSettings, setShowSettings] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  
  // TikTok State
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [tiktokSessionId, setTiktokSessionId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [recentJoins, setRecentJoins] = useState<(TikTokMemberEvent & { id: number })[]>([]);

  // Data State
  const [dictionary, setDictionary] = useState<DictionaryData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Game State
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<GuessData[]>([]);
  const [userGuessCounts, setUserGuessCounts] = useState<Record<string, number>>({});
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [shake, setShake] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Praise & Winner State
  const [praise, setPraise] = useState<string | null>(null);
  const [winner, setWinner] = useState<TikTokUserData | null>(null);

  // Restart Logic State
  const [isWaitingForRestart, setIsWaitingForRestart] = useState(false);
  const [currentRestartCoins, setCurrentRestartCoins] = useState(0);
  const [currentRestartLikes, setCurrentRestartLikes] = useState(0);

  // Queue System
  const [queueLength, setQueueLength] = useState(0);
  const guessQueueRef = useRef<{word: string, user?: any}[]>([]);

  const isProcessingRef = useRef(false);
  const ANIMATION_DELAY = 1500;

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

  // --- GAME INITIALIZATION ---

  const initGame = useCallback(async () => {
    setLoading(true);
    setGameStatus(GameStatus.PLAYING);
    setGuesses([]);
    setUserGuessCounts({});
    setCurrentGuess('');
    setShake(false);
    setPraise(null);
    setWinner(null);
    
    // Clear Queue completely to ensure a clean start
    guessQueueRef.current = [];
    setQueueLength(0);
    
    // Reset restart counters
    setIsWaitingForRestart(false);
    setCurrentRestartCoins(0);
    setCurrentRestartLikes(0);

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
    } finally {
      setLoading(false);
    }
  }, [language, wordLength]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // --- CORE GAME LOGIC ---

  const processQueue = useCallback(() => {
    if (isProcessingRef.current || guessQueueRef.current.length === 0 || gameStatus !== GameStatus.PLAYING) {
      return;
    }
    const nextItem = guessQueueRef.current.shift();
    setQueueLength(guessQueueRef.current.length);
    if (nextItem) {
      processGuess(nextItem.word, nextItem.user);
    }
  }, [gameStatus, dictionary, targetWord]);

  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && !loading && targetWord && guessQueueRef.current.length > 0) {
      processQueue();
    }
  }, [gameStatus, loading, targetWord, processQueue]);

  // AUTO RESTART / WAITING LOGIC
  useEffect(() => {
    if (gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST) {
      // Show praise/mock for a few seconds, then switch to waiting mode
      const timer = setTimeout(() => {
         // Clear the praise text so the waiting overlay can take center stage (or show underneath)
         // Actually, let's keep praise text but show the restart overlay ON TOP
         setIsWaitingForRestart(true);
      }, 4000); 
      
      return () => clearTimeout(timer);
    }
  }, [gameStatus]);

  // Check if restart targets met
  useEffect(() => {
      if (isWaitingForRestart) {
          // If targets are set to 0, auto restart immediately
          if (restartCoinTarget === 0 && restartLikeTarget === 0) {
              initGame();
              return;
          }

          if (currentRestartCoins >= restartCoinTarget || currentRestartLikes >= restartLikeTarget) {
              // Target met!
              addToast("Target Reached! Starting Game...", "success");
              setTimeout(() => initGame(), 500);
          }
      }
  }, [isWaitingForRestart, currentRestartCoins, currentRestartLikes, restartCoinTarget, restartLikeTarget, initGame]);


  const processGuess = (guessWord: string, user?: any) => {
    if (gameStatus !== GameStatus.PLAYING || loading) return;

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
    let isGameOver = false;

    setGuesses(prev => {
        const updated = [...prev, newGuessObj];
        if (user) {
            setUserGuessCounts(prevCounts => ({
                ...prevCounts,
                [user.userId]: (prevCounts[user.userId] || 0) + 1
            }));
        }
        
        if (guessWord === targetWord) {
            setGameStatus(GameStatus.WON);
            isGameOver = true;
            addToast(`Benar! Oleh ${user?.nickname || 'Kamu'}`, 'success');
            const praises = PRAISE_WORDS[language];
            setPraise(praises[Math.floor(Math.random() * praises.length)]);
            if (user) setWinner(user);

        } else if (updated.length >= maxGuesses) {
            setGameStatus(GameStatus.LOST);
            isGameOver = true;
            const mocks = MOCK_MESSAGES[language];
            setPraise(mocks[Math.floor(Math.random() * mocks.length)]);
        }

        return updated;
    });

    setCurrentGuess('');

    setTimeout(() => {
        if (!isGameOver) {
            isProcessingRef.current = false;
            processQueue();
        }
    }, ANIMATION_DELAY);
  };

  // --- TIKTOK LOGIC & HANDLERS ---

  const handleTikTokGuess = (msg: TikTokChatEvent) => {
      // STOP accepting new guesses if we are waiting for restart (LOCKED state)
      if (isWaitingForRestart) return;

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

  const handleTikTokMember = (msg: TikTokMemberEvent) => {
      const id = Date.now();
      const newJoiner = { ...msg, id };
      setRecentJoins(prev => {
        const updated = [...prev, newJoiner];
        return updated.length > 2 ? updated.slice(updated.length - 2) : updated;
      });
      setTimeout(() => {
        setRecentJoins(prev => prev.filter(j => j.id !== id));
      }, 4000);
  };

  const handleTikTokGift = (msg: TikTokGiftEvent) => {
      // Only count if waiting for restart
      if (isWaitingForRestart) {
          // Calculate total value of this gift event
          // Note: repeatCount increases in a streak, but usually we just want to add the incoming value
          // A simple approximation for restart purposes is adding diamondCount. 
          // Ideally we check if it's the end of streak, but for immediate reaction, let's just add.
          // Since Gift Event fires repeatedly for streaks, we might overcount if we sum repeats.
          // Correct way for streaks: The library fires separate events. 
          // For simplicity in this game loop: simple addition of diamondCount is usually enough for "1 Coin" triggers.
          
          // If cost is 0, we can assume it's free or skip.
          if(msg.diamondCount > 0) {
             setCurrentRestartCoins(prev => prev + msg.diamondCount);
          }
      }
  };

  const handleTikTokLike = (msg: TikTokLikeEvent) => {
      if (isWaitingForRestart) {
          // msg.likeCount is the number of likes in this specific batch
          setCurrentRestartLikes(prev => prev + msg.likeCount);
      }
  };

  // Store handlers in refs
  const handleTikTokGuessRef = useRef(handleTikTokGuess);
  const handleTikTokMemberRef = useRef(handleTikTokMember);
  const handleTikTokGiftRef = useRef(handleTikTokGift);
  const handleTikTokLikeRef = useRef(handleTikTokLike);

  // Sync refs on render
  useEffect(() => {
    handleTikTokGuessRef.current = handleTikTokGuess;
    handleTikTokMemberRef.current = handleTikTokMember;
    handleTikTokGiftRef.current = handleTikTokGift;
    handleTikTokLikeRef.current = handleTikTokLike;
  });

  // SETUP SOCKET
  useEffect(() => {
    tiktokService.connectToBackend();

    const onChat = (msg: TikTokChatEvent) => handleTikTokGuessRef.current(msg);
    const onMember = (msg: TikTokMemberEvent) => handleTikTokMemberRef.current(msg);
    const onGift = (msg: TikTokGiftEvent) => handleTikTokGiftRef.current(msg);
    const onLike = (msg: TikTokLikeEvent) => handleTikTokLikeRef.current(msg);

    const onConnected = (state: any) => {
      setIsConnected(true);
      setConnectionStatus(`Connected to room ${state.roomId}`);
      addToast('Terhubung ke TikTok Live!', 'success');
    };

    const onDisconnected = (msg: string) => {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      addToast('Koneksi terputus.', 'error');
    };

    tiktokService.onChat(onChat);
    tiktokService.onMember(onMember);
    tiktokService.onGift(onGift);
    tiktokService.onLike(onLike);
    tiktokService.onConnected(onConnected);
    tiktokService.onDisconnected(onDisconnected);
    tiktokService.onError((err) => {
        console.error("Socket error:", err);
        if(err.includes("websocket upgrade") || err.includes("sessionId")) {
            addToast("Gagal koneksi: Butuh Session ID (Cek Settings)", "error");
        }
    });

    return () => {
      tiktokService.offChat(onChat);
      tiktokService.offMember(onMember);
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

  const letterOptions = Array.from({ length: 12 }, (_, i) => i + 4);

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      
      {/* FLOATING NOTIFICATIONS (JOIN) */}
      <div className="absolute top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none w-64 items-end">
        {recentJoins.map((joiner) => (
          <div key={joiner.id} className="animate-slide-in-right bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-2xl flex items-center gap-3 w-full">
             <div className="relative">
                <img src={joiner.profilePictureUrl} className="w-10 h-10 rounded-full border border-white/30" alt="pfp" />
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-zinc-900"></div>
             </div>
             <div className="flex flex-col overflow-hidden">
                <span className="text-white font-bold text-sm truncate">{joiner.nickname}</span>
                <span className="text-emerald-300 text-xs font-medium uppercase tracking-wider">Welcome!</span>
             </div>
          </div>
        ))}
      </div>

      {/* TOAST NOTIFICATIONS */}
      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`px-6 py-3 rounded-full font-bold shadow-2xl backdrop-blur-md animate-pop flex items-center gap-2 border ${toast.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400' : toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-zinc-800/90 text-white border-zinc-700'}`}>
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'success' && <CheckCircle size={18} />}
            <span className="text-sm tracking-wide text-center">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* RESTART REQUIRED OVERLAY */}
      {isWaitingForRestart && (restartCoinTarget > 0 || restartLikeTarget > 0) && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-6">
           <div className="bg-zinc-900/90 w-full max-w-md p-6 rounded-3xl border border-zinc-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6">
              
              <div className="flex items-center gap-2 text-rose-500 mb-2">
                 <Lock size={32} />
                 <h2 className="text-2xl font-black uppercase tracking-widest text-white">Next Round Locked</h2>
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

      {/* PRAISE & WINNER OVERLAY */}
      {praise && !isWaitingForRestart && (
         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-black/60 backdrop-blur-[6px] animate-fade-in gap-6 p-4">
             {gameStatus === GameStatus.WON ? (
                <>
                  <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-pop tracking-tighter text-center">{praise}</h1>
                  {winner && (
                   <div className="flex flex-col items-center animate-slide-up bg-zinc-900/60 p-6 rounded-3xl border border-yellow-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(234,179,8,0.2)]">
                      <div className="relative mb-3">
                        <img src={winner.profilePictureUrl} alt={winner.nickname} className="w-24 h-24 rounded-full border-4 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.5)] object-cover" />
                        <Trophy className="absolute -bottom-2 -right-2 text-yellow-400 fill-yellow-400 drop-shadow-md" size={32} />
                      </div>
                      <h2 className="text-2xl font-bold text-white text-center px-4">{winner.nickname}</h2>
                      <p className="text-zinc-400 font-medium text-sm">@{winner.uniqueId}</p>
                   </div>
                  )}
                </>
             ) : (
                <>
                  <div className="text-8xl mb-2 animate-bounce drop-shadow-xl filter grayscale-[0.2]">😜</div>
                  <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-red-600 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-pop tracking-tighter text-center leading-tight">{praise}</h1>
                  <div className="flex flex-col items-center animate-slide-up bg-zinc-900/60 p-6 rounded-3xl border border-rose-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(244,63,94,0.2)] mt-4">
                      <span className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2">JAWABANNYA ADALAH</span>
                      <h2 className="text-5xl sm:text-6xl font-black text-white text-center tracking-widest drop-shadow-lg">{targetWord}</h2>
                   </div>
                </>
             )}
         </div>
      )}

      {/* HEADER */}
      <header className="flex-none p-4 flex items-center justify-between bg-zinc-900/50 border-b border-white/5 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
           <button onClick={() => setShowConnect(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isConnected ? 'LIVE' : 'CONNECT TIKTOK'}
           </button>
           {queueLength > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                 <Layers size={12} className="text-indigo-400" />
                 <span className="text-xs font-bold text-indigo-300">QUEUE: {queueLength}</span>
              </div>
           )}
        </div>

        <div className="flex items-center gap-2">
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
        {loading ? (
           <div className="flex-1 flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
           </div>
        ) : (
          <Grid guesses={guesses} currentGuess={currentGuess} targetWord={targetWord} wordLength={wordLength} maxGuesses={maxGuesses} isShake={shake} />
        )}
      </main>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
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
                      <p className="text-[10px] text-zinc-500 italic">*Set both to 0 for instant auto-restart.</p>
                  </div>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-800 shadow-2xl p-6">
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
                 <p className={`text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>Status: {connectionStatus}</p>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
