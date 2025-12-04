import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../hooks/useSound';
import { Volume2Icon, VolumeXIcon } from './IconComponents';

const SoundToggle: React.FC = () => {
  const { isMuted, toggleMute } = useSound();

  return (
    <button
      onClick={toggleMute}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-gray-900 focus:ring-sky-500"
      aria-label="Toggle sound"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={isMuted ? 'muted' : 'unmuted'}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          {isMuted ? (
            <VolumeXIcon className="w-5 h-5" />
          ) : (
            <Volume2Icon className="w-5 h-5 text-sky-500" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

export default SoundToggle;
