import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeIcon } from './IconComponents';
import { ServerConfig, ServerType } from '../types';

interface SetupScreenProps {
  onConnect: (config: ServerConfig, isSimulation: boolean) => void;
  error: string | null;
}

const serverOptions = [
  { id: ServerType.RAILWAY_1, name: 'Server 1 (Buat Lev)', url: 'https://buat-lev.up.railway.app' },
  { id: ServerType.RAILWAY_2, name: 'Server 2 (Ini Live)', url: 'https://ini-live.up.railway.app' },
  { id: ServerType.CUSTOM, name: 'Server Kustom' },
  { id: ServerType.INDOFINITY_WEBSOCKET, name: 'IndoFinity (WebSocket)' },
  { id: ServerType.INDOFINITY_SOCKETIO, name: 'IndoFinity (Socket.IO)' },
];

const SetupScreen: React.FC<SetupScreenProps> = ({ onConnect, error }) => {
  const [username, setUsername] = useState(() => localStorage.getItem('tiktok-quiz-username') || '');
  const [isSimulation, setIsSimulation] = useState(false);
  const [serverType, setServerType] = useState<ServerType>(ServerType.RAILWAY_1);
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    localStorage.setItem('tiktok-quiz-username', username);
  }, [username]);

  const handleStart = () => {
    const isIndoFinity = serverType === ServerType.INDOFINITY_SOCKETIO || serverType === ServerType.INDOFINITY_WEBSOCKET;
    
    // For IndoFinity, username is optional and can be an empty string
    const requiresUsername = !isSimulation && !isIndoFinity;
    if (requiresUsername && !username.trim()) return;
    if (serverType === ServerType.CUSTOM && !customUrl.trim()) return;

    let finalUrl: string | undefined;
    if (serverType === ServerType.CUSTOM) {
        finalUrl = customUrl;
    } else {
        const selectedOption = serverOptions.find(opt => opt.id === serverType);
        finalUrl = selectedOption?.url;
    }
    
    const config: ServerConfig = {
      type: serverType,
      url: finalUrl,
      username: username.trim().replace(/^@/, ''),
    };
    onConnect(config, isSimulation);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStart();
  };
  
  const isIndoFinity = serverType === ServerType.INDOFINITY_SOCKETIO || serverType === ServerType.INDOFINITY_WEBSOCKET;
  const usernameLabel = isIndoFinity ? "Username TikTok (Opsional)" : "Username TikTok";
  const startButtonDisabled = !isSimulation && !isIndoFinity && !username.trim();

  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 rounded-3xl transition-colors duration-300">
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <motion.div
          animate={{ rotate: [0, 5, -5, 5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <GlobeIcon className="w-20 h-20 text-sky-400" />
        </motion.div>
        <h1 className="text-3xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-500">
          Kuis Kata & Bendera Live
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Edisi TikTok Live</p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs mt-6">
          <div className="mb-3">
            <label htmlFor="server-type" className="block text-sm text-left text-gray-500 dark:text-gray-400 mb-1 font-medium">Pilih Server Koneksi</label>
            <select
              id="server-type"
              value={serverType}
              onChange={(e) => setServerType(e.target.value as ServerType)}
              className="w-full px-4 py-2 bg-sky-100 border-2 border-sky-200 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-sky-500"
              disabled={isSimulation}
            >
              {serverOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>

          <AnimatePresence>
          {serverType === ServerType.CUSTOM && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <label htmlFor="custom-url" className="block text-sm text-left text-gray-500 dark:text-gray-400 mb-1 font-medium">URL Server Kustom</label>
              <input
                type="text"
                id="custom-url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://... atau ws://..."
                className="w-full px-4 py-2 bg-sky-100 border-2 border-sky-200 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSimulation}
              />
            </motion.div>
          )}
          </AnimatePresence>
          
          <div className="relative mb-3">
             <label htmlFor="username" className="block text-sm text-left text-gray-500 dark:text-gray-400 mb-1 font-medium">{usernameLabel}</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-2 bg-sky-100 border-2 border-sky-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 dark:focus:border-sky-500"
              aria-label="TikTok Username"
              aria-describedby="error-message"
              disabled={isSimulation}
            />
          </div>

          <div className="flex items-center justify-center my-3">
            <label htmlFor="simulation-mode" className="flex items-center cursor-pointer">
                <div className="relative">
                <input type="checkbox" id="simulation-mode" className="sr-only" checked={isSimulation} onChange={() => setIsSimulation(!isSimulation)} />
                <div className="block bg-gray-200 dark:bg-gray-700 w-10 h-6 rounded-full"></div>
                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
                </div>
                <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium text-sm">
                Mode Simulasi (Testing)
                </div>
            </label>
            <style>{`.dot { transform: translateX(0); } input:checked ~ .dot { transform: translateX(100%); }`}</style>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleStart}
            disabled={startButtonDisabled}
            className="w-full mt-2 px-4 py-2.5 bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSimulation ? 'Mulai Simulasi' : 'Hubungkan'}
          </motion.button>
        </form>
        
        {error && (
            <motion.div
              id="error-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-2 w-full max-w-xs bg-red-100 text-red-700 border border-red-300 rounded-lg text-xs dark:bg-red-900/50 dark:text-red-300 dark:border-red-500/50"
              role="alert"
            >
              {error}
            </motion.div>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;