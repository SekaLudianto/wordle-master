import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../types';
import { useSound } from '../hooks/useSound';
import { GAME_OVER_RESTART_DELAY_SECONDS } from '../constants';

interface GameOverScreenProps {
  leaderboard: LeaderboardEntry[];
  globalLeaderboard: LeaderboardEntry[];
  onBackToMenu: () => void;
  onAutoRestart: () => void;
}

const getMedal = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return `${rank + 1}.`;
};

const GameOverScreen: React.FC<GameOverScreenProps> = ({ leaderboard, globalLeaderboard, onBackToMenu, onAutoRestart }) => {
  const [countdown, setCountdown] = useState(GAME_OVER_RESTART_DELAY_SECONDS);
  const { playSound } = useSound();

  useEffect(() => {
    playSound('gameOver');
  }, [playSound]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onAutoRestart();
    }
  }, [countdown, onAutoRestart]);

  const topSessionPlayers = leaderboard.slice(0, 10);
  const topGlobalPlayers = globalLeaderboard.slice(0, 10);

  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl transition-colors duration-300">
      <div className="text-center shrink-0">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
          🎉 Permainan Selesai! 🎉
        </h1>
      </div>

      <div className="flex-grow my-2 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto px-1 text-xs">
        {/* Session Leaderboard */}
        <div>
          <h2 className="font-bold text-center mb-2 text-sky-600 dark:text-sky-300">🏆 Peringkat Sesi Ini</h2>
          <div className="space-y-1.5">
            {topSessionPlayers.map((entry, index) => (
              <motion.div
                key={`session-${entry.userId}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="flex items-center p-1.5 bg-sky-50 dark:bg-gray-700/60 rounded-lg"
              >
                <div className="w-6 font-bold text-center text-amber-500 dark:text-amber-400">{getMedal(index)}</div>
                <img src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'} alt={entry.nickname} className="w-6 h-6 rounded-full mx-1" />
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{entry.nickname}</p></div>
                <div className="text-sky-500 dark:text-sky-400 font-bold">{entry.score.toLocaleString()}</div>
              </motion.div>
            ))}
            {topSessionPlayers.length === 0 && <p className="text-center text-gray-500 pt-10 text-sm">Tidak ada skor di sesi ini.</p>}
          </div>
        </div>

        {/* Global Leaderboard */}
        <div>
          <h2 className="font-bold text-center mb-2 text-amber-600 dark:text-amber-400">🌍 Top 10 Global</h2>
           <div className="space-y-1.5">
            {topGlobalPlayers.map((entry, index) => (
              <motion.div
                key={`global-${entry.userId}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="flex items-center p-1.5 bg-amber-50 dark:bg-gray-700/60 rounded-lg"
              >
                <div className="w-6 font-bold text-center text-amber-500 dark:text-amber-400">{getMedal(index)}</div>
                <img src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'} alt={entry.nickname} className="w-6 h-6 rounded-full mx-1" />
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{entry.nickname}</p></div>
                <div className="text-amber-500 dark:text-amber-400 font-bold">{entry.score.toLocaleString()}</div>
              </motion.div>
            ))}
            {topGlobalPlayers.length === 0 && <p className="text-center text-gray-500 pt-10 text-sm">Peringkat global kosong.</p>}
          </div>
        </div>
      </div>
      
       <div className="text-center pt-2 shrink-0 border-t border-sky-100 dark:border-gray-700">
         <div className="my-2 p-2 bg-sky-100 dark:bg-gray-700 rounded-lg">
            <p className="font-bold text-sky-600 dark:text-sky-300 animate-pulse">Tap-Tap Layar & Sukai Live!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Game baru dimulai dalam <span className="font-bold">{countdown}</span> detik...</p>
         </div>
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBackToMenu}
            className="w-full mt-2 px-4 py-2 bg-gray-500 text-white font-bold rounded-lg shadow-lg shadow-gray-500/30 hover:bg-gray-600 transition-all text-sm"
        >
          Kembali ke Menu Utama
        </motion.button>
      </div>
    </div>
  );
};

export default GameOverScreen;