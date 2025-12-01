import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, RefreshCw, Trophy, Globe, X, Radio, Link as LinkIcon, User, Layers, Users, LayoutGrid, AlertCircle, CheckCircle } from 'lucide-react';
import { fetchDictionary, getRandomWord, isValidWord } from './services/wordService';
import { tiktokService } from './services/tiktokConnector';
import Grid from './components/Grid';
import { DictionaryData, GameStatus, GuessData, Language, TikTokChatEvent, TikTokMemberEvent, ToastMessage, TikTokUserData } from './types';

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
  
  // New Settings
  const [maxGuesses, setMaxGuesses] = useState<number>(6); // Default 6 rows
  const [maxGuessesPerUser, setMaxGuessesPerUser] = useState<number>(1); // Default 1 guess per person (0 = unlimited)
  
  const [showSettings, setShowSettings] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  
  // TikTok State
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [recentJoins, setRecentJoins] = useState<(TikTokMemberEvent & { id: number })[]>([]);

  // Data State
  const [dictionary, setDictionary] = useState<DictionaryData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Game State
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<GuessData[]>([]);
  const [userGuessCounts, setUserGuessCounts] = useState<Record<string, number>>({}); // Track user guesses per round
  const [currentGuess, setCurrentGuess] = useState(''); // Only for manual typing if needed
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [shake, setShake] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Praise & Winner State
  const [praise, setPraise] = useState<string | null>(null); // Used for both Praise (Win) and Mock (Lose) text
  const [winner, setWinner] = useState<TikTokUserData | null>(null);

  // Queue System
  const [queueLength, setQueueLength] = useState(0); // For UI display only
  const guessQueueRef = useRef<{word: string, user?: any}[]>([]);

  const isProcessingRef = useRef(false); // Lock for preventing double guesses during animation
  const ANIMATION_DELAY = 1500; // ms to wait before processing next guess

  const addToast = (msg: string, type: 'default' | 'error' | 'success' = 'default') => {
    const id = Date.now();
    setToasts(prev => {
      // Limit visible toasts to avoid clutter
      const filtered = prev.length > 2 ? prev.slice(1) : prev;
      return [...filtered, { id, message: msg, type }];
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
    setUserGuessCounts({}); // Reset user counters
    setCurrentGuess('');
    setShake(false);
    setPraise(null);
    setWinner(null);
    isProcessingRef.current = false;
    // NOTE: We do NOT clear queue here (guessQueueRef.current = []) 
    // to allow guesses made during the transition to be processed in the next game.
    
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

  // Queue Processor
  const processQueue = useCallback(() => {
    // Conditions to stop processing:
    // 1. Already processing an animation
    // 2. Queue is empty
    // 3. Game is not in playing state (won/lost)
    if (isProcessingRef.current || guessQueueRef.current.length === 0 || gameStatus !== GameStatus.PLAYING) {
      return;
    }

    // Dequeue the next item
    const nextItem = guessQueueRef.current.shift();
    setQueueLength(guessQueueRef.current.length); // Update UI

    if (nextItem) {
      processGuess(nextItem.word, nextItem.user);
    }
  }, [gameStatus, dictionary, targetWord]); // Dependencies needed for processGuess closure context

  // Watch for game ready state to kickstart queue
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && !loading && targetWord && guessQueueRef.current.length > 0) {
      processQueue();
    }
  }, [gameStatus, loading, targetWord, processQueue]);

  // AUTO RESTART LISTENER
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    // Auto restart if Game Over
    if (gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST) {
      timer = setTimeout(() => {
        initGame();
      }, 5000); // 5 seconds delay before restart
    }
    
    return () => clearTimeout(timer);
  }, [gameStatus, initGame]);

  const processGuess = (guessWord: string, user?: any) => {
    // Double check status just in case
    if (gameStatus !== GameStatus.PLAYING || loading) return;

    // Check User Limits
    if (user && maxGuessesPerUser > 0) {
        const currentCount = userGuessCounts[user.userId] || 0;
        if (currentCount >= maxGuessesPerUser) {
            // User exceeded limit. 
            // Silent skip to not disrupt flow
            console.log(`User ${user.nickname} limit reached`);
            processQueue(); 
            return;
        }
    }
    
    // Check validation
    if (!dictionary || !isValidWord(guessWord, dictionary)) {
       // Shake and feedback
       setShake(true);
       
       const invalidMsg = user 
         ? `Kata "${guessWord}" tidak ada di kamus!` 
         : `Kata "${guessWord}" tidak valid!`;
       
       // Show red error toast
       addToast(invalidMsg, 'error');

       setTimeout(() => setShake(false), 500);
       
       // Crucial: If invalid, we must trigger next in queue immediately
       processQueue();
       return;
    }

    // Lock processing
    isProcessingRef.current = true;

    const newGuessObj: GuessData = { word: guessWord, user };
    let isGameOver = false;

    setGuesses(prev => {
        const updated = [...prev, newGuessObj];
        
        // Update user guess count
        if (user) {
            setUserGuessCounts(prevCounts => ({
                ...prevCounts,
                [user.userId]: (prevCounts[user.userId] || 0) + 1
            }));
        }
        
        // Check Win/Loss
        if (guessWord === targetWord) {
            setGameStatus(GameStatus.WON);
            isGameOver = true;
            addToast(`Benar! Oleh ${user?.nickname || 'Kamu'}`, 'success');
            
            // Trigger Praise
            const praises = PRAISE_WORDS[language];
            const randomPraise = praises[Math.floor(Math.random() * praises.length)];
            setPraise(randomPraise);
            
            // Set Winner
            if (user) {
              setWinner(user);
            }

        } else if (updated.length >= maxGuesses) {
            setGameStatus(GameStatus.LOST);
            isGameOver = true;
            // Trigger Mock Message
            const mocks = MOCK_MESSAGES[language];
            const randomMock = mocks[Math.floor(Math.random() * mocks.length)];
            setPraise(randomMock); // Reusing praise state for overlay text
        }

        return updated;
    });

    setCurrentGuess('');

    // Unlock and process next item after animation
    setTimeout(() => {
        // Only unlock if game isn't over.
        // If game IS over, we keep isProcessingRef = true to prevent
        // further guesses from the queue until initGame resets it.
        if (!isGameOver) {
            isProcessingRef.current = false;
            // Recursively call queue processor
            processQueue();
        }
    }, ANIMATION_DELAY);
  };

  // --- TIKTOK LOGIC & HANDLERS ---

  // Ref Pattern: Update these functions on every render so the socket listener
  // always calls the version with the latest state (closure).
  const handleTikTokGuess = (msg: TikTokChatEvent) => {
      // Allow adding to queue even if game is WON/LOST, so they process in next round
      // But we might want to limit queue size to prevent backlog spam
      if (guessQueueRef.current.length > 50) return; // Cap queue size safety
      
      // Parse sentence: split by any non-letter characters
      // This handles "Jawabannya: KATA" or "**** KATA" (filtered words) or "Bismillah MENANG"
      const potentialWords = msg.comment.toUpperCase().split(/[^A-Z]+/);
      
      // Find the first word that matches the target word length
      const cleanGuess = potentialWords.find(w => w.length === wordLength);
      
      // If no valid candidate found, ignore
      if (!cleanGuess) return;
      
      // Add to Queue
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

      // Attempt to process queue
      processQueue();
  };

  const handleTikTokMember = (msg: TikTokMemberEvent) => {
      const id = Date.now();
      const newJoiner = { ...msg, id };
      
      setRecentJoins(prev => {
        const updated = [...prev, newJoiner];
        // Limit to 3 items to keep UI clean
        return updated.length > 3 ? updated.slice(updated.length - 3) : updated;
      });

      setTimeout(() => {
        setRecentJoins(prev => prev.filter(j => j.id !== id));
      }, 4000); // Display slightly longer
  };

  // Store handlers in refs
  const handleTikTokGuessRef = useRef(handleTikTokGuess);
  const handleTikTokMemberRef = useRef(handleTikTokMember);

  // Sync refs on render
  useEffect(() => {
    handleTikTokGuessRef.current = handleTikTokGuess;
    handleTikTokMemberRef.current = handleTikTokMember;
  });

  // SETUP SOCKET
  useEffect(() => {
    tiktokService.connectToBackend();

    // Listeners that proxy to the ref (to avoid stale closures)
    const onChat = (msg: TikTokChatEvent) => {
      handleTikTokGuessRef.current(msg);
    };

    const onMember = (msg: TikTokMemberEvent) => {
      handleTikTokMemberRef.current(msg);
    };

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
    tiktokService.onConnected(onConnected);
    tiktokService.onDisconnected(onDisconnected);
    tiktokService.onError((err) => console.error("Socket error:", err));

    return () => {
      tiktokService.offChat(onChat);
      tiktokService.offMember(onMember);
      tiktokService.disconnect();
    };
  }, []);

  // Handle Manual Connect
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (tiktokUsername) {
      tiktokService.setUniqueId(tiktokUsername);
      setShowConnect(false);
      addToast(`Connecting to @${tiktokUsername}...`);
    }
  };

  // Host Controls (Keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Manual/Debug controls for Host
      if (e.key === 'F2') {
        initGame(); // Force restart
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initGame]);

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      
      {/* --- FLOATING NOTIFICATIONS (JOIN) --- */}
      <div className="absolute top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none w-64 items-end">
        {recentJoins.map((joiner) => (
          <div 
            key={joiner.id} 
            className="animate-slide-in-right bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-2xl flex items-center gap-3 w-full"
          >
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

      {/* --- PRAISE & WINNER OVERLAY (WON or LOST) --- */}
      {praise && (
         <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none bg-black/60 backdrop-blur-[6px] animate-fade-in gap-6 p-4">
             
             {/* CONTENT BASED ON GAME STATUS */}
             {gameStatus === GameStatus.WON ? (
                // --- WIN UI ---
                <>
                  <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-pop tracking-tighter text-center">
                     {praise}
                  </h1>
                  {winner && (
                   <div className="flex flex-col items-center animate-slide-up bg-zinc-900/60 p-6 rounded-3xl border border-yellow-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(234,179,8,0.2)]">
                      <div className="relative mb-3">
                        <img 
                          src={winner.profilePictureUrl} 
                          alt={winner.nickname} 
                          className="w-24 h-24 rounded-full border-4 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.5)] object-cover"
                        />
                        <Trophy className="absolute -bottom-2 -right-2 text-yellow-400 fill-yellow-400 drop-shadow-md" size={32} />
                      </div>
                      <h2 className="text-2xl font-bold text-white text-center px-4">{winner.nickname}</h2>
                      <p className="text-zinc-400 font-medium text-sm">@{winner.uniqueId}</p>
                   </div>
                  )}
                </>
             ) : (
                // --- LOST UI ---
                <>
                  <div className="text-8xl mb-2 animate-bounce drop-shadow-xl filter grayscale-[0.2]">😜</div>
                  <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-red-600 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-pop tracking-tighter text-center leading-tight">
                     {praise}
                  </h1>
                  
                  <div className="flex flex-col items-center animate-slide-up bg-zinc-900/60 p-6 rounded-3xl border border-rose-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(244,63,94,0.2)] mt-4">
                      <span className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2">JAWABANNYA ADALAH</span>
                      <h2 className="text-5xl sm:text-6xl font-black text-white text-center tracking-widest drop-shadow-lg">
                        {targetWord}
                      </h2>
                   </div>
                </>
             )}
         </div>
      )}

      {/* --- HEADER --- */}
      <header className="flex-none p-4 flex items-center justify-between bg-zinc-900/50 border-b border-white/5 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowConnect(true)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'}`}
           >
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
           <button 
            onClick={initGame} 
            disabled={loading}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
           >
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
           <button 
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
           >
             <Settings size={20} />
           </button>
        </div>
      </header>

      {/* --- MAIN GRID --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {loading ? (
           <div className="flex-1 flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
           </div>
        ) : (
          <Grid 
            guesses={guesses}
            currentGuess={currentGuess}
            targetWord={targetWord}
            wordLength={wordLength}
            maxGuesses={maxGuesses}
            isShake={shake}
          />
        )}
      </main>

      {/* --- MODALS --- */}
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 h-auto max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="text-indigo-500" /> Pengaturan
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Language */}
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-3 block flex items-center gap-2">
                  <Globe size={16} /> Bahasa / Language
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['ID', 'EN'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); initGame(); }}
                      className={`
                        p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all
                        ${language === lang 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}
                      `}
                    >
                      {lang === 'ID' ? '🇮🇩 Indonesia' : '🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Length */}
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-3 block flex items-center gap-2">
                   <Trophy size={16} /> Jumlah Huruf ({wordLength})
                </label>
                <input 
                  type="range" 
                  min="4" 
                  max="8" 
                  value={wordLength}
                  onChange={(e) => { setWordLength(Number(e.target.value)); }}
                  onMouseUp={initGame} 
                  onTouchEnd={initGame}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-2 font-mono">
                  <span>4</span><span>5</span><span>6</span><span>7</span><span>8</span>
                </div>
              </div>

              {/* Max Guesses (Rows) */}
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-3 block flex items-center gap-2">
                   <LayoutGrid size={16} /> Kesempatan Menebak ({maxGuesses})
                </label>
                <input 
                  type="range" 
                  min="3" 
                  max="12" 
                  value={maxGuesses}
                  onChange={(e) => { setMaxGuesses(Number(e.target.value)); }}
                  onMouseUp={initGame} 
                  onTouchEnd={initGame}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-2 font-mono">
                  <span>3</span><span>6</span><span>12</span>
                </div>
              </div>

               {/* Max Guesses Per User */}
               <div>
                <label className="text-sm font-medium text-zinc-400 mb-3 block flex items-center gap-2">
                   <Users size={16} /> Batas Tebakan Per Orang
                </label>
                <div className="flex items-center gap-4 bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                    <span className={`text-lg font-bold ${maxGuessesPerUser === 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {maxGuessesPerUser === 0 ? 'UNLIMITED' : maxGuessesPerUser}
                    </span>
                    <input 
                        type="range" 
                        min="0" 
                        max="5" 
                        value={maxGuessesPerUser}
                        onChange={(e) => { setMaxGuessesPerUser(Number(e.target.value)); }}
                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                    0 = Tidak ada batas. 1 = Hanya satu tebakan per ronde.
                </p>
              </div>

            </div>
            
            <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
               <p className="text-xs text-zinc-500">Changes apply immediately. Game will restart.</p>
            </div>
          </div>
        </div>
      )}

      {/* Connect TikTok Modal */}
      {showConnect && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <LinkIcon className="text-emerald-500" /> Connect TikTok
                </h2>
                <button onClick={() => setShowConnect(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleConnect} className="space-y-4">
                 <div>
                    <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">TikTok Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">@</span>
                      <input 
                        type="text" 
                        value={tiktokUsername}
                        onChange={(e) => setTiktokUsername(e.target.value)}
                        placeholder="johndoe"
                        className="w-full bg-zinc-800 border-2 border-zinc-700 focus:border-emerald-500 rounded-xl py-3 pl-8 pr-4 text-white font-bold outline-none transition-all placeholder-zinc-600"
                        autoFocus
                      />
                    </div>
                 </div>
                 
                 <button 
                   type="submit"
                   className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                 >
                   CONNECT
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Toasts */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              px-4 py-3 rounded-xl shadow-xl flex items-center justify-center gap-2 font-bold text-sm border backdrop-blur-sm animate-slide-up transition-all
              ${toast.type === 'error' ? 'bg-rose-500/90 border-rose-400/50 text-white shadow-rose-900/20' : 
                toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400/50 text-white shadow-emerald-900/20' : 
                'bg-zinc-800/90 border-zinc-700/50 text-white'}
            `}
          >
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'success' && <CheckCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default App;