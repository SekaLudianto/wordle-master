import React, { useState, useCallback, useEffect, useRef } from 'react';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import ChampionScreen from './components/ChampionScreen';
import LiveFeedPanel from './components/LiveFeedPanel';
import PauseScreen from './components/PauseScreen';
import ThemeToggle from './components/ThemeToggle';
import SoundToggle from './components/SoundToggle';
import KnockoutRegistrationScreen from './components/KnockoutRegistrationScreen';
import KnockoutBracketScreen from './components/KnockoutBracketScreen';
import KnockoutPrepareMatchScreen from './components/KnockoutPrepareMatchScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import SimulationPanel from './components/SimulationPanel';
import GlobalLeaderboardModal from './components/GlobalLeaderboardModal';
import { useTheme } from './hooks/useTheme';
import { useGameLogic } from './hooks/useGameLogic';
import { useTikTokLive } from './hooks/useTikTokLive';
import { useKnockoutChampions } from './hooks/useKnockoutChampions';
import { GameState, GameStyle, GiftNotification as GiftNotificationType, ChatMessage, LiveFeedEvent, KnockoutCategory, RankNotification as RankNotificationType, InfoNotification as InfoNotificationType, ServerConfig, DonationEvent } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { CHAMPION_SCREEN_TIMEOUT_MS, DEFAULT_MAX_WINNERS_PER_ROUND } from './constants';
import { KeyboardIcon, SkipForwardIcon, SwitchIcon } from './components/IconComponents';
import AdminInputPanel from './components/AdminInputPanel';

const MODERATOR_USERNAMES = ['ahmadsyams.jpg', 'achmadsyams'];

const infoTips: (() => React.ReactNode)[] = [
  () => <>Ketik <b className="text-sky-300">!myrank</b> di chat untuk melihat peringkat & skormu!</>,
  () => (
    <div className="flex items-center justify-center gap-1">
      Kirim
      <img 
        src="https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp" 
        alt="Mawar" 
        className="w-5 h-5 inline-block" 
      />
      untuk skip soal!
    </div>
  ),
];


