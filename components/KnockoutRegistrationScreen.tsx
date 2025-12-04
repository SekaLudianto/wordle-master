
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnockoutPlayer, KnockoutChampions } from '../types';
import { UsersIcon, TrophyIcon } from './IconComponents';

interface KnockoutRegistrationScreenProps {
  players: KnockoutPlayer[];
  onEndRegistration: () => void;
  onResetRegistration: () => void;
  champions: KnockoutChampions;
  isSimulation: boolean;
}

const KnockoutRegistrationScreen: React.FC<KnockoutRegistrationScreenProps> = ({ players, onEndRegistration, onResetRegistration, champions, isSimulation }) => {
  const [activeTab, setActiveTab] = useState<'register' | 'leaderboard'>('register');

  const topChampions = useMemo(() => {
    return Object.entries(champions)
        .map(([userId, data]) => ({ 
            userId, 
            wins: data.wins, 
            nickname: data.nickname 
        }))
        .sort((a, b) => b.wins - a.wins);
  }, [champions]);

  const getMedal = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return `${rank + 1}.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl"
    >
      <div className="text-center shrink-0">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
          Mode Knockout!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Pendaftaran dibuka!</p>
        <p className="text-sky-500 dark:text-sky-300 font-semibold animate-pulse text-lg my-2">
            Ketik <code className="bg-sky-100 text-sky-800 dark:bg-gray-700 dark:text-white px-2 py-1 rounded">!ikut</code> untuk bergabung!
        </p>
      </div>

      <div className="flex gap-2 my-2 shrink-0">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'register' ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-600 dark:bg-gray-700 dark:text-gray-400'}`}
          >
              <UsersIcon className="w-4 h-4"/>
              Pendaftar ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'leaderboard' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600 dark:bg-gray-700 dark:text-gray-400'}`}
          >
              <TrophyIcon className="w-4 h-4"/>
              Top Trofi
          </button>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 min-h-0">
        <AnimatePresence mode="wait">
        {activeTab === 'register' ? (
            <motion.div
                key="register-list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm"
            >
                {players.map((player) => (
                <motion.div
                    key={player.userId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    layout
                    className="flex items-center gap-2 p-1.5 bg-sky-50 dark:bg-gray-700/60 rounded-md"
                >
                    <img src={player.profilePictureUrl} alt={player.nickname} className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate font-medium text-sm text-slate-700 dark:text-gray-200">{player.nickname}</span>
                        {isSimulation && (
                            <span className="truncate text-[10px] text-sky-500 dark:text-sky-400">@{player.userId}</span>
                        )}
                    </div>
                    {champions[player.userId] && (
                        <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                            <span className="text-xs">🏆</span>
                            <span className="text-xs font-bold">{champions[player.userId].wins}</span>
                        </div>
                    )}
                </motion.div>
                ))}
                {players.length === 0 && (
                    <p className="text-center text-gray-500 pt-10 text-sm col-span-full">Belum ada pemain yang mendaftar...</p>
                )}
            </motion.div>
        ) : (
             <motion.div
                key="trophy-list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-1.5"
            >
                {topChampions.map((champ, index) => (
                    <motion.div
                        key={champ.userId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center p-2 bg-amber-50 dark:bg-gray-700/60 rounded-lg"
                    >
                         <div className="w-8 font-bold text-center text-amber-500 dark:text-amber-400 text-lg">{getMedal(index)}</div>
                         <div className="flex-1 min-w-0 px-2">
                             <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{champ.nickname}</p>
                         </div>
                         <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 shrink-0">
                             <TrophyIcon className="w-4 h-4"/>
                             <span className="font-bold text-md">{champ.wins}</span>
                         </div>
                    </motion.div>
                ))}
                {topChampions.length === 0 && (
                    <p className="text-center text-gray-500 pt-10 text-sm">Belum ada juara di sesi ini.</p>
                )}
            </motion.div>
        )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 mt-2 pt-2 border-t border-sky-100 dark:border-gray-700">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEndRegistration}
          disabled={players.length < 2}
          className="w-full px-4 py-3 bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
        >
          Mulai Drawing Bagan
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onResetRegistration}
          className="w-full mt-2 px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all"
        >
          Ulang Pendaftaran (Kosongkan Daftar)
        </motion.button>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">Minimal 2 pemain untuk memulai.</p>
      </div>
    </motion.div>
  );
};

export default KnockoutRegistrationScreen;
