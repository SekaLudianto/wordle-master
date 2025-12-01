import React from 'react';
import { LetterStatus } from '../types';

interface KeyProps {
  value: string;
  label?: React.ReactNode;
  status?: LetterStatus;
  onClick: (value: string) => void;
  isWide?: boolean;
}

const Key: React.FC<KeyProps> = ({ value, label, status, onClick, isWide }) => {
  let baseStyle = 'bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-zinc-100';
  
  if (status === 'correct') {
    baseStyle = 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-b-4 border-emerald-800 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]';
  } else if (status === 'present') {
    baseStyle = 'bg-gradient-to-br from-amber-500 to-amber-600 border-b-4 border-amber-800 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]';
  } else if (status === 'absent') {
    baseStyle = 'bg-zinc-800/80 border-transparent text-zinc-500';
  } else {
    // Default state
    baseStyle = 'bg-zinc-600/90 hover:bg-zinc-500 border-b-4 border-zinc-800 active:border-b-0 active:translate-y-[4px]';
  }

  return (
    <button
      onClick={() => onClick(value)}
      className={`
        ${isWide ? 'flex-[1.5] text-xs' : 'flex-1'}
        ${baseStyle}
        h-14 sm:h-16
        m-[2px] sm:m-1
        rounded-xl
        font-bold text-sm sm:text-base
        uppercase
        transition-all duration-75
        select-none
        flex items-center justify-center
        touch-manipulation
      `}
    >
      {label || value}
    </button>
  );
};

export default Key;