const App: React.FC = () => {
  useTheme(); // Initialize theme logic
  const [gameState, setGameState] = useState<GameState>(GameState.Setup);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [isSimulation, setIsSimulation] = useState<boolean>(false);
  const [maxWinners, setMaxWinners] = useState<number>(DEFAULT_MAX_WINNERS_PER_ROUND);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  const [showAdminKeyboard, setShowAdminKeyboard] = useState(false);
  
  const [currentGift, setCurrentGift] = useState<GiftNotificationType | null>(null);
  const giftQueue = useRef<Omit<GiftNotificationType, 'id'>[]>([]);
  const [currentRank, setCurrentRank] = useState<RankNotificationType | null>(null);
  const rankQueue = useRef<Omit<RankNotificationType, 'id'>[]>([]);
  const [currentInfo, setCurrentInfo] = useState<InfoNotificationType | null>(null);
  const infoTipIndex = useRef(0);

  const [liveFeed, setLiveFeed] = useState<LiveFeedEvent[]>([]);

  const game = useGameLogic();
  const { champions, addChampion } = useKnockoutChampions();
  
  const handleGift = useCallback((gift: Omit<GiftNotificationType, 'id'>) => {
      const fullGift = { ...gift, id: `${new Date().getTime()}-${gift.userId}` };
      giftQueue.current.push(gift);
      setLiveFeed(prev => [fullGift, ...prev].slice(0, 100));

      if (!currentGift) {
        const nextGift = giftQueue.current.shift();
        if (nextGift) {
            setCurrentGift({ ...nextGift, id: `${new Date().getTime()}-${nextGift.userId}` });
        }
      }

      // Gift-to-skip logic
      const giftNameLower = gift.giftName.toLowerCase();
      const isRoseGift = giftNameLower.includes('mawar') || giftNameLower.includes('rose') || gift.giftId === 5655;

      if (isRoseGift && gameState === GameState.Playing) {
          game.skipRound();
      }
  }, [currentGift, gameState, game]);
  
  const handleDonation = useCallback((donation: DonationEvent) => {
    // Convert donation to a gift notification for UI display
    const gift: Omit<GiftNotification, 'id'> = {
      userId: donation.from_name,
      nickname: donation.from_name,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${donation.from_name}`,
      giftName: `${donation.message || `Donasi via ${donation.platform}`} (Rp ${donation.amount.toLocaleString()})`,
      giftCount: 1,
      giftId: 99999, // generic ID for donations
    };
    handleGift(gift);
  }, [handleGift]);

  useEffect(() => {
    if (currentGift) {
        const timer = setTimeout(() => {
            setCurrentGift(null);
        }, 5000); // gift shows for 5s
        return () => clearTimeout(timer);
    } else if (giftQueue.current.length > 0) {
        const nextGift = giftQueue.current.shift();
        if (nextGift) {
            const timer = setTimeout(() => {
              setCurrentGift({ ...nextGift, id: `${new Date().getTime()}-${nextGift.userId}` });
            }, 300); // small delay between notifications
            return () => clearTimeout(timer);
        }
    }
  }, [currentGift]);
  
  const handleRankCheck = useCallback((rankInfo: Omit<RankNotificationType, 'id'>) => {
      rankQueue.current.push(rankInfo);
      if (!currentRank) {
        const nextRank = rankQueue.current.shift();
        if (nextRank) {
            setCurrentRank({ ...nextRank, id: `${new Date().getTime()}-${nextRank.userId}` });
        }
      }
  }, [currentRank]);

  useEffect(() => {
    if (currentRank) {
        const timer = setTimeout(() => {
            setCurrentRank(null);
        }, 5000); // rank notification shows for 5s
        return () => clearTimeout(timer);
    } else if (rankQueue.current.length > 0) {
        const nextRank = rankQueue.current.shift();
        if (nextRank) {
            const timer = setTimeout(() => {
              setCurrentRank({ ...nextRank, id: `${new Date().getTime()}-${nextRank.userId}` });
            }, 300); // small delay between notifications
            return () => clearTimeout(timer);
        }
    }
  }, [currentRank]);

  // Periodic Info Notification Logic
  useEffect(() => {
      const activeGameStates = [
          GameState.Playing, 
          GameState.KnockoutPlaying,
          GameState.ClassicAnswerReveal,
          GameState.KnockoutRegistration,
          GameState.KnockoutReadyToPlay,
      ];
      if (!activeGameStates.includes(gameState)) {
          setCurrentInfo(null); // Clear info when not in active game
          return;
      }

      const infoInterval = setInterval(() => {
          const tipContent = infoTips[infoTipIndex.current]();
          setCurrentInfo({
              id: `${new Date().getTime()}-info`,
              content: tipContent,
          });
          infoTipIndex.current = (infoTipIndex.current + 1) % infoTips.length;
      }, 25000); // Show an info tip every 25 seconds

      return () => clearInterval(infoInterval);
  }, [gameState]);

  useEffect(() => {
      if (currentInfo) {
          const timer = setTimeout(() => {
              setCurrentInfo(null);
          }, 7000); // Info shows for 7s
          return () => clearTimeout(timer);
      }
  }, [currentInfo]);

  const handleComment = useCallback((message: ChatMessage) => {
    setLiveFeed(prev => [message, ...prev].slice(0,100));
    const commentText = message.comment.trim().toLowerCase();
    const isModerator = MODERATOR_USERNAMES.includes(message.userId.toLowerCase().replace(/^@/, ''));
    
    if (commentText === '!myrank') {
      const playerRank = game.state.leaderboard.findIndex(p => p.userId === message.userId);
      if (playerRank !== -1) {
          const playerScore = game.state.leaderboard[playerRank].score;
          handleRankCheck({
              userId: message.userId,
              nickname: message.nickname,
              profilePictureUrl: message.profilePictureUrl || `https://i.pravatar.cc/40?u=${message.userId}`,
              rank: playerRank + 1,
              score: playerScore,
          });
      } else {
          handleRankCheck({
              userId: message.userId,
              nickname: message.nickname,
              profilePictureUrl: message.profilePictureUrl || `https://i.pravatar.cc/40?u=${message.userId}`,
              rank: -1, // -1 indicates not ranked
              score: 0,
          });
      }
      return;
    }

    if (isModerator) {
      if ((gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) && commentText === '!skip') {
        game.skipRound();
        return;
      }
      if ((gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) && commentText === '!pause') {
        game.pauseGame();
        return;
      }
      if (gameState === GameState.Paused && commentText === '!resume') {
        game.resumeGame();
        return;
      }
    }

    if (gameState === GameState.KnockoutRegistration && commentText === '!ikut') {
      game.registerPlayer({ userId: message.userId, nickname: message.nickname, profilePictureUrl: message.profilePictureUrl });
    } else if (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) {
      game.processComment(message);
    }
  }, [gameState, game, handleRankCheck]);
  
  const handleAdminSubmit = (commentText: string) => {
    if (!serverConfig?.username && !isSimulation) return;
    const hostUsername = serverConfig?.username || 'admin';
    const adminMessage: ChatMessage = {
        id: `admin-${Date.now()}`,
        userId: hostUsername,
        nickname: `${hostUsername} (Host)`,
        comment: commentText,
        profilePictureUrl: `https://i.pravatar.cc/40?u=admin-${hostUsername}`,
        isWinner: false,
    };
    handleComment(adminMessage);
    setShowAdminKeyboard(false);
  };


  const { connectionStatus, connect, disconnect, error } = useTikTokLive(handleComment, handleGift);

  const handleConnect = useCallback((config: ServerConfig, isSimulating: boolean) => {
    setLiveFeed([]);
    setConnectionError(null);
    setIsDisconnected(false);
    setServerConfig(config);
    setIsSimulation(isSimulating);
    
    game.setHostUsername(config.username);

    if (isSimulating) {
        game.returnToModeSelection();
    } else {
        setGameState(GameState.Connecting);
        connect(config);
    }
  }, [connect, game]);

  const handleStartClassic = useCallback((winnersCount: number) => {
    setMaxWinners(winnersCount);
    game.startGame(GameStyle.Classic, winnersCount);
  }, [game]);

  const handleStartKnockout = useCallback((category: KnockoutCategory) => {
    game.startGame(GameStyle.Knockout, maxWinners, category);
  }, [game, maxWinners]);
  
  const handleBackToModeSelection = useCallback(() => {
    game.returnToModeSelection();
  }, [game]);
  
  const handleAutoRestart = useCallback(() => {
    game.startGame(GameStyle.Classic, maxWinners);
  }, [game, maxWinners]);

  const handleReconnect = useCallback(() => {
    if (!serverConfig) return;
    setConnectionError(null);
    setIsDisconnected(false);
    connect(serverConfig);
  }, [connect, serverConfig]);
  
  const handleSwitchMode = () => {
    if (window.confirm('Apakah Anda yakin ingin menghentikan permainan saat ini dan kembali ke menu pemilihan mode?')) {
        game.returnToModeSelection();
    }
  };

  useEffect(() => {
    if (isSimulation) return; // Don't run connection effects in simulation mode

    if (connectionStatus === 'connected') {
      if (gameState === GameState.Connecting) {
        setGameState(GameState.ModeSelection);
      }
      setIsDisconnected(false);
    }
    
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      const errorMessage = error || "Koneksi terputus. Silakan coba lagi.";
      setConnectionError(errorMessage);
      
      if (gameState !== GameState.Setup && gameState !== GameState.Connecting) {
        setIsDisconnected(true);
      } else if (gameState === GameState.Connecting) {
        setGameState(GameState.Setup);
        disconnect();
      }
    }
  }, [connectionStatus, gameState, error, disconnect, isSimulation]);

  // Game logic state transitions
  useEffect(() => {
    if (game.state.gameState !== gameState) {
        setGameState(game.state.gameState);
    }
  }, [game.state.gameState]);

  // Champion effect
  useEffect(() => {
    if (gameState === GameState.Champion) {
        if (game.state.gameStyle === GameStyle.Knockout) {
            const knockoutChampion = game.state.sessionLeaderboard?.[0];
            if (knockoutChampion) {
                addChampion(knockoutChampion);
            }
        }
    }
  }, [gameState, game.state.gameStyle, game.state.sessionLeaderboard, addChampion]);

  // Transition: Champion -> Finished (for Classic) or back to bracket (for Knockout)
  useEffect(() => {
    let timeoutId: number;
    if (gameState === GameState.Champion) {
      timeoutId = window.setTimeout(() => {
        if (game.state.gameStyle === GameStyle.Classic) {
          game.finishGame();
        } else {
          game.returnToBracket();
        }
      }, CHAMPION_SCREEN_TIMEOUT_MS);
    }
    return () => window.clearTimeout(timeoutId);
  }, [gameState, game.state.gameStyle, game]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName.toLowerCase() === 'input') {
        return;
      }
      if (event.key.toLowerCase() === 's' && (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying)) {
        game.skipRound();
      }
      if (event.key.toLowerCase() === 'p') {
        if (gameState === GameState.Playing || gameState === GameState.KnockoutPlaying) {
          game.pauseGame();
        } else if (gameState === GameState.Paused) {
          game.resumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, game]);


  const champion = game.state.sessionLeaderboard?.length > 0 ? game.state.sessionLeaderboard[0] : undefined;

  const renderContent = () => {
    switch (gameState) {
        case GameState.Setup:
        case GameState.Connecting:
            return (
                <motion.div
                    key="setup-connecting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                >
                    {gameState === GameState.Setup && <SetupScreen onConnect={handleConnect} error={connectionError} />}
                    {gameState === GameState.Connecting && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sky-400"></div>
                            <p className="mt-4 text-sky-500 dark:text-sky-300">Menghubungkan ke @{serverConfig?.username}...</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pastikan username benar dan streamer sedang live.</p>
                        </div>
                    )}
                </motion.div>
            );
        case GameState.ModeSelection:
            return <ModeSelectionScreen 
                      onStartClassic={handleStartClassic}
                      onStartKnockout={handleStartKnockout}
                      onShowLeaderboard={() => setShowGlobalLeaderboard(true)}
                   />;
        case GameState.Playing:
        case GameState.KnockoutPlaying:
        case GameState.ClassicAnswerReveal:
             return (
              <motion.div
                key="playing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="h-full"
              >
                <GameScreen 
                  gameState={game.state} 
                  isDisconnected={isDisconnected}
                  onReconnect={handleReconnect}
                  connectionError={connectionError}
                  currentGift={currentGift}
                  currentRank={currentRank}
                  currentInfo={currentInfo}
                  onFinishWinnerDisplay={game.finishWinnerDisplay}
                />
              </motion.div>
            );
        case GameState.KnockoutRegistration:
            return <KnockoutRegistrationScreen 
                      players={game.state.knockoutPlayers} 
                      onEndRegistration={game.endRegistrationAndDrawBracket} 
                      champions={champions} 
                      onResetRegistration={game.resetKnockoutRegistration}
                      isSimulation={isSimulation}
                    />;
        case GameState.KnockoutDrawing:
        case GameState.KnockoutReadyToPlay:
        case GameState.KnockoutShowWinner:
            return <KnockoutBracketScreen 
                        bracket={game.state.knockoutBracket} 
                        currentMatchId={game.getCurrentKnockoutMatch()?.id ?? null}
                        isReadyToPlay={gameState === GameState.KnockoutReadyToPlay || gameState === GameState.KnockoutDrawing}
                        onStartMatch={game.prepareNextMatch}
                        onRedrawBracket={game.redrawBracket}
                        onRestartCompetition={game.restartKnockoutCompetition}
                        onDeclareWalkoverWinner={game.declareWalkoverWinner}
                        champions={champions}
                        onReturnToModeSelection={game.returnToModeSelection}
                    />;
        case GameState.KnockoutPrepareMatch:
            return <KnockoutPrepareMatchScreen 
                        match={game.getCurrentKnockoutMatch()}
                        timeRemaining={game.state.countdownValue}
                        champions={champions}
                    />
        case GameState.Paused:
            return (
              <motion.div
                key="paused"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="h-full"
              >
                <PauseScreen />
              </motion.div>
            );
        case GameState.Champion:
            return (
              <motion.div
                key="champion"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="h-full"
              >
                <ChampionScreen champion={champion} isKnockout={game.state.gameStyle === GameStyle.Knockout} champions={champions} />
              </motion.div>
            );
        case GameState.Finished:
             return (
              <motion.div
                key="finished"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="h-full"
              >
                <GameOverScreen
                    leaderboard={game.state.sessionLeaderboard}
                    globalLeaderboard={game.state.leaderboard}
                    onBackToMenu={handleBackToModeSelection}
                    onAutoRestart={handleAutoRestart}
                />
              </motion.div>
            );
        default:
            return null;
    }
  }

  const showAdminButtons = gameState === GameState.Playing || gameState === GameState.KnockoutPlaying;
  const showLiveFeed = !isSimulation && (gameState !== GameState.Setup && gameState !== GameState.Connecting);

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-2 sm:p-4 relative">
      <AnimatePresence>
        {showGlobalLeaderboard && (
          <GlobalLeaderboardModal 
            leaderboard={game.state.leaderboard} 
            onClose={() => setShowGlobalLeaderboard(false)} 
          />
        )}
      </AnimatePresence>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <AnimatePresence>
              {showAdminButtons && (
                <>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={() => setShowAdminKeyboard(prev => !prev)}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
                  aria-label="Buka Keyboard Admin"
                  title="Buka Keyboard Admin"
                >
                  <KeyboardIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={handleSwitchMode}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
                  aria-label="Pindah Mode"
                  title="Pindah Mode Permainan"
                >
                  <SwitchIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={game.skipRound}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
                  aria-label="Lewati Soal"
                  title="Lewati Soal (S)"
                >
                  <SkipForwardIcon className="w-5 h-5 text-sky-500" />
                </motion.button>
                </>
              )}
            </AnimatePresence>
            <SoundToggle />
            <ThemeToggle />
        </div>
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-center gap-4">
        {/* Left Column: Game Screen */}
        <div className="w-full md:max-w-sm h-[95vh] min-h-[600px] max-h-[800px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-sky-500/10 border border-sky-200 dark:border-gray-700 overflow-hidden flex flex-col relative transition-colors duration-300">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
        
        {/* Right Column: Feed or Simulation Panel */}
        <AnimatePresence>
        {showLiveFeed && <LiveFeedPanel feed={liveFeed} />}
        {isSimulation && gameState !== GameState.Setup && (
            <SimulationPanel 
                onComment={handleComment} 
                onGift={handleGift}
                onDonation={handleDonation}
                currentAnswer={game.currentAnswer} 
                gameState={gameState}
                onRegisterPlayer={game.registerPlayer}
                knockoutPlayers={game.state.knockoutPlayers}
            />
        )}
        </AnimatePresence>
      </div>

       <AnimatePresence>
        {showAdminKeyboard && (
          <AdminInputPanel
            onSubmit={handleAdminSubmit}
            onClose={() => setShowAdminKeyboard(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;