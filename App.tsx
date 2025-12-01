import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, RefreshCw, Trophy, Globe, X, Radio, Link as LinkIcon, User, Layers } from 'lucide-react';
import { fetchDictionary, getRandomWord, isValidWord } from './services/wordService';
import { tiktokService } from './services/tiktokConnector';
import Grid from './components/Grid';
import { DictionaryData, GameStatus, GuessData, Language, TikTokChatEvent, TikTokMemberEvent, ToastMessage } from './types';

// Praise dictionary
const PRAISE_WORDS: Record<Language, string[]> = {
  ID: ['LUAR BIASA!', 'SEMPURNA!', 'SANGAT HEBAT!', 'JENIUS!', 'MANTAP JIWA!', 'KEREN ABIS!', 'SENSASIONAL!', 'ISTIMEWA!'],
  EN: ['MAGNIFICENT!', 'OUTSTANDING!', 'BRILLIANT!', 'PERFECT!', 'SPECTACULAR!', 'GENIUS!', 'UNSTOPPABLE!', 'AMAZING!']
};

const App: React.FC = () => {
  // Config State
  const [language, setLanguage] = useState<Language>('ID');
  const [wordLength, setWordLength] = useState<number>(5);
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
  const [currentGuess, setCurrentGuess] = useState(''); // Only for manual typing if needed
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [shake, setShake] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Praise State
  const [praise, setPraise] = useState<string | null>(null);

  // Queue System
  const [queueLength, setQueueLength] = useState(0); // For UI display only
  const guessQueueRef = useRef<{word: string, user?: any}[]>([]);

  const MAX_GUESSES = 6; 
  const isProcessingRef = useRef(false); // Lock for preventing double guesses during animation
  const ANIMATION_DELAY = 1500; // ms to wait before processing next guess

  const addToast = (msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message: msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  };

  // --- GAME INITIALIZATION ---

  const initGame = useCallback(async () => {
    setLoading(true);
    setGameStatus(GameStatus.PLAYING);
    setGuesses([]);
    setCurrentGuess('');
    setShake(false);
    setPraise(null);
    isProcessingRef.current = false;
    guessQueueRef.current = []; // Clear queue on reset
    setQueueLength(0);
    
    try {
      const dict = await fetchDictionary(language);
      setDictionary(dict);
      
      const word = getRandomWord(dict, wordLength);
      if (!word) {
        addToast(`No ${wordLength}-letter words found`);
        setTargetWord('');
      } else {
        setTargetWord(word);
        console.log('Target:', word); 
      }
    } catch (e) {
      addToast('Error loading dictionary');
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
  }, [gameStatus, dictionary, targetWord]); // Dependencies needed for processGuess closure context if not passed directly

  const processGuess = (guessWord: string, user?: any) => {
    // Double check status just in case
    if (gameStatus !== GameStatus.PLAYING || loading) return;
    
    // Check validation
    if (!dictionary || !isValidWord(guessWord, dictionary)) {
       // Only shake/notify for manual guesses. 
       // For queue items, we silently skip invalid words to keep the game moving fast,
       // OR we could toast it. Let's toast it briefly but not block queue long.
       if (!user) {
         setShake(true);
         addToast('Kata tidak valid!');
         setTimeout(() => setShake(false), 500);
       }
       
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
        
        // Check Win/Loss
        if (guessWord === targetWord) {
            setGameStatus(GameStatus.WON);
            isGameOver = true;
            addToast(`Benar! Oleh @${user?.uniqueId || 'Kamu'}`);
            
            // Trigger Praise
            const praises = PRAISE_WORDS[language];
            const randomPraise = praises[Math.floor(Math.random() * praises.length)];
            setPraise(randomPraise);

        } else if (updated.length >= MAX_GUESSES) {
            setGameStatus(GameStatus.LOST);
            isGameOver = true;
            addToast(`Game Over! Kata: ${targetWord}`);
        }

        return updated;
    });

    setCurrentGuess('');
    
    // Auto restart logic (independent of queue processing)
    if (isGameOver && isConnected) {
        setTimeout(() => {
          isProcessingRef.current = false; 
          initGame();
        }, 5000);
    }

    // Unlock and process next item after animation
    setTimeout(() => {
        // Only unlock if game isn't over
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
      // Logic for processing a chat message
      if (gameStatus !== GameStatus.PLAYING) return;
      
      const cleanGuess = msg.comment.trim().toUpperCase();
      
      // Strict validation for automated inputs
      if (!/^[A-Z]+$/.test(cleanGuess)) return;
      if (cleanGuess.length !== wordLength) return;
      
      // Add to Queue instead of processing immediately
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

  // Setup Socket Listeners (Run once)
  useEffect(() => {
    tiktokService.connectToBackend();

    tiktokService.onConnected((state) => {
      setIsConnected(true);
      setConnectionStatus(`Connected to room: ${state.roomId}`);
      setShowConnect(false);
      addToast('Terhubung ke TikTok Live! 🟢');
    });

    tiktokService.onDisconnected((err) => {
      setIsConnected(false);
      setConnectionStatus(`Disconnected: ${err}`);
      addToast('Koneksi Putus 🔴');
    });

    // Use the Ref to call the current handler
    const chatListener = (msg: TikTokChatEvent) => handleTikTokGuessRef.current(msg);
    const memberListener = (msg: TikTokMemberEvent) => handleTikTokMemberRef.current(msg);

    tiktokService.onChat(chatListener);
    tiktokService.onMember(memberListener);
    
    // Cleanup
    return () => {
       tiktokService.offChat(chatListener);
       tiktokService.offMember(memberListener);
       tiktokService.disconnect();
    };
  }, []);

  const handleConnect = () => {
    if (!tiktokUsername) return;
    setConnectionStatus('Connecting...');
    tiktokService.setUniqueId(tiktokUsername);
  };

  // --- MANUAL INPUT (PHYSICAL KEYBOARD) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || gameStatus !== GameStatus.PLAYING) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toUpperCase();
      
      if (key === 'ENTER') {
         if (currentGuess.length !== wordLength) {
            setShake(true);
            addToast('Huruf kurang!');
            setTimeout(() => setShake(false), 500);
            return;
         }
         processGuess(currentGuess, undefined);
      } else if (key === 'BACKSPACE') {
         setCurrentGuess(prev => prev.slice(0, -1));
      } else if (/^[A-Z]$/.test(key)) {
         if (currentGuess.length < wordLength) {
           setCurrentGuess(prev => prev + key);
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameStatus, loading, wordLength, dictionary, targetWord]); // Dependencies for manual input are fine as this effect re-runs


  return (
    <div className="flex flex-col h-full bg-background text-zinc-100 relative overflow-hidden font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-900/60 backdrop-blur-md shrink-0 shadow-lg shadow-black/20">
        <div className="w-10">
           <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Settings size={20} className="text-zinc-400 hover:text-white" />
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-sm">
            WORDLE
          </h1>
          <button 
            onClick={() => setShowConnect(true)}
            className={`flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wide transition-all ${
              isConnected 
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            {isConnected ? (
                <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    TIKTOK LIVE
                </>
            ) : (
                <>
                    <LinkIcon size={10} />
                    CONNECT TIKTOK
                </>
            )}
          </button>
        </div>

        <div className="w-10 flex justify-end">
          <button onClick={initGame} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <RefreshCw size={20} className={`text-zinc-400 hover:text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Floating Welcome Notifications (Top-Right) */}
      <div className="absolute top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none w-72 items-end">
        {recentJoins.map((joiner) => (
          <div 
            key={joiner.id} 
            className="animate-slide-in-right flex items-center gap-3 bg-zinc-800/60 backdrop-blur-xl border-l-4 border-emerald-500 p-2 pr-4 rounded-r-lg rounded-l-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] w-auto max-w-full ring-1 ring-white/5"
          >
             <div className="w-10 h-10 rounded-full border-2 border-zinc-700/50 overflow-hidden flex-shrink-0 relative shadow-md">
                {joiner.profilePictureUrl ? (
                   <img src={joiner.profilePictureUrl} alt={joiner.nickname} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full bg-zinc-700 flex items-center justify-center"><User size={16} /></div>
                )}
             </div>
             <div className="flex flex-col min-w-0 text-left">
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                  Welcome
                </span>
                <span className="text-xs font-bold text-white truncate max-w-[150px] leading-tight">
                  {joiner.nickname}
                </span>
             </div>
          </div>
        ))}
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full overflow-hidden relative z-10 pb-6">
        
        {/* Toasts (Top Center) */}
        <div className="absolute top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="bg-zinc-800/90 backdrop-blur border border-zinc-700 text-white px-5 py-2 rounded-full shadow-2xl font-semibold text-xs sm:text-sm animate-pop flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              {t.message}
            </div>
          ))}
        </div>
        
        {/* Queue Indicator */}
        {queueLength > 0 && (
           <div className="absolute top-20 left-4 z-30 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 animate-fade-in shadow-lg">
               <Layers size={14} className="text-indigo-400 animate-pulse" />
               <span className="text-[10px] font-bold text-zinc-300">ANTRIAN: <span className="text-white">{queueLength}</span></span>
           </div>
        )}

        {/* PRAISE OVERLAY */}
        {praise && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
             <div className="animate-pop text-center relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-amber-500/20 blur-[60px] rounded-full animate-pulse-slow"></div>
                
                {/* Main Text */}
                <h1 className="relative text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] tracking-tighter transform -rotate-2 scale-110 shadow-amber-500/50">
                   {praise}
                </h1>
             </div>
          </div>
        )}

        {/* Grid */}
        <Grid 
          guesses={guesses}
          currentGuess={currentGuess}
          targetWord={targetWord}
          wordLength={wordLength}
          maxGuesses={MAX_GUESSES}
          isShake={shake}
        />
        
        <div className="text-zinc-500 text-[10px] font-medium tracking-wide mt-4 opacity-50">
           {isConnected ? 'MENUNGGU KOMENTAR TIKTOK...' : 'TEKAN TOMBOL CONNECT UNTUK MEMULAI'}
        </div>
      </div>

      {/* Connect Modal */}
      {showConnect && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-sm ring-1 ring-white/10">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Radio className="text-rose-500" /> TikTok Connection
                  </h2>
                  <button onClick={() => setShowConnect(false)}><X className="text-zinc-500" /></button>
              </div>

              <div className="space-y-4">
                  <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 text-xs text-zinc-400">
                      Sambungkan ke TikTok Live agar penonton bisa ikut bermain lewat komentar!
                      <div className="mt-2 font-mono text-[10px] bg-black/30 p-2 rounded">
                          Status Server: <span className={isConnected ? "text-emerald-400" : "text-amber-400"}>{connectionStatus}</span>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Username TikTok Host</label>
                      <div className="flex gap-2">
                          <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                              <input 
                                type="text" 
                                value={tiktokUsername}
                                onChange={(e) => setTiktokUsername(e.target.value)}
                                placeholder="username"
                                className="w-full bg-zinc-800 text-white pl-8 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                              />
                          </div>
                          <button 
                             onClick={handleConnect}
                             disabled={isConnected}
                             className={`px-4 rounded-xl font-bold text-sm transition-all ${isConnected ? 'bg-emerald-600 text-white opacity-50' : 'bg-rose-600 text-white hover:bg-rose-500'}`}
                          >
                             {isConnected ? 'OK' : 'Go'}
                          </button>
                      </div>
                  </div>

                  <div className="text-[10px] text-zinc-500 text-center">
                      Pastikan akun sedang LIVE streaming.
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-sm relative ring-1 ring-white/10">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold mb-6 text-center text-white flex items-center justify-center gap-2">
              <Settings size={20} className="text-indigo-400" />
              Pengaturan
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                  <Globe size={14} /> Bahasa / Language
                </label>
                <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl">
                  {['ID', 'EN'].map((lang) => (
                    <button 
                      key={lang}
                      onClick={() => { setLanguage(lang as Language); setShowSettings(false); initGame(); }}
                      className={`py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
                        language === lang 
                          ? 'bg-zinc-700 text-white shadow-lg shadow-black/20 ring-1 ring-white/10' 
                          : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                      }`}
                    >
                      {lang === 'ID' ? 'Indonesia' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3">
                  Jumlah Huruf
                </label>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-zinc-400 text-sm">Panjang Kata</span>
                     <span className="text-2xl font-black text-indigo-400">{wordLength}</span>
                  </div>
                  <input 
                    type="range" 
                    min="4" 
                    max="8" 
                    value={wordLength} 
                    onChange={(e) => setWordLength(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-colors"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 font-bold mt-2 font-mono">
                    <span>4</span>
                    <span>8</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                Simpan & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameStatus !== GameStatus.PLAYING && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl text-center animate-pop max-w-xs w-full relative overflow-hidden ring-1 ring-white/10">
            
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gameStatus === GameStatus.WON ? 'from-emerald-500 to-green-300' : 'from-red-500 to-orange-500'}`} />

            <div className="mb-4 flex justify-center">
              {gameStatus === GameStatus.WON ? (
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2 animate-bounce">
                  <Trophy size={32} className="text-emerald-400" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                   <span className="text-3xl">😔</span>
                </div>
              )}
            </div>

            <h2 className="text-3xl font-black mb-1 text-white tracking-tight">
              {gameStatus === GameStatus.WON ? 'HEBAT!' : 'YAHHH...'}
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              {gameStatus === GameStatus.WON ? 'Kamu berhasil menebak kata:' : 'Jangan menyerah, kata kuncinya:'}
            </p>

            <div className="bg-black/30 p-4 rounded-xl mb-6 border border-white/5">
               <span className="text-2xl font-mono tracking-[0.2em] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                 {targetWord}
               </span>
            </div>

            <div className="flex flex-col gap-2">
                <button 
                  onClick={initGame}
                  className={`w-full font-bold py-3.5 rounded-xl shadow-lg transform transition active:scale-95 text-white
                    ${gameStatus === GameStatus.WON 
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50' 
                      : 'bg-zinc-700 hover:bg-zinc-600'}
                  `}
                >
                  Main Lagi
                </button>
                {isConnected && (
                     <p className="text-[10px] text-zinc-500 mt-2">Game akan restart otomatis dalam 5 detik...</p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;