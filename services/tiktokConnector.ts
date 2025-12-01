import { io, Socket } from 'socket.io-client';
import { TikTokChatEvent, TikTokMemberEvent } from '../types';

// Connects to the hosted Node.js server
const BACKEND_URL = "https://buat-lev.up.railway.app";

class TikTokConnector {
  private socket: Socket | null = null;
  private uniqueId: string | null = null;

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

  setUniqueId(uniqueId: string) {
    this.uniqueId = uniqueId;
    if (this.socket && this.socket.connected) {
      this.emitSetUniqueId();
    }
  }

  private emitSetUniqueId() {
    if (!this.socket || !this.uniqueId) return;
    this.socket.emit('setUniqueId', this.uniqueId, {
      enableExtendedGiftInfo: true
    });
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