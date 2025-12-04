import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry } from '../types';

interface GlobalLeaderboardModalProps {
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
}

const getMedal = (rank: number) => {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return `${rank + 1}.`;
};

const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({ leaderboard, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full max-w-sm h-[80vh] max-h-[600px] bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 shrink-0">
            Peringkat Global
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 shrink-0">Skor total dari semua permainan.</p>
          
          <div className="flex-grow overflow-y-auto pr-2 space-y-1.5">
            {leaderboard.map((entry, index) => (
              <motion.div
                key={entry.nickname}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center p-2 bg-sky-50 dark:bg-gray-700/60 rounded-lg"
              >
                <div className="w-8 font-bold text-md text-center text-amber-500 dark:text-amber-400">{getMedal(index)}</div>
                <img
                  src={entry.profilePictureUrl || 'https://i.pravatar.cc/40'}
                  alt={entry.nickname}
                  className="w-8 h-8 rounded-full mx-2"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{entry.nickname}</p>
                </div>
                <div className="text-sky-500 dark:text-sky-400 font-bold text-sm">{entry.score.toLocaleString()}</div>
              </motion.div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-center text-slate-500 dark:text-gray-500 pt-10 text-sm">Papan peringkat masih kosong.</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-all shrink-0"
          >
            Tutup
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalLeaderboardModal;