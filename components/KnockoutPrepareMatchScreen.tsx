
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnockoutMatch, KnockoutChampions } from '../types';

interface KnockoutPrepareMatchScreenProps {
  match: KnockoutMatch | null;
  timeRemaining: number | null;
  champions: KnockoutChampions;
}

const KnockoutPrepareMatchScreen: React.FC<KnockoutPrepareMatchScreenProps> = ({ match, timeRemaining, champions }) => {
  if (!match || !match.player1 || !match.player2) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Mempersiapkan match...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl justify-center items-center text-center"
    >
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
        Siap-Siap!
      </h1>
      <div className="w-full flex justify-around items-center my-8 px-4">
        <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex flex-col items-center"
        >
          <img src={match.player1.profilePictureUrl} alt={match.player1.nickname} className="w-24 h-24 rounded-full border-4 border-sky-400 shadow-lg" />
           <div className="flex items-center gap-1 mt-2">
              <p className="font-bold text-lg truncate max-w-[120px]">{match.player1.nickname}</p>
              {champions[match.player1.userId] && (
                  <div className="flex items-center gap-0.5 text-amber-500">
                      <span className="text-sm">🏆</span>
                      <span className="text-sm font-bold">{champions[match.player1.userId].wins}</span>
                  </div>
              )}
          </div>
        </motion.div>

        <motion.p 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-5xl font-bold text-red-500"
        >
            VS
        </motion.p>
        
        <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex flex-col items-center"
        >
          <img src={match.player2.profilePictureUrl} alt={match.player2.nickname} className="w-24 h-24 rounded-full border-4 border-gray-400 dark:border-gray-500 shadow-lg" />
          <div className="flex items-center gap-1 mt-2">
            <p className="font-bold text-lg truncate max-w-[120px]">{match.player2.nickname}</p>
             {champions[match.player2.userId] && (
                <div className="flex items-center gap-0.5 text-amber-500">
                    <span className="text-sm">🏆</span>
                    <span className="text-sm font-bold">{champions[match.player2.userId].wins}</span>
                </div>
            )}
          </div>
        </motion.div>
      </div>
      <p className="text-lg text-gray-500 dark:text-gray-400">Match akan dimulai dalam:</p>
      <div className="text-7xl font-bold text-sky-500 dark:text-sky-300 mt-2">
         <AnimatePresence mode="wait">
            <motion.div
            key={timeRemaining}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            >
            {timeRemaining}
            </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default KnockoutPrepareMatchScreen;
