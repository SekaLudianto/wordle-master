import React from 'react';
import { GuessData, LetterStatus, TikTokUserData } from '../types';
import { User } from 'lucide-react';

interface GridProps {
  guesses: GuessData[];
  currentGuess: string;
  targetWord: string;
  wordLength: number;
  maxGuesses: number;
  isShake: boolean;
}

interface CellProps {
  char: string;
  status: LetterStatus;
  animate?: boolean;
  wordLength: number;
}

const Cell: React.FC<CellProps> = ({ char, status, animate, wordLength }) => {
  let textSize = "text-3xl";
  if (wordLength > 12) textSize = "text-xs sm:text-sm font-black";
  else if (wordLength > 10) textSize = "text-sm sm:text-base font-black";
  else if (wordLength > 8) textSize = "text-lg sm:text-xl font-black";
  else if (wordLength > 6) textSize = "text-2xl sm:text-2xl font-black";
  else textSize = "text-3xl sm:text-4xl font-black";

  let baseClass = `flex items-center justify-center border-2 rounded-lg sm:rounded-xl uppercase select-none transition-all duration-500 ${textSize} relative overflow-hidden`;
  let colorClass = "border-zinc-800 bg-zinc-900/40"; 
  
  if (status === 'correct') {
    colorClass = "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]";
  } else if (status === 'present') {
    colorClass = "border-amber-500 bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]";
  } else if (status === 'absent') {
    colorClass = "border-zinc-700 bg-zinc-800 text-zinc-500";
  } else if (char) {
    colorClass = "border-indigo-400/50 text-indigo-100 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-pop backdrop-blur-sm";
  }

  if (animate && char) {
    baseClass += " animate-flip";
  }

  return (
    <div className={`${baseClass} ${colorClass}`}>
      {status !== 'empty' && status !== 'absent' && (
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      )}
      <span className="z-10 relative drop-shadow-sm">{char}</span>
    </div>
  );
};

// Helper function for row statuses
const getRowStatuses = (guess: string, target: string): LetterStatus[] => {
  const length = guess.length;
  const statuses: LetterStatus[] = Array(length).fill('absent');
  const targetChars: (string | null)[] = target.split('');
  const guessChars: (string | null)[] = guess.split('');

  for (let i = 0; i < length; i++) {
    if (guessChars[i] === targetChars[i]) {
      statuses[i] = 'correct';
      targetChars[i] = null;
      guessChars[i] = null;
    }
  }

  for (let i = 0; i < length; i++) {
    if (guessChars[i] !== null) {
      const index = targetChars.indexOf(guessChars[i]);
      if (index !== -1) {
        statuses[i] = 'present';
        targetChars[index] = null;
      }
    }
  }

  return statuses;
};

const UserBadge: React.FC<{ user?: TikTokUserData }> = ({ user }) => {
  if (!user) {
    // Placeholder for empty row to keep grid alignment
    return (
       <div className="flex flex-col items-center justify-center w-20 sm:w-24 opacity-0 transition-opacity">
         <div className="w-10 h-10 rounded-full bg-zinc-800" />
       </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-20 sm:w-24 animate-fade-in z-10 px-1">
      <div className="relative mb-1">
        {user.profilePictureUrl ? (
          <img 
            src={user.profilePictureUrl} 
            alt={user.uniqueId} 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-zinc-700 shadow-lg object-cover ring-2 ring-transparent transition-all"
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-700 flex items-center justify-center border-2 border-zinc-600">
            <User size={20} className="text-zinc-400" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center w-full">
          <span className="text-[10px] sm:text-xs text-zinc-200 font-bold truncate max-w-full leading-tight text-center">
            {user.nickname}
          </span>
          <span className="text-[9px] sm:text-[10px] text-zinc-500 truncate max-w-full leading-tight text-center font-medium">
            @{user.uniqueId}
          </span>
      </div>
    </div>
  );
};

const Grid: React.FC<GridProps> = ({ guesses, currentGuess, targetWord, wordLength, maxGuesses, isShake }) => {
  const empties = Math.max(0, maxGuesses - 1 - guesses.length);
  
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))`,
    gap: wordLength > 10 ? '0.2rem' : '0.35rem',
  };

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto p-2 min-h-0 flex flex-col justify-center perspective-1000">
      <div className="flex flex-col gap-3 w-full h-full justify-center max-h-[80vh]">
        
        {/* Render Guesses with User Info */}
        {guesses.map((guessData, i) => {
          const statuses = getRowStatuses(guessData.word, targetWord);
          return (
            <div key={i} className="flex items-center gap-1 sm:gap-2 w-full">
              {/* Left Side User Info */}
              <UserBadge user={guessData.user} />

              {/* Grid Cells */}
              <div style={gridStyle} className="flex-1 max-h-16 aspect-auto min-h-0 shadow-xl bg-black/20 p-2 rounded-2xl backdrop-blur-sm border border-white/5">
                {guessData.word.split('').map((char, j) => (
                  <Cell 
                    key={j} 
                    char={char} 
                    status={statuses[j]} 
                    animate={true} 
                    wordLength={wordLength} 
                  />
                ))}
              </div>
              
               {/* Right Side Spacer for Balance */}
               <div className="w-20 sm:w-24 opacity-0"></div>
            </div>
          );
        })}

        {/* Render Current Guess */}
        {guesses.length < maxGuesses && (
          <div className={`flex items-center gap-1 sm:gap-2 w-full ${isShake ? 'animate-shake' : ''}`}>
             <div className="w-20 sm:w-24 opacity-0"></div>
             <div style={gridStyle} className="flex-1 max-h-16 min-h-0 p-2">
              {Array.from({ length: wordLength }).map((_, i) => (
                <Cell key={i} char={currentGuess[i] || ''} status="empty" wordLength={wordLength} />
              ))}
            </div>
             <div className="w-20 sm:w-24 opacity-0"></div>
          </div>
        )}

        {/* Render Empty Rows */}
        {Array.from({ length: empties }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-1 sm:gap-2 w-full opacity-30">
             <div className="w-20 sm:w-24 opacity-0"></div>
             <div style={gridStyle} className="flex-1 max-h-16 min-h-0 p-2">
               {Array.from({ length: wordLength }).map((__, j) => (
                <div key={j} className="border-2 border-zinc-800/60 rounded-lg sm:rounded-xl bg-zinc-900/20"></div>
              ))}
            </div>
             <div className="w-20 sm:w-24 opacity-0"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Grid;