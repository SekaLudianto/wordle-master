
import { io, Socket } from 'socket.io-client';
import { TikTokChatEvent, TikTokGiftEvent, TikTokLikeEvent } from '../types';

// Endpoints
const LIVE_CONNECTOR_URL = "https://buat-lev.up.railway.app";
const INDOFINITY_SOCKET_IO_URL = "http://192.168.1.189:62025";
const INDOFINITY_WEBSOCKET_URL = "ws://192.168.1.1:62024";

type ConnectionMode = 'live-connector' | 'indofinity-socket.io' | 'indofinity-websocket' | 'none';
type EventCallback = (...args: any[]) => void;
type Listeners = Record<string, EventCallback[]>;

interface DonationEvent {
    donator_name: string;
    amount: number;
    message: string;
    id?: string | number;
    uniqueId?: string; 
    profilePictureUrl?: string; 
}

class ConnectionService {
    private socket: Socket | null = null;
    private ws: WebSocket | null = null;
    private mode: ConnectionMode = 'none';
    private listeners: Listeners = {};
    private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isWsReconnecting = false;

    private disconnectCurrentConnection() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.wsReconnectTimer) {
            clearTimeout(this.wsReconnectTimer);
            this.wsReconnectTimer = null;
        }
        this.isWsReconnecting = false;
        this.mode = 'none';
    }

    // --- Public Connection Methods ---

    public connectToLiveConnector(uniqueId: string, sessionId?: string) {
        this.disconnectCurrentConnection();
        this.mode = 'live-connector';
        console.log(`Connecting to Live Connector backend for @${uniqueId}...`);

        this.socket = io(LIVE_CONNECTOR_URL, {
            reconnection: true,
            reconnectionAttempts: 30,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });
        this.setupLiveConnectorListeners();
        this.socket.on('connect', () => {
            console.log("Connected to Live Connector backend!");
            const options: any = { enableExtendedGiftInfo: true };
            if (sessionId) options.sessionId = sessionId;
            this.socket?.emit('setUniqueId', uniqueId, options);
        });
    }

    public connectToIndoFinity(protocol: 'socket.io' | 'websocket') {
        this.disconnectCurrentConnection();
        if (protocol === 'socket.io') {
            this.connectIndofinitySocketIO();
        } else {
            this.connectIndofinityWebSocket();
        }
    }

    public disconnect() {
        this.disconnectCurrentConnection();
    }

    // --- Private Connection Handlers ---

    private connectIndofinitySocketIO() {
        this.mode = 'indofinity-socket.io';
        console.log("Connecting to IndoFinity (Socket.IO)...");
        this.socket = io(INDOFINITY_SOCKET_IO_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 3000,
        });
        this.setupIndoFinitySocketIOListeners();
        this.socket.on('connect', () => {
            console.log('Connected to IndoFinity (Socket.IO)!');
            this.emit('connected', { roomId: 'IndoFinity' });
        });
    }

    private connectIndofinityWebSocket() {
        this.mode = 'indofinity-websocket';
        console.log("Connecting to IndoFinity (WebSocket)...");
        if (this.ws) this.ws.close();
        
        this.ws = new WebSocket(INDOFINITY_WEBSOCKET_URL);

        this.ws.onopen = () => {
            console.log('Connected to IndoFinity (WebSocket)!');
            this.isWsReconnecting = false;
            if(this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
            this.emit('connected', { roomId: 'IndoFinity WS' });
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleIndoFinityMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('IndoFinity WebSocket connection closed.');
            this.emit('disconnected', 'IndoFinity WS connection closed');
            this.scheduleWsReconnect();
        };

        this.ws.onerror = (err) => {
            console.error('IndoFinity WebSocket error:', err);
            this.emit('error', 'IndoFinity WebSocket error');
            this.scheduleWsReconnect();
        };
    }
    
    private scheduleWsReconnect() {
        if (this.isWsReconnecting || this.mode !== 'indofinity-websocket') return;

        this.isWsReconnecting = true;
        this.emit('reconnecting');
        console.log('Scheduling WebSocket reconnect in 3s...');
        
        this.wsReconnectTimer = setTimeout(() => {
            this.connectIndofinityWebSocket();
        }, 3000);
    }

    // --- Event Emitter Logic ---
    public on(event: string, callback: EventCallback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    public off(event: string, callback?: EventCallback) {
        if (!this.listeners[event]) return;
        if (callback) this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        else delete this.listeners[event];
    }
    private emit(event: string, ...args: any[]) {
        if (this.listeners[event]) this.listeners[event].forEach(callback => callback(...args));
    }

    // --- Backend-Specific Listeners ---
    private setupLiveConnectorListeners() {
        if (!this.socket) return;
        this.socket.on('chat', (data: TikTokChatEvent) => this.emit('chat', data));
        this.socket.on('gift', (data: TikTokGiftEvent) => this.emit('gift', data));
        this.socket.on('like', (data: TikTokLikeEvent) => this.emit('like', data));
        this.socket.on('tiktokConnected', (data: any) => this.emit('connected', data));
        this.socket.on('tiktokDisconnected', (data: string) => this.emit('disconnected', data));
        this.socket.io.on("reconnect_attempt", (attempt) => this.emit('reconnecting', attempt));
        this.socket.io.on("reconnect_failed", () => this.emit('reconnect_failed'));
        this.socket.io.on("reconnect", () => this.emit('reconnect_success'));
    }

    private setupIndoFinitySocketIOListeners() {
        if (!this.socket) return;
        this.socket.on('message', (message: { event: string, data: any }) => this.handleIndoFinityMessage(message));
        this.socket.on('disconnect', (reason: string) => this.emit('disconnected', `Disconnected: ${reason}`));
        this.socket.on('connect_error', (err: Error) => this.emit('error', `Connection error: ${err.message}`));
    }
    
    // --- Data Adapter/Normalizer ---
    private handleIndoFinityMessage(message: { event: string; data: any }) {
        const { event, data } = message;
        const donationEvents = ['saweria', 'sociabuzz', 'trakteer', 'tako', 'bagibagi', 'sibagi'];
        if (donationEvents.includes(event)) {
            this.handleDonationEvent(event, data);
        } else {
            this.emit(event, data);
        }
    }
    
    private handleDonationEvent(platform: string, data: DonationEvent) {
        const syntheticGift: TikTokGiftEvent = {
            giftId: 0,
            repeatCount: 1,
            diamondCount: Math.floor(data.amount / 1000), // Assuming amount is in IDR, convert to rough 'coin' value
            userId: data.uniqueId || `donation_${platform}_${data.id || Date.now()}`,
            uniqueId: data.donator_name,
            nickname: data.donator_name,
            profilePictureUrl: data.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.donator_name)}&background=random`,
            giftName: `Donation via ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
            giftType: 0,
        };
        this.emit('gift', syntheticGift);
    }
}

export const connectionService = new ConnectionService();