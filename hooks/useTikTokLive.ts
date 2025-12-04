import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, ChatMessage, GiftNotification, TikTokGiftEvent, ServerConfig, ServerType, DonationPlatform } from '../types';

// Define the shape of the chat data coming from the backend
interface TikTokChatEvent {
  uniqueId: string;
  nickname: string;
  comment: string;
  profilePictureUrl: string;
  msgId: string;
}

const parseTikTokError = (reason: string): string => {
    if (typeof reason !== 'string') return 'Terjadi error yang tidak diketahui.';
    if (reason.includes('user_not_found') || reason.includes('19881007')) return 'Username tidak ditemukan atau tidak sedang live.';
    if (reason.includes('websocket upgrade')) return 'Koneksi ke TikTok gagal (websocket ditolak).';
    if (reason.includes('timeout')) return 'Koneksi ke TikTok timeout.';
    if (reason.includes('Connection lost')) return 'Koneksi ke TikTok terputus.';
    return `Gagal terhubung: ${reason}`;
};

const indofinityDonationAdapter = (platform: DonationPlatform, data: any): Omit<GiftNotification, 'id'> => {
  return {
    userId: data.from_name || platform,
    nickname: data.from_name || 'Donatur',
    profilePictureUrl: `https://i.pravatar.cc/40?u=${data.from_name || platform}`,
    giftName: `${data.message || `Donasi via ${platform}`} (Rp ${data.amount.toLocaleString()})`,
    giftCount: 1,
    giftId: 99999, // generic ID for donations
  };
};

export const useTikTokLive = (
    onMessage: (message: ChatMessage) => void,
    onGift: (gift: Omit<GiftNotification, 'id'>) => void
) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<Socket | WebSocket | null>(null);

  const onMessageRef = useRef(onMessage);
  const onGiftRef = useRef(onGift);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onGiftRef.current = onGift;
  }, [onMessage, onGift]);

  useEffect(() => {
    return () => { // Cleanup on unmount
      if (connectionRef.current) {
        if (connectionRef.current instanceof WebSocket) {
          connectionRef.current.close();
        } else {
          connectionRef.current.disconnect();
        }
      }
    };
  }, []);

  const connect = useCallback((config: ServerConfig) => {
    if (connectionRef.current) disconnect();

    setConnectionStatus('connecting');
    setError(null);

    switch (config.type) {
      case ServerType.RAILWAY_1:
      case ServerType.RAILWAY_2:
      case ServerType.CUSTOM:
        connectToRailway(config);
        break;
      case ServerType.INDOFINITY_WEBSOCKET:
        connectToIndoFinityWS();
        break;
      case ServerType.INDOFINITY_SOCKETIO:
        connectToIndoFinitySocketIO();
        break;
    }
  }, []);

  const handleIndoFinityMessage = (event: string, data: any) => {
    const donationPlatforms: DonationPlatform[] = ['saweria', 'sociabuzz', 'trakteer', 'tako', 'bagibagi', 'sibagi'];
    
    if (event === 'chat') {
        onMessageRef.current({
            id: data.msgId || `${Date.now()}`,
            userId: data.uniqueId,
            nickname: data.nickname,
            comment: data.comment,
            profilePictureUrl: data.profilePictureUrl,
            isWinner: false,
        });
    } else if (event === 'gift') {
        onGiftRef.current({
            userId: data.uniqueId,
            nickname: data.nickname,
            profilePictureUrl: data.profilePictureUrl,
            giftName: data.giftName,
            giftCount: data.giftCount,
            giftId: data.giftId,
        });
    } else if (donationPlatforms.includes(event as DonationPlatform)) {
        const giftData = indofinityDonationAdapter(event as DonationPlatform, data);
        onGiftRef.current(giftData);
    }
  };

  const connectToIndoFinityWS = () => {
    const ws = new WebSocket('ws://localhost:62024');
    connectionRef.current = ws;

    ws.onopen = () => {
        console.log('Terhubung ke IndoFinity WebSocket');
        setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleIndoFinityMessage(message.event, message.data);
        } catch (e) {
            console.error('Error parsing IndoFinity WS message:', e);
        }
    };

    ws.onerror = (err) => {
        console.error('IndoFinity WebSocket error:', err);
        setError('Gagal terhubung ke IndoFinity WebSocket. Pastikan server lokal berjalan.');
        setConnectionStatus('error');
    };

    ws.onclose = () => {
        console.log('Koneksi IndoFinity WebSocket ditutup');
        if (connectionStatus !== 'error') setConnectionStatus('disconnected');
    };
  };

  const connectToIndoFinitySocketIO = () => {
    const socket = io('http://localhost:62025');
    connectionRef.current = socket;

    socket.on('connect', () => {
        console.log('Terhubung ke IndoFinity Socket.IO');
        setConnectionStatus('connected');
    });

    socket.on('message', (data) => {
        try {
            handleIndoFinityMessage(data.event, data.data);
        } catch (e) {
            console.error('Error parsing IndoFinity Socket.IO message:', e);
        }
    });

    socket.on('connect_error', (err) => {
        console.error('IndoFinity Socket.IO error:', err);
        setError('Gagal terhubung ke IndoFinity Socket.IO. Pastikan server lokal berjalan.');
        setConnectionStatus('error');
    });

    socket.on('disconnect', () => {
        console.log('Koneksi IndoFinity Socket.IO terputus');
        if (connectionStatus !== 'error') setConnectionStatus('disconnected');
    });
  };

  const connectToRailway = (config: ServerConfig) => {
    if (!config.url || !config.username) {
        setError('URL Server atau Username TikTok tidak boleh kosong.');
        setConnectionStatus('error');
        return;
    }
    const socket = io(config.url);
    connectionRef.current = socket;

    socket.on('connect', () => socket.emit('setUniqueId', config.username, {}));
    socket.on('tiktokConnected', () => setConnectionStatus('connected'));
    socket.on('tiktokDisconnected', (reason: string) => {
      setError(parseTikTokError(reason));
      setConnectionStatus('error');
      socket.disconnect();
    });
    socket.on('chat', (data: TikTokChatEvent) => {
      onMessageRef.current({
        id: data.msgId,
        userId: data.uniqueId,
        nickname: data.nickname,
        comment: data.comment,
        profilePictureUrl: data.profilePictureUrl,
        isWinner: false,
      });
    });
    socket.on('gift', (data: TikTokGiftEvent) => {
        onGiftRef.current({
            userId: data.uniqueId,
            nickname: data.nickname,
            profilePictureUrl: data.profilePictureUrl,
            giftName: data.giftName,
            giftCount: data.giftCount,
            giftId: data.giftId,
        });
    });
    socket.on('streamEnd', () => {
        setError('Siaran langsung telah berakhir.');
        setConnectionStatus('disconnected');
        socket.disconnect();
    });
    socket.on('connect_error', (err) => {
      setError(`Gagal terhubung ke ${config.url}. Pastikan server berjalan.`);
      setConnectionStatus('error');
    });
    socket.on('disconnect', () => {
      if (connectionStatus !== 'error') setConnectionStatus('disconnected');
    });
  };

  const disconnect = useCallback(() => {
    if (connectionRef.current) {
        if (connectionRef.current instanceof WebSocket) {
            connectionRef.current.close();
        } else {
            connectionRef.current.disconnect();
        }
        connectionRef.current = null;
    }
    setConnectionStatus('idle');
  }, []);

  return { connectionStatus, connect, disconnect, error };
};