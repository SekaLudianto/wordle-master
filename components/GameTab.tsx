import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOTAL_ROUNDS, ROUND_TIMER_SECONDS, KNOCKOUT_ROUND_TIMER_SECONDS, KNOCKOUT_TARGET_SCORE } from '../constants';
// FIX: Import LetterObject from types.ts instead of defining it locally.
import { GameMode, GameStyle, LetterObject } from '../types';
import { InternalGameState } from '../hooks/useGameLogic';

// FIX: Removed local definition of LetterObject as it's now imported from types.ts.

interface GameTabProps {
  gameState: InternalGameState;
}

const getLetterBoxSizeClasses = (totalLetters: number): string => {
  if (totalLetters > 22) return 'w-5 h-7 text-sm gap-0.5';
  if (totalLetters > 16) return 'w-6 h-8 text-lg gap-1';
  if (totalLetters > 12) return 'w-7 h-9 text-xl gap-1';
  return 'w-9 h-11 text-2xl gap-1.5';
};

const ScrambledWordDisplay: React.FC<{ scrambledWord: LetterObject[][], isRoundActive: boolean }> = ({ scrambledWord, isRoundActive }) => {
    const totalLetters = scrambledWord.flat().length;
    const sizeClasses = getLetterBoxSizeClasses(totalLetters);

    return (
        <div className="flex flex-col items-center gap-1 px-2">
            {scrambledWord.map((word, wordIndex) => (
                <div key={wordIndex} className={`flex flex-wrap justify-center ${sizeClasses.split(' ')[2]}`}>
                    {word.map((item: LetterObject) => (
                        <motion.div
                            key={item.id}
                            layout
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className={`bg-sky-100 dark:bg-gray-700 border-2 rounded-md flex items-center justify-center font-bold transition-colors duration-500 ${sizeClasses.split(' ').slice(0, 2).join(' ')} ${
                                isRoundActive
                                    ? 'border-sky-200 dark:border-gray-600 text-amber-500 dark:text-amber-400'
                                    : 'border-green-500 text-green-600 dark:text-green-300'
                                }`}
                        >
                            {item.letter}
                        </motion.div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const GuessTheFlagContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCountry, scrambledWord, isRoundActive } = gameState;
    if (!currentCountry) return null;

    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-2">
                Tebak nama dari bendera ini:
            </h2>
            <div className="my-2">
                <img 
                    src={`https://flagcdn.com/w160/${currentCountry.code}.png`} 
                    alt="Bendera" 
                    className="h-24 mx-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-600" 
                />
            </div>
            <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} />
        </>
    );
};

const GuessTheCountryKnockoutContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCountry, scrambledWord, isRoundActive } = gameState;
    if (!currentCountry) return null;

    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
                Tebak Nama Negara:
            </h2>
            <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} />
            
            <AnimatePresence>
            {!isRoundActive && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                 >
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {currentCountry.name}
                    </p>
                 </motion.div>
            )}
            </AnimatePresence>
        </>
    );
}

const ABC5DasarContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentLetter, currentCategory } = gameState;
    return (
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 mb-4">
            Kategori: <span className="text-amber-500">{currentCategory}</span>
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300">Sebutkan nama-nama yang berawalan dengan huruf:</p>
        <div className="my-4 text-8xl font-bold text-amber-500 dark:text-amber-400 animate-pulse">
            {currentLetter}
        </div>
      </div>
    );
};


const GuessTheWordContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentWordCategory, scrambledWord, isRoundActive } = gameState;
  
    return (
      <>
        <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
            Kategori: {currentWordCategory}
        </h2>
        <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} />
        <AnimatePresence>
            {!isRoundActive && currentWord && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                 >
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {currentWord}
                    </p>
                 </motion.div>
            )}
            </AnimatePresence>
      </>
    );
};

const TriviaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentTriviaQuestion, isRoundActive, scrambledWord } = gameState;
    if (!currentTriviaQuestion) return null;
  
    return (
      <div className="text-center px-2 flex flex-col items-center justify-center gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-300 leading-tight">
            {currentTriviaQuestion.question}
        </h2>
        
        <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} />

        <AnimatePresence>
        {!isRoundActive && (
             <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3"
             >
                <p className="text-sm text-gray-500 dark:text-gray-400">Jawabannya adalah:</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-300">
                    {currentTriviaQuestion.answer}
                </p>
             </motion.div>
        )}
        </AnimatePresence>
      </div>
    );
};

const GuessTheCityContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentCity, scrambledWord, isRoundActive } = gameState;
    if (!currentCity) return null;

    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
                Tebak Nama Kota:
            </h2>
            <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} />
            
            <AnimatePresence>
            {!isRoundActive && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                 >
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {currentCity.name}
                    </p>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        ({currentCity.region})
                    </p>
                 </motion.div>
            )}
            </AnimatePresence>
        </>
    );
};

const ZonaBolaContent: React.FC<{ gameState: InternalGameState }> = ({ gameState }) => {
    const { currentWord, currentWordCategory, currentStadium, scrambledWord, isRoundActive } = gameState;
    const answer = currentWord || currentStadium?.name;
    const location = currentStadium?.location;

    return (
        <>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-300 text-center mb-3">
                Tebak: <span className="text-amber-500">{currentWordCategory}</span>
            </h2>
            <ScrambledWordDisplay scrambledWord={scrambledWord} isRoundActive={isRoundActive} />
            
            <AnimatePresence>
            {!isRoundActive && answer && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                 >
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">
                        {answer}
                    </p>
                    {location && (
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            ({location})
                        </p>
                    )}
                 </motion.div>
            )}
            </AnimatePresence>
        </>
    );
};

const GameTab: React.FC<GameTabProps> = ({ gameState }) => {
  const { round, roundWinners, roundTimer, gameMode, currentCategory, availableAnswersCount, maxWinners, gameStyle, knockoutBracket, currentBracketRoundIndex, currentMatchIndex, knockoutMatchPoints, knockoutCategory } = gameState;
  const progressPercentage = (round / TOTAL_ROUNDS) * 100;
  const firstWinner = roundWinners.length > 0 ? roundWinners[0] : null;

  const timerDuration = gameStyle === GameStyle.Knockout ? KNOCKOUT_ROUND_TIMER_SECONDS : ROUND_TIMER_SECONDS;
  const timerProgress = (roundTimer / timerDuration) * 100;

  const maxWinnersForThisRound = gameMode === GameMode.ABC5Dasar && availableAnswersCount != null
    ? Math.min(maxWinners, availableAnswersCount)
    : maxWinners;
    
  const getRoundTitle = () => {
    if (gameStyle === GameStyle.Knockout) {
        if (knockoutCategory === 'Trivia') return "Trivia Pengetahuan Umum";
        if (knockoutCategory === 'GuessTheCountry') return "Tebak Negara";
        if (knockoutCategory === 'ZonaBola') return "Zona Bola";
        if (knockoutCategory === 'GuessTheFruit') return "Tebak Kata: Buah";
        if (knockoutCategory === 'GuessTheAnimal') return "Tebak Kata: Hewan";
        if (knockoutCategory === 'KpopTrivia') return "Trivia: Zona KPOP";

        if (currentBracketRoundIndex === null || !knockoutBracket || !knockoutBracket[currentBracketRoundIndex]) {
            return "Mode Knockout";
        }
        
        const currentRoundMatchCount = knockoutBracket[currentBracketRoundIndex].length;

        if (currentRoundMatchCount === 1) return "Babak Final";
        if (currentRoundMatchCount === 2) return "Babak Semi-Final";
        if (currentRoundMatchCount === 4) return "Babak Perempat Final";
        if (currentRoundMatchCount === 8) return "Babak 16 Besar";
        
        return `Babak Penyisihan`; // Fallback
    }
    // Classic Mode Titles
    if (gameMode === GameMode.GuessTheFlag) return 'Tebak Bendera';
    if (gameMode === GameMode.GuessTheCity) return 'Tebak Kota';
    if (gameMode === GameMode.ABC5Dasar) return `ABC 5 Dasar`;
    if (gameMode === GameMode.GuessTheWord) return `Tebak Kata Acak`;
    if (gameMode === GameMode.Trivia) return 'Trivia Umum';
    return '';
  }

  const currentMatch = gameStyle === GameStyle.Knockout && knockoutBracket && currentBracketRoundIndex !== null && currentMatchIndex !== null
    ? knockoutBracket[currentBracketRoundIndex][currentMatchIndex]
    : null;

  return (
    <motion.div 
      key={`${round}-${gameMode}-${currentCategory}-${currentMatch?.id}-${gameState.currentWord}-${gameState.currentCountry?.name}-${gameState.currentTriviaQuestion?.question}-${gameState.currentCity?.name}-${gameState.currentStadium?.name}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="p-3 flex flex-col h-full relative"
    >
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 shrink-0">
        <span>{gameStyle === GameStyle.Classic ? `Ronde ${round} / ${TOTAL_ROUNDS}` : `🎯 Rally Point (Target ${KNOCKOUT_TARGET_SCORE})`}</span>
        <span className='font-semibold'>{getRoundTitle()}</span>
      </div>

      <div className="w-full bg-sky-100 dark:bg-gray-700 rounded-full h-2 my-2 shrink-0">
        {gameStyle === GameStyle.Classic ? (
          <motion.div
            className="bg-gradient-to-r from-sky-500 to-teal-400 h-2 rounded-full"
            initial={{ width: `${((round - 1) / TOTAL_ROUNDS) * 100}%` }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        ) : (
            <div className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full w-full" />
        )}
      </div>

      <div className="flex-grow flex flex-col items-center justify-center">
        {currentMatch && currentMatch.player1 && currentMatch.player2 && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex justify-between items-center mb-4 px-2 gap-2"
             >
                <div className="flex flex-col items-center text-center flex-1 min-w-0">
                    <img src={currentMatch.player1.profilePictureUrl} alt={currentMatch.player1.nickname} className="w-16 h-16 rounded-full border-4 border-sky-400"/>
                    <p className="font-bold text-sm mt-1 truncate w-full">{currentMatch.player1.nickname}</p>
                </div>
                <div className="text-center flex-shrink-0 px-2">
                    <p className="text-3xl font-bold text-red-500">
                        {knockoutMatchPoints.player1} - {knockoutMatchPoints.player2}
                    </p>
                    <p className="text-xs text-gray-500">Skor</p>
                </div>
                <div className="flex flex-col items-center text-center flex-1 min-w-0">
                    <img src={currentMatch.player2.profilePictureUrl} alt={currentMatch.player2.nickname} className="w-16 h-16 rounded-full border-4 border-gray-400"/>
                    <p className="font-bold text-sm mt-1 truncate w-full">{currentMatch.player2.nickname}</p>
                </div>
             </motion.div>
        )}
        
        {/* Main game content */}
        {gameState.gameMode === GameMode.GuessTheWord && <GuessTheWordContent gameState={gameState} />}
        {gameState.gameMode === GameMode.GuessTheFlag && (
          gameState.gameStyle === GameStyle.Classic 
            ? <GuessTheFlagContent gameState={gameState} /> 
            : <GuessTheCountryKnockoutContent gameState={gameState} />
        )}
        {gameState.gameMode === GameMode.ABC5Dasar && <ABC5DasarContent gameState={gameState} />}
        {gameState.gameMode === GameMode.Trivia && <TriviaContent gameState={gameState} />}
        {gameState.gameMode === GameMode.GuessTheCity && <GuessTheCityContent gameState={gameState} />}
        {gameState.gameMode === GameMode.ZonaBola && <ZonaBolaContent gameState={gameState} />}


        {gameStyle === GameStyle.Knockout && gameState.isRoundActive && (
             <div className="mt-3 p-2 w-full max-w-xs bg-yellow-100 border border-yellow-300 dark:bg-yellow-500/10 dark:border-yellow-500/30 rounded-lg text-center">
                <p className="text-xs font-bold text-yellow-800 dark:text-yellow-300">PERINGATAN!</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Hanya pemain yang bertanding yang boleh menjawab. Penonton lain yang menjawab berisiko di-mute!
                </p>
            </div>
        )}

        <div className="mt-3 w-full text-center min-h-[50px] shrink-0">
          <AnimatePresence mode="wait">
            {firstWinner && gameStyle === GameStyle.Classic ? (
              <motion.div
                key="winner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-500/10 px-2 py-1 rounded-lg">
                  <img src={firstWinner.profilePictureUrl} alt={firstWinner.nickname} className="w-5 h-5 rounded-full"/>
                  <p className="text-amber-600 dark:text-amber-300 font-semibold text-xs">{firstWinner.nickname} menemukan jawaban!</p>
                </div>
                <p className="text-amber-500 dark:text-amber-400 text-xs mt-1 font-semibold">Pemenang: {roundWinners.length} / {maxWinnersForThisRound}</p>
              </motion.div>
            ) : (
              <motion.div
                key="no-winner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                 <p className="text-gray-500 dark:text-gray-400 text-xs">Siapa yang akan menjawab tercepat?</p>
                 {gameStyle === GameStyle.Classic && (
                    <p className="text-amber-500 dark:text-amber-400 text-xs mt-1 font-semibold">Hanya {maxWinnersForThisRound} penebak tercepat yang mendapat poin!</p>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="w-full max-w-[150px] bg-sky-100 dark:bg-gray-700 rounded-full h-1.5 mx-auto mt-2">
            <motion.div
              className="bg-gradient-to-r from-sky-500 to-teal-400 h-1.5 rounded-full"
              animate={{ width: `${timerProgress}%` }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GameTab;
