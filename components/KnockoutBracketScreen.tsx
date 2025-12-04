
import React, { useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnockoutBracket, KnockoutMatch, KnockoutPlayer, KnockoutChampions } from '../types';

interface KnockoutBracketScreenProps {
  bracket: KnockoutBracket | null;
  currentMatchId: string | null;
  isReadyToPlay: boolean;
  onStartMatch: (payload: { roundIndex: number; matchIndex: number }) => void;
  onRedrawBracket: () => void;
  onRestartCompetition: () => void;
  onDeclareWalkoverWinner: (payload: { roundIndex: number; matchIndex: number; winner: KnockoutPlayer }) => void;
  champions: KnockoutChampions;
  onReturnToModeSelection: () => void;
}

const MatchCard: React.FC<{ 
    match: KnockoutMatch, 
    isCurrent: boolean, 
    isReadyToPlay: boolean, 
    onStartMatch: (payload: { roundIndex: number; matchIndex: number }) => void; 
    isTournamentOver: boolean;
    onDeclareWalkoverWinner: (payload: { roundIndex: number; matchIndex: number; winner: KnockoutPlayer }) => void;
    champions: KnockoutChampions;
}> = ({ match, isCurrent, isReadyToPlay, onStartMatch, isTournamentOver, onDeclareWalkoverWinner, champions }) => {
    const [isSelectingWinner, setIsSelectingWinner] = useState(false);
    
    const isMatchReady = match.player1 && match.player2 && !match.winner;

    const handleDeclareWinner = (winner: KnockoutPlayer) => {
        onDeclareWalkoverWinner({
            roundIndex: match.roundIndex,
            matchIndex: match.matchIndex,
            winner,
        });
        setIsSelectingWinner(false); // Reset UI state
    };
    
    const PlayerDisplay: React.FC<{ player: KnockoutPlayer | null, isWinner: boolean, isLoser: boolean }> = ({ player, isWinner, isLoser }) => {
        if (!player) return <span className="truncate italic text-gray-400">...</span>;
        
        return (
            <div className={`flex items-center gap-1.5 w-full min-w-0 transition-opacity duration-300 ${isWinner ? 'font-bold' : ''} ${isLoser ? 'opacity-50' : 'opacity-100'}`}>
                <img src={player.profilePictureUrl} className="w-5 h-5 rounded-full shrink-0" alt={player.nickname} />
                <span className="truncate flex-1">{player.nickname}</span>
                {champions[player.userId] && (
                    <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                        <span className="text-xs">🏆</span>
                        <span className="text-xs font-bold">{champions[player.userId].wins}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: match.roundIndex * 0.2 + match.matchIndex * 0.05 }}
                className={`bg-sky-50 dark:bg-gray-700 rounded-lg p-2 text-sm h-[72px] flex flex-col justify-center relative border-2 w-full transition-all duration-300 ${isCurrent ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-transparent'}`}
            >
                <PlayerDisplay player={match.player1} isWinner={!!match.winner && match.winner.userId === match.player1?.userId} isLoser={!!match.winner && match.winner.userId !== match.player1?.userId} />
                
                {match.winner && match.score ? (
                    <div className="text-center font-bold text-sky-500 dark:text-sky-400 my-1 text-xs">
                        {match.score}
                    </div>
                ) : (
                    <div className="border-t border-dashed border-sky-200 dark:border-gray-600 my-1.5"></div>
                )}

                {match.player2 ? (
                     <PlayerDisplay player={match.player2} isWinner={!!match.winner && match.winner.userId === match.player2?.userId} isLoser={!!match.winner && match.winner.userId !== match.player2?.userId} />
                ) : match.player1 ? (
                    <span className="text-green-500 italic font-semibold text-xs flex items-center justify-center h-5">LOLOS (BYE)</span>
                ) : <span className="truncate italic text-gray-400 h-5">...</span>}
            </motion.div>
            
            {isReadyToPlay && isMatchReady && !isTournamentOver && (
                 <div className="mt-1 flex flex-col items-center w-full gap-1">
                    {isSelectingWinner ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-1">
                            <p className="text-center text-[10px] text-gray-500 dark:text-gray-400">Pilih pemenang WO:</p>
                            <button onClick={() => handleDeclareWinner(match.player1!)} className="w-full text-center truncate px-2 py-1 bg-sky-500 text-white text-[10px] font-bold rounded-md hover:bg-sky-600">
                                {match.player1!.nickname}
                            </button>
                            <button onClick={() => handleDeclareWinner(match.player2!)} className="w-full text-center truncate px-2 py-1 bg-sky-500 text-white text-[10px] font-bold rounded-md hover:bg-sky-600">
                                {match.player2!.nickname}
                            </button>
                            <button onClick={() => setIsSelectingWinner(false)} className="w-full text-center px-2 py-1 bg-gray-400 text-white text-[10px] font-bold rounded-md hover:bg-gray-500">
                                Batal
                            </button>
                        </motion.div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onStartMatch({ roundIndex: match.roundIndex, matchIndex: match.matchIndex })}
                                className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-md shadow-md shadow-green-500/20 hover:bg-green-600 transition-all"
                            >
                                Mulai
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsSelectingWinner(true)}
                                className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-md shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-all"
                            >
                                WO
                            </motion.button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}


const KnockoutBracketScreen: React.FC<KnockoutBracketScreenProps> = ({ bracket, currentMatchId, isReadyToPlay, onStartMatch, onRedrawBracket, onRestartCompetition, onDeclareWalkoverWinner, champions, onReturnToModeSelection }) => {
  const roundRefs = useRef<(HTMLDivElement | null)[]>([]);
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<any[]>([]);

  useLayoutEffect(() => {
    if (!bracket) return;
    
    const newLines: any[] = [];
    bracket.slice(0, -1).forEach((round, roundIndex) => {
        round.forEach(match => {
            if (match.winner) {
                const winnerElem = matchRefs.current[`match-${match.id}`];
                
                const nextRoundIndex = roundIndex + 1;
                const nextMatchIndex = Math.floor(match.matchIndex / 2);
                const nextMatch = bracket[nextRoundIndex]?.[nextMatchIndex];

                if (winnerElem && nextMatch) {
                    const nextMatchElem = matchRefs.current[`match-${nextMatch.id}`];
                    
                    if (nextMatchElem) {
                        const startRect = winnerElem.getBoundingClientRect();
                        const endRect = nextMatchElem.getBoundingClientRect();
                        const containerRect = winnerElem.offsetParent!.getBoundingClientRect();
                        
                        const startX = startRect.right - containerRect.left;
                        const startY = startRect.top + startRect.height / 2 - containerRect.top;
                        
                        const endX = endRect.left - containerRect.left;
                        const isTopPlayer = !nextMatch.player1 || nextMatch.player1.userId === match.winner.userId;
                        const endY = endRect.top + (isTopPlayer ? endRect.height * 0.25 : endRect.height * 0.75) - containerRect.top;

                        const midX = startX + (endX - startX) / 2;

                        newLines.push({
                            id: `line-${match.id}`,
                            path: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
                        });
                    }
                }
            }
        });
    });

    setLines(newLines);
  }, [bracket]);


  if (!bracket || bracket.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-3xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mb-4"></div>
        <p>Membuat bagan turnamen...</p>
      </div>
    );
  }

  const isTournamentOver = bracket && bracket.length > 0 && !!bracket[bracket.length - 1][0].winner;

  const getTitle = () => {
    if (isTournamentOver) return "Turnamen Selesai!";
    if (isReadyToPlay) return "Pilih Match";
    return "Bagan Turnamen";
  }

  return (
    <div className="flex flex-col h-full p-2 bg-white dark:bg-gray-800 rounded-3xl overflow-hidden">
      <div className="text-center shrink-0 mb-2">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          {getTitle()}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
            {isTournamentOver ? 'Selamat kepada pemenang!' : isReadyToPlay ? 'Pilih match yang akan dimulai' : 'Menganimasikan pemenang...'}
        </p>
      </div>
      <div className="flex-grow overflow-auto p-4 relative">
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            <AnimatePresence>
                {lines.map(line => (
                    <motion.path
                        key={line.id}
                        d={line.path}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeInOut", delay: 0.5 }}
                        strokeWidth="2.5"
                        className="stroke-sky-400 dark:stroke-gray-500"
                        fill="none"
                    />
                ))}
            </AnimatePresence>
        </svg>
        <div className="flex h-full space-x-12">
          {bracket.map((round, roundIndex) => (
            <div 
                key={roundIndex} 
                // FIX: Ref callbacks should not return a value. Changed implicit return to a function body.
                ref={el => { roundRefs.current[roundIndex] = el; }} 
                className="flex flex-col justify-around min-w-[160px]"
            >
              {round.map((match) => (
                 // FIX: Ref callbacks should not return a value. Changed implicit return to a function body.
                 <div ref={el => { matchRefs.current[`match-${match.id}`] = el; }} key={match.id}>
                    <MatchCard 
                        match={match} 
                        isCurrent={match.id === currentMatchId} 
                        isReadyToPlay={isReadyToPlay}
                        onStartMatch={onStartMatch}
                        isTournamentOver={isTournamentOver}
                        onDeclareWalkoverWinner={onDeclareWalkoverWinner}
                        champions={champions}
                    />
                 </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <AnimatePresence>
      {isTournamentOver && isReadyToPlay && (
        <motion.div 
            className="shrink-0 p-2 border-t border-sky-100 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
        >
          <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex w-full items-center justify-center gap-2">
                  <button onClick={onRedrawBracket} className="flex-1 px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-md shadow-md shadow-sky-500/20 hover:bg-sky-600 transition-all">
                      Drawing Kembali
                  </button>
                  <button onClick={onRestartCompetition} className="flex-1 px-3 py-2 bg-amber-500 text-white text-xs font-bold rounded-md shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-all">
                      Registrasi Ulang
                  </button>
              </div>
              <button onClick={onReturnToModeSelection} className="w-full px-3 py-2 bg-gray-500 text-white text-xs font-bold rounded-md shadow-md shadow-gray-500/20 hover:bg-gray-600 transition-all">
                  Pilih Mode Lain (Menu Utama)
              </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default KnockoutBracketScreen;
