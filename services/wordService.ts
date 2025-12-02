
import { DictionaryData, Language } from '../types';

const URLS = {
  EN_MAIN: 'https://raw.githubusercontent.com/SekaLudianto/JSON/refs/heads/main/ENG.json',
  EN_5_TARGET: 'https://gist.githubusercontent.com/scholtes/94f3c0303ba6a7768b47583aff36654d/raw/73f890e1680f3fa21577fef3d1f06b8d6c6ae318/wordle-La.txt', // User specified: Common/Target words
  EN_5_ALLOWED: 'https://gist.githubusercontent.com/scholtes/94f3c0303ba6a7768b47583aff36654d/raw/73f890e1680f3fa21577fef3d1f06b8d6c6ae318/wordle-Ta.txt', // User specified: Wider/Validation words
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
    const dictionary: DictionaryData = {};

    if (language === 'EN') {
      // For English, we fetch three sources:
      // 1. The Main JSON for 4, 6-15 letter words
      // 2. The Target List (La.txt) for 5 letter common words
      // 3. The Allowed List (Ta.txt) for 5 letter extra validation words
      
      const [mainRes, targetRes, allowedRes] = await Promise.all([
        fetch(URLS.EN_MAIN),
        fetch(URLS.EN_5_TARGET),
        fetch(URLS.EN_5_ALLOWED)
      ]);

      if (!mainRes.ok || !targetRes.ok || !allowedRes.ok) throw new Error('Failed to fetch English dictionaries');

      // Process Main JSON (Legacy format for other lengths)
      const mainText = await mainRes.text();
      const mainJsonString = `[${mainText.trim().replace(/,$/, '')}]`;
      const mainRawData: string[][] = JSON.parse(mainJsonString);

      mainRawData.forEach((wordList) => {
        const validWords = wordList
          .filter(w => typeof w === 'string')
          .map(w => w.toUpperCase().trim());

        if (validWords.length > 0) {
            const len = validWords[0].length;
            // Only populate if it's NOT 5 letters, because we handle 5 letters specifically below
            if (len !== 5) {
               dictionary[len] = validWords;
            }
        }
      });

      // Process Specific 5-Letter Lists
      const targetText = await targetRes.text();
      const allowedText = await allowedRes.text();

      const parseWords = (text: string) => text
        .split(/\r?\n/)
        .map(w => w.trim().toUpperCase())
        .filter(w => w.length === 5 && /^[A-Z]+$/.test(w));

      const targetWords = parseWords(targetText); // The Common words (for Game Target)
      const allowedWords = parseWords(allowedText); // The Wider words (for Validation only)

      // Combine both lists for validation (dictionary[5])
      // This ensures user can guess uncommon words that are valid, even if they aren't the answer
      const combined5LetterWords = Array.from(new Set([...targetWords, ...allowedWords]));
      
      if (combined5LetterWords.length > 0) {
        dictionary[5] = combined5LetterWords;
        
        // HACK: Store ONLY the "Common" target words in a special key (55)
        // This allows getRandomWord to pick only from the common list, preventing obscure answers
        dictionary[55] = targetWords;
      }

    } else {
      // ID (Indonesia) - Logic remains same (Single Source)
      const response = await fetch(URLS.ID);
      if (!response.ok) throw new Error('Failed to fetch dictionary');
      
      const textData = await response.text();
      const cleanText = textData.trim().replace(/,$/, '');
      const jsonString = `[${cleanText}]`;
      
      const rawData: string[][] = JSON.parse(jsonString);
      
      rawData.forEach((wordList) => {
        const validWords = wordList
          .filter(w => typeof w === 'string')
          .map(w => w.toUpperCase().trim());

        if (validWords.length > 0) {
            const len = validWords[0].length;
            dictionary[len] = validWords;
        }
      });
    }

    dictionaryCache[language] = dictionary;
    return dictionary;
  } catch (error) {
    console.error('Error fetching words:', error);
    throw error;
  }
};

export const getRandomWord = (dictionary: DictionaryData, length: number): string => {
  // If requesting 5-letter word and we have the special "Target Only" list (key 55), use it.
  // This ensures we pick a common word as the solution.
  if (length === 5 && dictionary[55]) {
    const targetList = dictionary[55];
    if (targetList && targetList.length > 0) {
       return targetList[Math.floor(Math.random() * targetList.length)];
    }
  }

  // Fallback / Standard logic
  const words = dictionary[length];
  if (!words || words.length === 0) return '';
  return words[Math.floor(Math.random() * words.length)];
};

export const isValidWord = (word: string, dictionary: DictionaryData): boolean => {
  const length = word.length;
  // This checks against dictionary[5] which is the COMBINED list (Common + Wider)
  const words = dictionary[length];
  if (!words) return false;
  
  return words.includes(word);
};
