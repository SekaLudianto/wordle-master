
import { io } from 'socket.io-client';
import { TikTokChatEvent, TikTokMemberEvent, TikTokGiftEvent, TikTokLikeEvent } from '../types';

// Connects to the hosted Node.js server
const BACKEND_URL = "https://ini-live.up.railway.app";

class TikTokConnector {
  // Use 'any' type for socket to prevent import issues with Socket type from CDN
  private socket: any = null;
  private uniqueId: string | null = null;
  private sessionId: string | null = null;

  connectToBackend() {
    // Prevent multiple connections
    if (this.socket?.connected) return;

    this.socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: 30, // Try 30 times before giving up
      reconnectionDelay: 2000,  // Wait 2 seconds
      reconnectionDelayMax: 5000, // Max wait 5 seconds
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log("Socket connected to backend!");
      if (this.uniqueId) {
        this.emitSetUniqueId();
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.warn("Socket disconnected:", reason);
      // If the disconnect was initiated by the server or manual, we might need to handle it.
      // But for 'transport close' or 'ping timeout', socket.io handles auto-reconnect.
    });
  }

  setUniqueId(uniqueId: string, sessionId?: string) {
    this.uniqueId = uniqueId;
    this.sessionId = sessionId || null;
    
    if (this.socket && this.socket.connected) {
      this.emitSetUniqueId();
    }
  }

  private emitSetUniqueId() {
    if (!this.socket || !this.uniqueId) return;
    
    const options: any = {
      enableExtendedGiftInfo: true
    };

    if (this.sessionId) {
        options.sessionId = this.sessionId;
        console.log("Connecting with Session ID...");
    }

    this.socket.emit('setUniqueId', this.uniqueId, options);
  }

  onChat(callback: (msg: TikTokChatEvent) => void) {
    if (!this.socket) return;
    this.socket.on('chat', callback);
  }
  
  offChat(callback?: (msg: TikTokChatEvent) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('chat', callback);
    else this.socket.off('chat');
  }

  onMember(callback: (msg: TikTokMemberEvent) => void) {
    if (!this.socket) return;
    this.socket.on('member', callback);
  }

  offMember(callback?: (msg: TikTokMemberEvent) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('member', callback);
    else this.socket.off('member');
  }

  onGift(callback: (msg: TikTokGiftEvent) => void) {
    if (!this.socket) return;
    this.socket.on('gift', callback);
  }

  offGift(callback?: (msg: TikTokGiftEvent) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('gift', callback);
    else this.socket.off('gift');
  }

  onLike(callback: (msg: TikTokLikeEvent) => void) {
    if (!this.socket) return;
    this.socket.on('like', callback);
  }

  offLike(callback?: (msg: TikTokLikeEvent) => void) {
    if (!this.socket) return;
    if (callback) this.socket.off('like', callback);
    else this.socket.off('like');
  }

  onConnected(callback: (state: any) => void) {
    if (!this.socket) return;
    this.socket.on('tiktokConnected', callback);
  }

  onDisconnected(callback: (err: string) => void) {
    if (!this.socket) return;
    this.socket.on('tiktokDisconnected', callback);
  }
  
  onError(callback: (err: string) => void) {
      if(!this.socket) return;
      this.socket.on('tiktokDisconnected', callback);
  }

  // New methods for reconnection status
  onReconnecting(callback: (attempt: number) => void) {
    if (!this.socket) return;
    this.socket.io.on("reconnect_attempt", callback);
  }

  onReconnectFailed(callback: () => void) {
    if (!this.socket) return;
    this.socket.io.on("reconnect_failed", callback);
  }

  onReconnectSuccess(callback: () => void) {
    if (!this.socket) return;
    this.socket.io.on("reconnect", callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const tiktokService = new TikTokConnector();
