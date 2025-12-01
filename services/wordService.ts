import { DictionaryData, Language } from '../types';

const URLS = {
  EN: 'https://raw.githubusercontent.com/SekaLudianto/JSON/refs/heads/main/ENG.json',
  ID: 'https://raw.githubusercontent.com/SekaLudianto/JSON/refs/heads/main/IDN.json',
};

// Cache to store fetched data so we don't hit the network constantly
const dictionaryCache: Record<Language, DictionaryData | null> = {
  EN: null,
  ID: null,
};

export const fetchDictionary = async (language: Language): Promise<DictionaryData> => {
  if (dictionaryCache[language]) {
    return dictionaryCache[language]!;
  }

  try {
    const response = await fetch(URLS[language]);
    if (!response.ok) throw new Error('Failed to fetch dictionary');
    
    // The data format is ["a"],["b"] which is a comma-separated list of arrays.
    // It is NOT a valid single JSON object. We must wrap it in [] to parse it.
    const textData = await response.text();
    const cleanText = textData.trim().replace(/,$/, ''); // Remove potential trailing comma
    const jsonString = `[${cleanText}]`;
    
    const rawData: string[][] = JSON.parse(jsonString);
    
    const dictionary: DictionaryData = {};
    
    rawData.forEach((wordList) => {
      // Clean and normalize words
      const validWords = wordList
        .filter(w => typeof w === 'string')
        .map(w => w.toUpperCase().trim());

      if (validWords.length > 0) {
          // Detect length from the first word in the list
          const detectedLength = validWords[0].length;
          dictionary[detectedLength] = validWords;
      }
    });

    dictionaryCache[language] = dictionary;
    return dictionary;
  } catch (error) {
    console.error('Error fetching words:', error);
    throw error;
  }
};

export const getRandomWord = (dictionary: DictionaryData, length: number): string => {
  const words = dictionary[length];
  if (!words || words.length === 0) return '';
  return words[Math.floor(Math.random() * words.length)];
};

export const isValidWord = (word: string, dictionary: DictionaryData): boolean => {
  const length = word.length;
  const words = dictionary[length];
  if (!words) return false;
  return words.includes(word);
};
