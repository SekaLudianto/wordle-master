
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry, KnockoutChampions } from '../types';
import { TrophyIcon } from './IconComponents';
import { useSound } from '../hooks/useSound';

// Declare confetti as a global variable to use it from the CDN script
declare var confetti: any;

interface ChampionScreenProps {
  champion: LeaderboardEntry | undefined;
  isKnockout?: boolean;
  champions: KnockoutChampions;
}

const ChampionScreen: React.FC<ChampionScreenProps> = ({ champion, isKnockout = false, champions }) => {
  const { playSound } = useSound();

  useEffect(() => {
    if (champion) {
      playSound('champion');
      
      // Only run confetti if not in knockout mode
      if (!isKnockout && typeof confetti === 'function') {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: number = window.setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
      }
    }
  }, [champion, isKnockout, playSound]);

  return (
    <div className="flex flex-col h-full p-4 bg-gradient-to-b from-white to-sky-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl items-center justify-center text-center transition-colors duration-300">
      {champion ? (
        <>
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 150, delay: 0.2 }}
          >
            <TrophyIcon className="w-20 h-20 text-amber-400" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500"
          >
            {isKnockout ? 'Juara Knockout!' : 'Pemenang Utama!'}
          </motion.h1>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-4 flex flex-col items-center"
          >
            <img 
              src={champion.profilePictureUrl} 
              alt={champion.nickname} 
              className="w-24 h-24 rounded-full border-4 border-amber-400 shadow-lg shadow-amber-500/30"
            />
            <p className="mt-3 text-xl font-bold text-slate-800 dark:text-white">{champion.nickname}</p>
            {isKnockout && champions[champion.userId] && (
                <div className="flex items-center gap-1.5 mt-1 text-amber-500 dark:text-amber-400">
                    <span className="text-lg">🏆</span>
                    <span className="text-lg font-bold">Total Kemenangan: {champions[champion.userId].wins}</span>
                </div>
            )}
            {!isKnockout && (
                 <p className="mt-1 text-lg text-sky-500 dark:text-sky-400 font-semibold">{champion.score.toLocaleString()} Poin</p>
            )}
          </motion.div>
        </>
      ) : (
        <p className="text-xl text-slate-500 dark:text-gray-400">Tidak ada pemenang di permainan ini.</p>
      )}
    </div>
  );
};

export default ChampionScreen;
