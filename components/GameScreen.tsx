


import React, { useState, useEffect } from 'react';
import GameTab from './GameTab';
import ChatTab from './ChatTab';
import LeaderboardTab from './LeaderboardTab';
import CountdownOverlay from './CountdownOverlay';
import { GamepadIcon, MessageCircleIcon, TrophyIcon } from './IconComponents';
import { AnimatePresence } from 'framer-motion';
import RoundWinnerModal from './RoundWinnerModal';
import ReconnectOverlay from './ReconnectOverlay';
import { useSound } from '../hooks/useSound';
import { GiftNotification as GiftNotificationType, RankNotification as RankNotificationType, GameMode, GameStyle, InfoNotification as InfoNotificationType } from '../types';
import { InternalGameState } from '../hooks/useGameLogic';
import GiftNotification from './GiftNotification';
import RankNotification from './RankNotification';
import InfoNotification from './InfoNotification';

type Tab = 'game' | 'chat' | 'leaderboard';

interface GameScreenProps {
  gameState: InternalGameState;
  isDisconnected: boolean;
  onReconnect: () => void;
  connectionError: string | null;
  currentGift: GiftNotificationType | null;
  currentRank: RankNotificationType | null;
  currentInfo: InfoNotificationType | null;
  onFinishWinnerDisplay: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState, isDisconnected, onReconnect, connectionError, currentGift, currentRank, currentInfo, onFinishWinnerDisplay }) => {
  const [activeTab, setActiveTab] = useState<Tab>('game');
  const { playSound } = useSound();

  // Play sound on new round start
  useEffect(() => {
    if (gameState.isRoundActive) {
      playSound('roundStart');
    }
  }, [gameState.round, gameState.isRoundActive, playSound, gameState.currentMatchIndex]);

  // Play sound on first correct answer (Classic Mode)
  useEffect(() => {
    if (gameState.gameStyle === GameStyle.Classic && gameState.roundWinners.length === 1) {
      playSound('correctAnswer');
    }
  }, [gameState.roundWinners.length, gameState.gameStyle, playSound]);

  const navItems = [
    { id: 'game', label: 'Game', icon: GamepadIcon },
    { id: 'chat', label: 'Chat', icon: MessageCircleIcon },
    { id: 'leaderboard', label: 'Peringkat', icon: TrophyIcon },
  ];
  
  const getHeaderTitle = () => {
    if (gameState.gameStyle === GameStyle.Knockout) {
        return "Mode Knockout";
    }
    return "Kuis Kata & Bendera Live";
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-3xl transition-colors duration-300">
      <header className="p-3 text-center border-b border-sky-100 dark:border-gray-700 shrink-0">
        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-teal-400">
          {getHeaderTitle()}
        </h1>
      </header>

      <main className="flex-grow overflow-hidden relative">
        <div className="absolute top-2 left-0 right-0 px-3 z-50 pointer-events-none space-y-2">
          <AnimatePresence>
            {currentGift && <GiftNotification key={currentGift.id} {...currentGift} />}
          </AnimatePresence>
          <AnimatePresence>
            {currentRank && <RankNotification key={currentRank.id} {...currentRank} />}
          </AnimatePresence>
          <AnimatePresence>
             {/* FIX: The 'id' prop was missing, which is required by the 'InfoNotification' component's type definition. It is now correctly passed from 'currentInfo'. */}
             {currentInfo && <InfoNotification key={currentInfo.id} id={currentInfo.id} content={currentInfo.content} />}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {gameState.countdownValue && gameState.countdownValue > 0 && (
            <CountdownOverlay count={gameState.countdownValue} />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
            {activeTab === 'game' && <GameTab key="game" gameState={gameState} />}
            {activeTab === 'chat' && <ChatTab key="chat" messages={gameState.chatMessages} />}
            {activeTab === 'leaderboard' && <LeaderboardTab key="leaderboard" leaderboard={gameState.leaderboard} />}
        </AnimatePresence>
        <AnimatePresence>
          {gameState.showWinnerModal && gameState.gameStyle === GameStyle.Classic && <RoundWinnerModal 
              winners={gameState.roundWinners} 
              round={gameState.round} 
              gameMode={gameState.gameMode!}
              allAnswersFound={gameState.allAnswersFoundInRound}
              onScrollComplete={onFinishWinnerDisplay}
            />}
        </AnimatePresence>
        <AnimatePresence>
          {isDisconnected && <ReconnectOverlay onReconnect={onReconnect} error={connectionError} />}
        </AnimatePresence>
      </main>

      <nav className="flex justify-around p-1 border-t border-sky-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 rounded-b-3xl shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={`flex flex-col items-center justify-center w-20 h-14 rounded-lg transition-colors duration-200 ${
              activeTab === item.id ? 'text-sky-500 bg-sky-500/10 dark:text-sky-400 dark:bg-sky-400/10' : 'text-gray-500 hover:bg-sky-100 dark:text-gray-400 dark:hover:bg-gray-700'
            } ${item.id === 'chat' ? 'md:hidden' : ''}`}
          >
            <item.icon className="w-5 h-5 mb-0.5" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default GameScreen;