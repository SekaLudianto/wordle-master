import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatMessage, GameState, KnockoutPlayer, GiftNotification, DonationEvent, DonationPlatform } from '../types';

interface SimulationPanelProps {
  onComment: (comment: ChatMessage) => void;
  onGift: (gift: Omit<GiftNotification, 'id'>) => void;
  onDonation: (donation: DonationEvent) => void;
  currentAnswer: string;
  gameState: GameState;
  onRegisterPlayer: (player: KnockoutPlayer) => void;
  knockoutPlayers?: KnockoutPlayer[];
}

const donationPlatforms: DonationPlatform[] = ['saweria', 'sociabuzz', 'trakteer', 'tako', 'bagibagi', 'sibagi'];

const SimulationPanel: React.FC<SimulationPanelProps> = ({ onComment, onGift, onDonation, currentAnswer, gameState, onRegisterPlayer, knockoutPlayers = [] }) => {
  const [userId, setUserId] = useState('tester.user');
  const [nickname, setNickname] = useState('Tester');
  const [comment, setComment] = useState('');
  const [userCounter, setUserCounter] = useState(1);
  const [fakePlayerCount, setFakePlayerCount] = useState(8);
  
  const [giftName, setGiftName] = useState('Mawar');
  const [giftCount, setGiftCount] = useState(1);
  const [giftId, setGiftId] = useState(5655);

  const [donationPlatform, setDonationPlatform] = useState<DonationPlatform>('saweria');
  const [donationName, setDonationName] = useState('Donatur Baik');
  const [donationAmount, setDonationAmount] = useState(10000);
  const [donationMessage, setDonationMessage] = useState('Semangat ya livenya!');


  const generateRandomUser = () => {
    const newId = userCounter;
    setUserId(`pemain${newId}`);
    setNickname(`Pemain ${newId}`);
    setUserCounter(prev => prev + 1);
  };
  
  const handlePlayerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      if (!selectedId) return;
      
      const player = knockoutPlayers.find(p => p.userId === selectedId);
      if (player) {
          setUserId(player.userId);
          setNickname(player.nickname);
      }
  };
  
  const handleSendComment = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (comment.trim() === '' || userId.trim() === '' || nickname.trim() === '') return;

    onComment({
      id: `${Date.now()}-${userId}`,
      userId: userId,
      nickname: nickname,
      comment,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${userId}`,
      isWinner: false,
    });

    setComment('');
  };

  const handleSendGift = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (userId.trim() === '' || nickname.trim() === '' || giftName.trim() === '' || giftCount < 1) return;

    onGift({
      userId: userId,
      nickname: nickname,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${userId}`,
      giftName,
      giftCount,
      giftId,
    });
  };
  
  const handleSendDonation = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (donationName.trim() === '' || donationAmount <= 0) return;

    onDonation({
      id: `${Date.now()}-${donationName}`,
      platform: donationPlatform,
      from_name: donationName,
      amount: donationAmount,
      message: donationMessage
    });
  };

  const handleSendCorrectAnswer = () => {
    if (currentAnswer.startsWith('(')) return; // Don't send for ABC 5 Dasar helper text

    onComment({
      id: `${Date.now()}-${userId}`,
      userId: userId,
      nickname: nickname,
      comment: currentAnswer,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${userId}`,
      isWinner: false,
    });
  };

  const handleSendCorrectAnswerRandom = () => {
    if (currentAnswer.startsWith('(')) return;
    
    const randomId = Math.floor(Math.random() * 10000);
    const rUserId = `random.user.${randomId}`;
    const rNickname = `Penebak Jitu ${randomId}`;

    onComment({
      id: `${Date.now()}-${rUserId}`,
      userId: rUserId,
      nickname: rNickname,
      comment: currentAnswer,
      profilePictureUrl: `https://i.pravatar.cc/40?u=${rUserId}`,
      isWinner: false,
    });
  };

  const handleAddFakePlayers = () => {
    if (fakePlayerCount <= 0) return;
    for (let i = 1; i <= fakePlayerCount; i++) {
      const fakePlayerUserId = `pemainpalsu_${i}`;
      const fakePlayerNickname = `PemainPalsu${i}`;
      onRegisterPlayer({
        userId: fakePlayerUserId,
        nickname: fakePlayerNickname,
        profilePictureUrl: `https://i.pravatar.cc/40?u=${fakePlayerUserId}`
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="hidden md:flex flex-col flex-1 h-[95vh] min-h-[600px] max-h-[800px] bg-white dark:bg-gray-800 rounded-3xl shadow-lg shadow-sky-500/5 border border-sky-200 dark:border-gray-700 overflow-hidden"
    >
      <header className="p-3 text-center border-b border-sky-100 dark:border-gray-700 shrink-0">
        <h2 className="text-md font-bold text-slate-700 dark:text-gray-300">Panel Simulasi</h2>
      </header>
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        
        {gameState === GameState.KnockoutRegistration && (
            <div className="border-b border-dashed border-sky-200 dark:border-gray-600 pb-4">
                <label htmlFor="sim-fake-players" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pendaftaran Knockout Palsu
                </label>
                <div className="flex gap-2">
                    <input
                    type="number"
                    id="sim-fake-players"
                    value={fakePlayerCount}
                    onChange={(e) => setFakePlayerCount(parseInt(e.target.value, 10) || 1)}
                    min="1"
                    className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <button
                        onClick={handleAddFakePlayers}
                        className="px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-md hover:bg-sky-600 transition-all"
                    >
                        Tambah
                    </button>
                </div>
            </div>
        )}

        <div>
            {knockoutPlayers && knockoutPlayers.length > 0 && (
                <div className="mb-3">
                    <label htmlFor="player-select" className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                        Pilih Pemain Terdaftar (Otomatis Isi)
                    </label>
                    <select
                        id="player-select"
                        onChange={handlePlayerSelect}
                        className="w-full px-3 py-2 text-sm bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 dark:bg-gray-700 dark:border-gray-600"
                        defaultValue=""
                    >
                        <option value="" disabled>-- Pilih Pemain --</option>
                        {knockoutPlayers.map(p => (
                            <option key={p.userId} value={p.userId}>
                                {p.nickname} (@{p.userId})
                            </option>
                        ))}
                    </select>
                </div>
            )}
        
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                     <label htmlFor="sim-userid" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Username (ID Unik)
                    </label>
                    <input
                        type="text"
                        id="sim-userid"
                        value={userId}
                        placeholder="cth: ahmadsyams.jpg"
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                 <div>
                    <label htmlFor="sim-nickname" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Nama Tampilan
                    </label>
                    <input
                        type="text"
                        id="sim-nickname"
                        value={nickname}
                        placeholder="cth: Ahmad Syams"
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            </div>
             <button
                onClick={generateRandomUser}
                className="w-full px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-md hover:bg-sky-600 transition-all"
                title="Generate User Baru"
            >
                Acak Identitas di Input
            </button>
        </div>

        <form onSubmit={handleSendComment}>
          <label htmlFor="sim-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Komentar Manual
          </label>
          <textarea
            id="sim-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            type="submit"
            className="w-full mt-2 px-4 py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-all"
          >
            Kirim Komentar
          </button>
        </form>

        <div className="border-t border-dashed border-sky-200 dark:border-gray-600 my-2"></div>

        <form onSubmit={handleSendGift}>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Simulasi Hadiah TikTok</h3>
            <div className="space-y-2">
                <input
                    type="text"
                    value={giftName}
                    onChange={(e) => setGiftName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Nama Hadiah"
                />
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="number"
                        value={giftCount}
                        onChange={(e) => setGiftCount(parseInt(e.target.value, 10) || 1)}
                        min="1"
                        className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Jumlah"
                    />
                    <input
                        type="number"
                        value={giftId}
                        onChange={(e) => setGiftId(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="ID Hadiah"
                    />
                </div>
            </div>
             <button type="submit" className="w-full mt-2 px-4 py-2 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-all">
                Kirim Hadiah
            </button>
        </form>
        
        <div className="border-t border-dashed border-sky-200 dark:border-gray-600 my-2"></div>
        
        <form onSubmit={handleSendDonation}>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Simulasi Donasi</h3>
            <div className="space-y-2">
                <select 
                    value={donationPlatform} 
                    onChange={e => setDonationPlatform(e.target.value as DonationPlatform)}
                    className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                >
                    {donationPlatforms.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <input
                    type="text"
                    value={donationName}
                    onChange={(e) => setDonationName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Nama Donatur"
                />
                <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Jumlah (Rp)"
                />
                <input
                    type="text"
                    value={donationMessage}
                    onChange={(e) => setDonationMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-sky-50 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Pesan Donasi"
                />
            </div>
             <button type="submit" className="w-full mt-2 px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all">
                Kirim Donasi
            </button>
        </form>

        <div className="border-t border-dashed border-sky-200 dark:border-gray-600 my-2"></div>

        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Jawaban Benar Saat Ini
          </label>
           <div className="p-2 bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-500/50 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-mono text-sm break-words">
                    {currentAnswer || '...'}
                </p>
           </div>
           
           <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                    onClick={handleSendCorrectAnswer}
                    disabled={!currentAnswer || currentAnswer.startsWith('(')}
                    className="w-full px-2 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-xs"
                >
                    Jawab Benar (User Diatas)
                </button>
                <button
                    onClick={handleSendCorrectAnswerRandom}
                    disabled={!currentAnswer || currentAnswer.startsWith('(')}
                    className="w-full px-2 py-2 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 transition-all disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-xs"
                >
                    Jawab Benar (User Acak)
                </button>
           </div>
        </div>

      </div>
    </motion.div>
  );
};

export default SimulationPanel;