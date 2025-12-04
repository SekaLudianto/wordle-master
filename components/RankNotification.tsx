import React from 'react';
import { motion } from 'framer-motion';
import { RankNotification } from '../types';
import { TrophyIcon } from './IconComponents';

const RankNotification: React.FC<RankNotification> = ({ nickname, profilePictureUrl, rank, score }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      layout
      className="p-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 border-2 border-sky-300 shadow-lg shadow-black/30 flex items-center gap-3"
    >
      <div className="shrink-0 relative">
        <img
          src={profilePictureUrl}
          alt={nickname}
          className="w-12 h-12 rounded-full border-2 border-white"
        />
        <div className="absolute -bottom-2 -right-2 bg-amber-400 rounded-full p-1 border-2 border-sky-300">
            <TrophyIcon className="w-4 h-4 text-white"/>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{nickname}</p>
        {rank !== -1 ? (
            <>
                <p className="text-sky-100 text-xs">
                  Peringkat <span className="font-bold text-white">#{rank}</span>
                </p>
                <p className="text-white font-semibold text-xs mt-0.5">
                  Skor: {score.toLocaleString()}
                </p>
            </>
        ) : (
            <p className="text-sky-100 text-xs mt-0.5">
                Kamu belum masuk peringkat. Ayo main!
            </p>
        )}
      </div>
    </motion.div>
  );
};

export default RankNotification;
