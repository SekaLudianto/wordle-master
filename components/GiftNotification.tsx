
import React from 'react';
import { motion } from 'framer-motion';
import { GiftNotification as GiftNotificationType } from '../types';
import { GiftIcon } from './IconComponents';

const GiftNotification: React.FC<GiftNotificationType> = ({ nickname, profilePictureUrl, giftName, giftCount }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      layout
      className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 border-2 border-amber-300 shadow-lg shadow-black/30 flex items-center gap-3"
    >
      <div className="shrink-0 relative">
        <img
          src={profilePictureUrl}
          alt={nickname}
          className="w-12 h-12 rounded-full border-2 border-white"
        />
        <div className="absolute -bottom-2 -right-2 bg-pink-500 rounded-full p-1 border-2 border-amber-400">
            <GiftIcon className="w-4 h-4 text-white"/>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{nickname}</p>
        <p className="text-amber-100 text-xs">
          Mengirim {giftCount}x {giftName}!
        </p>
        <p className="text-white font-semibold text-xs mt-0.5">Terima kasih banyak! ✨</p>
      </div>
    </motion.div>
  );
};

export default GiftNotification;
