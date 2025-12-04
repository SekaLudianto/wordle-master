import React, { useRef, useLayoutEffect } from 'react';
import { ChatMessage } from '../types';
import { motion } from 'framer-motion';

interface ChatTabProps {
  messages: ChatMessage[];
}

const ChatTab: React.FC<ChatTabProps> = ({ messages }) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  }, [messages]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-3 flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center mb-2 shrink-0">
        <h2 className="text-md font-semibold">Live Chat</h2>
        <div className="ml-2 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-red-500 text-xs font-bold">LIVE</span>
        </div>
      </div>
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-1">
        <div className="space-y-1.5">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              layout
              className={`p-1.5 rounded-lg flex items-start gap-2 ${
                msg.isWinner ? 'bg-amber-100 border border-amber-300 dark:bg-amber-500/20 dark:border-amber-500/50' : 'bg-sky-50 dark:bg-gray-700'
              }`}
            >
              <img
                src={msg.profilePictureUrl || 'https://i.pravatar.cc/40'}
                alt={msg.nickname}
                className="w-7 h-7 rounded-full mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-xs ${msg.isWinner ? 'text-amber-600 dark:text-amber-300' : 'text-sky-600 dark:text-sky-300'}`}>
                  {msg.nickname}
                </p>
                <p className="text-slate-800 dark:text-white break-words text-sm">{msg.comment}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatTab;