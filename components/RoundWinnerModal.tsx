import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RoundWinner, GameMode } from '../types';
import { PartyPopperIcon } from './IconComponents';
import { useSound } from '../hooks/useSound';
import { WINNER_MODAL_TIMEOUT_MS } from '../constants';

interface RoundWinnerModalProps {
  winners: RoundWinner[];
  round: number;
  gameMode: GameMode;
  allAnswersFound: boolean;
  onScrollComplete: () => void;
}

const getRankDisplay = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return `${rank + 1}.`;
};

const RoundWinnerModal: React.FC<RoundWinnerModalProps> = ({ winners, round, gameMode, allAnswersFound, onScrollComplete }) => {
  const { playSound } = useSound();
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    playSound(winners.length > 0 ? 'roundEnd' : 'roundEndMuted');
  }, [playSound, winners.length]);

  useEffect(() => {
    const listElement = listContainerRef.current;
    if (!listElement) return;

    const controlTimeout = setTimeout(() => {
        const isOverflowing = listElement.scrollHeight > listElement.clientHeight;

        if (isOverflowing) {
            const scrollDistance = listElement.scrollHeight - listElement.clientHeight;
            const scrollDuration = (scrollDistance / 40) * 1000; // 40px/s, in ms

            let start: number | undefined;
            let animationFrameId: number;

            const step = (timestamp: number) => {
                if (start === undefined) {
                    start = timestamp;
                }
                const elapsed = timestamp - start;
                const progress = Math.min(elapsed / scrollDuration, 1);

                listElement.scrollTop = progress * scrollDistance;
                
                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(step);
                } else {
                    setTimeout(onScrollComplete, 1500); // Wait at the end
                }
            };

            animationFrameId = requestAnimationFrame(step);
            
            return () => cancelAnimationFrame(animationFrameId);

        } else {
            const timeoutId = setTimeout(onScrollComplete, WINNER_MODAL_TIMEOUT_MS);
            return () => clearTimeout(timeoutId);
        }
    }, 3000); // Wait 3s at the start for users to see the top winners

    return () => clearTimeout(controlTimeout);
  }, [winners, onScrollComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="absolute inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center p-4 z-50"
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 border-2 border-sky-400 dark:border-sky-500 rounded-2xl p-6 text-center shadow-2xl shadow-sky-500/30">
        <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, 0]}}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "mirror" }}
            className="text-amber-500 dark:text-amber-400 mx-auto w-fit"
        >
            <PartyPopperIcon className="w-12 h-12" />
        </motion.div>
        <h2 className="text-2xl font-bold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          Pemenang Ronde {round}!
        </h2>
        {allAnswersFound && (
            <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-green-600 dark:text-green-300 mt-1 font-semibold"
            >
                Kerja bagus! Semua jawaban ditemukan!
            </motion.p>
        )}
        <div ref={listContainerRef} className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
            {winners.sort((a,b) => a.time - b.time).map((winner, index) => (
                <motion.div 
                    key={winner.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex items-center p-2 bg-sky-50 dark:bg-gray-700/50 rounded-lg text-left"
                >
                    <div className="w-8 font-bold text-center">{getRankDisplay(index)}</div>
                    <img src={winner.profilePictureUrl} alt={winner.nickname} className="w-8 h-8 rounded-full mx-2"/>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{winner.nickname}</p>
                        {gameMode === GameMode.ABC5Dasar && winner.answer ? (
                            <p className="text-xs text-slate-600 dark:text-gray-300 italic truncate">"{winner.answer}"</p>
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-gray-400">{winner.time.toFixed(1)} detik</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-green-500 dark:text-green-400">+{winner.score} 🪙</p>
                        {winner.bonus && winner.bonus > 0 && (
                            <p className="text-xs text-amber-500 dark:text-amber-400 font-semibold">✨ (unik +{winner.bonus})</p>
                        )}
                    </div>
                </motion.div>
            ))}
             {winners.length === 0 && (
                <p className="text-slate-500 dark:text-gray-400 pt-4">Tidak ada pemenang di ronde ini.</p>
             )}
        </div>
      </div>
    </motion.div>
  );
};

export default RoundWinnerModal;