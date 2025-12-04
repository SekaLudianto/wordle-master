import React from 'react';
import { motion } from 'framer-motion';
import { HeartIcon } from './IconComponents';

const PauseScreen: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl items-center justify-center text-center transition-colors duration-300">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <HeartIcon className="w-20 h-20 text-pink-500" />
      </motion.div>
      <h1 className="text-3xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
        Permainan Dijeda
      </h1>
      <p className="text-pink-500 dark:text-pink-400 font-semibold mt-2 text-lg animate-pulse">
        Waktunya Tap-Tap Layar! ❤️
      </p>
      <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
        Bantu share dan kasih banyak likes dulu yuk biar makin semangat!
      </p>
      <div className="mt-6 text-xs text-gray-500 border-t border-sky-100 dark:border-gray-700 pt-3">
        <p>Admin dapat menekan tombol <kbd className="px-2 py-1.5 text-xs font-semibold text-sky-700 bg-sky-100 border border-sky-200 rounded-md dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600">P</kbd> untuk melanjutkan permainan.</p>
      </div>
    </div>
  );
};

export default PauseScreen;