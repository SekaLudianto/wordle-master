import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GamepadIcon } from './IconComponents';
import { DEFAULT_MAX_WINNERS_PER_ROUND } from '../constants';
import { GameStyle, KnockoutCategory } from '../types';

interface ModeSelectionScreenProps {
  onStartClassic: (maxWinners: number) => void;
  onStartKnockout: (category: KnockoutCategory) => void;
  onShowLeaderboard: () => void;
}

const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({ onStartClassic, onStartKnockout, onShowLeaderboard }) => {
  const [maxWinners, setMaxWinners] = useState(() => {
    const saved = localStorage.getItem('tiktok-quiz-maxwinners');
    return saved ? parseInt(saved, 10) : DEFAULT_MAX_WINNERS_PER_ROUND;
  });
  const [gameStyle, setGameStyle] = useState<GameStyle>(GameStyle.Classic);
  const [knockoutCategory, setKnockoutCategory] = useState<KnockoutCategory>('GuessTheCountry');


  useEffect(() => {
    localStorage.setItem('tiktok-quiz-maxwinners', String(maxWinners));
  }, [maxWinners]);

  const handleMaxWinnersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1) {
      setMaxWinners(value);
    } else if (e.target.value === '') {
      setMaxWinners(1);
    }
  };

  const handleStartGame = () => {
    if (gameStyle === GameStyle.Classic) {
      onStartClassic(maxWinners);
    } else {
      onStartKnockout(knockoutCategory);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStartGame();
  };
  
  const knockoutCategories: { id: KnockoutCategory, name: string }[] = [
    { id: 'GuessTheCountry', name: 'Tebak Negara' },
    { id: 'Trivia', name: 'Trivia Umum' },
    { id: 'ZonaBola', name: 'Zona Bola' },
    { id: 'GuessTheFruit', name: 'Tebak Buah' },
    { id: 'GuessTheAnimal', name: 'Tebak Hewan' },
    { id: 'KpopTrivia', name: 'Zona KPOP' },
  ];

  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl transition-colors duration-300">
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <motion.div
          animate={{ rotate: [0, 5, -5, 5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <GamepadIcon className="w-20 h-20 text-sky-400" />
        </motion.div>
        <h1 className="text-3xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          Pilih Mode Permainan
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Koneksi berhasil! Siap untuk bermain?</p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs mt-6">
          
          <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setGameStyle(GameStyle.Classic)} className={`px-4 py-2.5 font-bold rounded-lg transition-all text-sm ${gameStyle === GameStyle.Classic ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-100 text-sky-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Klasik
              </button>
               <button type="button" onClick={() => setGameStyle(GameStyle.Knockout)} className={`px-4 py-2.5 font-bold rounded-lg transition-all text-sm ${gameStyle === GameStyle.Knockout ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-sky-100 text-sky-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  Knockout
              </button>
          </div>

          <AnimatePresence mode="wait">
          {gameStyle === GameStyle.Classic && (
            <motion.div
              key="max-winners"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem', transition: { duration: 0.3 } }}
              exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden"
            >
              <div className="relative">
                 <label htmlFor="max-winners" className="block text-xs text-left text-gray-500 dark:text-gray-400 mb-1">Jumlah Pemenang per Ronde</label>
                <input
                  type="number"
                  id="max-winners"
                  value={maxWinners}
                  onChange={handleMaxWinnersChange}
                  min="1"
                  className="w-full px-4 py-2 bg-sky-100 border-2 border-sky-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 dark:focus:border-sky-500"
                  aria-label="Jumlah Pemenang Maksimum"
                />
              </div>
            </motion.div>
          )}

          {gameStyle === GameStyle.Knockout && (
             <motion.div
              key="knockout-category"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem', transition: { duration: 0.3 } }}
              exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden"
            >
              <div className="relative">
                 <label className="block text-xs text-left text-gray-500 dark:text-gray-400 mb-1">Pilih Kategori Soal Knockout</label>
                 <div className="grid grid-cols-2 gap-2">
                    {knockoutCategories.map(cat => (
                         <button 
                            key={cat.id}
                            type="button" 
                            onClick={() => setKnockoutCategory(cat.id)} 
                            className={`px-2 py-2 font-semibold rounded-lg transition-all text-xs ${knockoutCategory === cat.id ? 'bg-amber-500 text-white shadow' : 'bg-amber-100 text-amber-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {cat.name}
                        </button>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>


          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full mt-4 px-4 py-2.5 bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Mulai Permainan
          </motion.button>
        </form>
          <button 
            onClick={onShowLeaderboard}
            className="mt-2 text-sm text-sky-500 dark:text-sky-400 font-semibold hover:underline"
          >
            Lihat Peringkat Global
          </button>
      </div>
    </div>
  );
};

export default ModeSelectionScreen;