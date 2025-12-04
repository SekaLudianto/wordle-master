import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownOverlayProps {
  count: number;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-9xl font-bold text-white"
          style={{
            textShadow: '0 0 20px rgba(255, 255, 255, 0.7)',
          }}
        >
          {count}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default CountdownOverlay;
