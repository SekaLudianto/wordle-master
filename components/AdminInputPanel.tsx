import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface AdminInputPanelProps {
  onSubmit: (text: string) => void;
  onClose: () => void;
}

const keyboardLayout = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const AdminInputPanel: React.FC<AdminInputPanelProps> = ({ onSubmit, onClose }) => {
  const [inputText, setInputText] = useState('');

  const handleKeyPress = (key: string) => {
    setInputText(prev => prev + key);
  };

  const handleBackspace = () => {
    setInputText(prev => prev.slice(0, -1));
  };

  const handleSpace = () => {
    setInputText(prev => prev + ' ');
  };

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit(inputText);
      setInputText('');
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg bg-gray-200 dark:bg-gray-800 rounded-xl shadow-2xl z-50 p-3 border border-gray-300 dark:border-gray-700 cursor-grab"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">Panel Jawab Admin</h3>
        <button onClick={onClose} className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Tutup</button>
      </div>
      
      <div className="w-full bg-white dark:bg-gray-900 rounded-md p-2 mb-3 min-h-[40px] text-lg text-left text-slate-800 dark:text-white break-all">
        {inputText}
        <span className="animate-pulse">|</span>
      </div>

      <div className="space-y-1.5">
        {keyboardLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {row.map(key => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="flex-1 h-10 bg-white dark:bg-gray-600 rounded-md font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1.5">
          <button onClick={handleBackspace} className="w-16 h-10 bg-white dark:bg-gray-600 rounded-md font-bold text-gray-700 dark:text-gray-200">⌫</button>
          <button onClick={handleSpace} className="flex-1 h-10 bg-white dark:bg-gray-600 rounded-md"></button>
          <button onClick={handleSubmit} className="w-24 h-10 bg-green-500 text-white rounded-md font-bold hover:bg-green-600">Kirim</button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminInputPanel;
