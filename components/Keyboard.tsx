import React, { useEffect } from 'react';
import { Delete, Check } from 'lucide-react';
import Key from './Key';
import { LetterStatus } from '../types';

interface KeyboardProps {
  onChar: (char: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  letterStatuses: Record<string, LetterStatus>;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const Keyboard: React.FC<KeyboardProps> = ({ onChar, onDelete, onEnter, letterStatuses }) => {
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        onEnter();
      } else if (key === 'BACKSPACE') {
        onDelete();
      } else if (/^[A-Z]$/.test(key)) {
        onChar(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChar, onDelete, onEnter]);

  return (
    <div className="w-full max-w-2xl mx-auto p-1 pb-4 sm:pb-6 select-none">
      {ROWS.map((row, i) => (
        <div key={i} className="flex w-full justify-center touch-manipulation">
          {i === 2 && (
            <Key 
              value="ENTER" 
              label={<Check size={20} />} 
              onClick={onEnter} 
              isWide 
            />
          )}
          
          {row.map((char) => (
            <Key
              key={char}
              value={char}
              status={letterStatuses[char]}
              onClick={onChar}
            />
          ))}

          {i === 2 && (
            <Key 
              value="DELETE" 
              label={<Delete size={20} />} 
              onClick={onDelete} 
              isWide 
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;
