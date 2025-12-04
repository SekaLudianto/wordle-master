
import { useState, useEffect, useCallback } from 'react';
import { KnockoutChampions } from '../types';

const CHAMPIONS_STORAGE_KEY = 'knockout-champions';

export const useKnockoutChampions = () => {
  const [champions, setChampions] = useState<KnockoutChampions>({});

  useEffect(() => {
    try {
      const savedChampions = localStorage.getItem(CHAMPIONS_STORAGE_KEY);
      if (savedChampions) {
        setChampions(JSON.parse(savedChampions));
      }
    } catch (error) {
      console.error("Failed to load knockout champions from local storage", error);
    }
  }, []);

  const addChampion = useCallback((player: { userId: string, nickname: string }) => {
    setChampions(prevChampions => {
      const currentRecord = prevChampions[player.userId] || { wins: 0, nickname: player.nickname };
      
      const newChampions = {
        ...prevChampions,
        [player.userId]: {
            wins: currentRecord.wins + 1,
            nickname: player.nickname // Update nickname in case it changed
        },
      };
      
      try {
        localStorage.setItem(CHAMPIONS_STORAGE_KEY, JSON.stringify(newChampions));
      } catch (error) {
        console.error("Failed to save knockout champions to local storage", error);
      }
      return newChampions;
    });
  }, []);

  return { champions, addChampion };
};
