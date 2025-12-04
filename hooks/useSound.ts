import { useState, useEffect, useCallback, useRef } from 'react';

type SoundType = 'roundStart' | 'correctAnswer' | 'roundEnd' | 'roundEndMuted' | 'champion' | 'gameOver';

// Use a singleton pattern for the AudioContext to avoid creating multiple instances
let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
    if (typeof window !== 'undefined' && !audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

export const useSound = () => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const savedMuteState = localStorage.getItem('soundMuted');
    return savedMuteState ? JSON.parse(savedMuteState) : false;
  });

  useEffect(() => {
    localStorage.setItem('soundMuted', JSON.stringify(isMuted));
  }, [isMuted]);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Ensure context is running (required after user interaction in some browsers)
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    
    switch (type) {
        case 'roundStart':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
            oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
            break;
        case 'correctAnswer':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
            break;
        case 'roundEnd':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
            break;
        case 'roundEndMuted':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(220, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
            break;
        case 'champion':
        case 'gameOver':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.connect(gainNode);
            osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
            osc2.start(ctx.currentTime + 0.1);
            osc2.stop(ctx.currentTime + 0.5);
            break;
    }
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1);

  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { isMuted, toggleMute, playSound };
};
