import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCwIcon } from './IconComponents';

interface ReconnectOverlayProps {
  onReconnect: () => void;
  error: string | null;
}

const ReconnectOverlay: React.FC<ReconnectOverlayProps> = ({ onReconnect, error }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-white/70 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50 text-center"
    >
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-red-300 dark:border-red-500/50 max-w-sm">
        <h2 className="text-2xl font-bold text-red-500 dark:text-red-400">Koneksi Terputus</h2>
        <p className="text-slate-600 dark:text-gray-300 mt-2 mb-6">
          {error || 'Terjadi masalah saat menyambung ke server. Silakan coba lagi.'}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReconnect}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-sky-500 text-white font-bold rounded-lg shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition-all"
        >
          <RefreshCwIcon className="w-5 h-5" />
          Coba Lagi
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ReconnectOverlay;