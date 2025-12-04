import React from 'react';
import { motion } from 'framer-motion';
import { InfoNotification as InfoNotificationType } from '../types';
import { InfoIcon } from './IconComponents';

const InfoNotification: React.FC<InfoNotificationType> = ({ content }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      layout
      className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 border-2 border-blue-300 shadow-lg shadow-black/30 flex items-center gap-2 text-center"
    >
      <div className="shrink-0 bg-white/20 rounded-full p-1">
          <InfoIcon className="w-4 h-4 text-white"/>
      </div>
      <div className="flex-1 min-w-0 text-white text-xs font-semibold">
        {content}
      </div>
    </motion.div>
  );
};

export default InfoNotification;