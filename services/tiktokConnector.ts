import { io } from 'socket.io-client';
import { TikTokChatEvent, TikTokMemberEvent } from '../types';

// Connects to the hosted Node.js server
const BACKEND_URL = "https://buat-lev.up.railway.app";

class TikTokConnector {
  // Use 'any' type for socket to prevent import issues with Socket type from CDN
  private socket: any = null;
  private uniqueId: string | null = null;
  private sessionId: string | null = null;

  connectToBackend() {
    // Prevent multiple connections
    if (this.socket?.connected) return;

    this.socket = io(BACKEND_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log("Socket connected to backend!");
      if (this.uniqueId) {
        this.emitSetUniqueId();
      }
    });

    this.socket.on('disconnect', () => {
      console.warn("Socket disconnected!");
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

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const tiktokService = new TikTokConnector();