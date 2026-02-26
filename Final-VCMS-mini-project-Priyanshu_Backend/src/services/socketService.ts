import io, { Socket } from 'socket.io-client';

/**
 * Socket.io Service for Real-time Communication
 * Handles connection, reconnection, and event management
 */

export enum SocketEvent {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  CONNECT_ERROR = 'connect_error',

  // Authentication events
  AUTH_REQUIRED = 'auth:required',
  AUTH_SUCCESS = 'auth:success',
  AUTH_ERROR = 'auth:error',
  USER_STATUS = 'user:status',

  // Appointment events
  APPOINTMENT_CREATED = 'appointment:created',
  APPOINTMENT_UPDATED = 'appointment:updated',
  APPOINTMENT_CANCELLED = 'appointment:cancelled',
  APPOINTMENT_STATUS_CHANGED = 'appointment:status_changed',

  // Chat events
  MESSAGE_SENT = 'message:sent',
  MESSAGE_RECEIVED = 'message:received',
  TYPING = 'typing',
  TYPING_STOP = 'typing:stop',

  // Notification events
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_READ = 'notification:read',

  // Prescription events
  PRESCRIPTION_CREATED = 'prescription:created',
  PRESCRIPTION_UPDATED = 'prescription:updated',

  // Video events
  VIDEO_STARTED = 'video:started',
  VIDEO_ENDED = 'video:ended',
}

export interface SocketEventPayload {
  [key: string]: any;
}

export interface ConnectionState {
  connected: boolean;
  authenticated: boolean;
  reconnecting: boolean;
  lastConnected: Date | null;
  connectionAttempts: number;
}

class SocketService {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = {
    connected: false,
    authenticated: false,
    reconnecting: false,
    lastConnected: null,
    connectionAttempts: 0,
  };
  private eventListeners: Map<string, Set<(payload: any) => void>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Initialize Socket.io connection
   */
  public initialize(token?: string, baseURL?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const url = baseURL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    this.socket = io(url, {
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  /**
   * Setup default event listeners
   */
  private setupDefaultListeners(): void {
    if (!this.socket) return;

    this.socket.on(SocketEvent.CONNECT, () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.connectionState = {
        ...this.connectionState,
        connected: true,
        lastConnected: new Date(),
        connectionAttempts: 0,
        reconnecting: false,
      };
      this.emitEvent('socket:connected', this.connectionState);
    });

    this.socket.on(SocketEvent.DISCONNECT, (reason: string) => {
      console.log('❌ Socket disconnected:', reason);
      this.connectionState = {
        ...this.connectionState,
        connected: false,
        authenticated: false,
      };
      this.emitEvent('socket:disconnected', { reason });
    });

    this.socket.on(SocketEvent.RECONNECT_ATTEMPT, () => {
      console.log('🔄 Socket reconnection attempt:', this.connectionState.connectionAttempts + 1);
      this.connectionState = {
        ...this.connectionState,
        reconnecting: true,
        connectionAttempts: this.connectionState.connectionAttempts + 1,
      };
      this.emitEvent('socket:reconnecting', this.connectionState);
    });

    this.socket.on(SocketEvent.RECONNECT, () => {
      console.log('✅ Socket reconnected');
      this.connectionState = {
        ...this.connectionState,
        connected: true,
        authenticated: true,
        reconnecting: false,
        connectionAttempts: 0,
      };
      this.emitEvent('socket:reconnected', this.connectionState);
    });

    this.socket.on(SocketEvent.CONNECT_ERROR, (error: any) => {
      console.error('❌ Socket connection error:', error);
      this.emitEvent('socket:error', error);
    });

    this.socket.on(SocketEvent.AUTH_SUCCESS, () => {
      console.log('✅ Socket authenticated');
      this.connectionState.authenticated = true;
      this.emitEvent('socket:authenticated', this.connectionState);
    });

    this.socket.on(SocketEvent.AUTH_ERROR, (error: any) => {
      console.error('❌ Socket authentication error:', error);
      this.connectionState.authenticated = false;
      this.emitEvent('socket:auth_error', error);
    });
  }

  /**
   * Register event listener
   */
  public on(event: string, callback: (payload: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);

    // If socket exists, also register on socket
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Emit event locally
   */
  private emitEvent(event: string, payload: any): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Send event via socket
   */
  public emit(event: string, data?: any, callback?: (response: any) => void): void {
    if (!this.socket?.connected) {
      console.warn(`⚠️ Socket not connected. Cannot emit ${event}`);
      return;
    }
    this.socket.emit(event, data, callback);
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback?: (payload: any) => void): void {
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.eventListeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Is connected
   */
  public isConnected(): boolean {
    return this.connectionState.connected;
  }

  /**
   * Is authenticated
   */
  public isAuthenticated(): boolean {
    return this.connectionState.authenticated;
  }

  /**
   * Authenticate socket
   */
  public authenticate(token: string): void {
    if (this.socket) {
      this.socket.auth = { token };
      if (this.socket.connected) {
        this.socket.disconnect();
        this.socket.connect();
      }
    }
  }

  /**
   * Disconnect socket
   */
  public disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
  }

  /**
   * Force reconnection
   */
  public reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }

  /**
   * Get socket instance (for advanced usage)
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Listen to appointment changes
   */
  public onAppointmentChange(callback: (appointment: any) => void): void {
    this.on(SocketEvent.APPOINTMENT_CREATED, callback);
    this.on(SocketEvent.APPOINTMENT_UPDATED, callback);
    this.on(SocketEvent.APPOINTMENT_STATUS_CHANGED, callback);
    this.on(SocketEvent.APPOINTMENT_CANCELLED, callback);
  }

  /**
   * Listen to notification changes
   */
  public onNotificationChange(callback: (notification: any) => void): void {
    this.on(SocketEvent.NOTIFICATION_NEW, callback);
  }

  /**
   * Listen to message changes
   */
  public onMessageChange(callback: (message: any) => void): void {
    this.on(SocketEvent.MESSAGE_RECEIVED, callback);
  }

  /**
   * Send typing indicator
   */
  public sendTypingIndicator(conversationId: string): void {
    this.emit(SocketEvent.TYPING, { conversationId });
  }

  /**
   * Stop typing indicator
   */
  public stopTypingIndicator(conversationId: string): void {
    this.emit(SocketEvent.TYPING_STOP, { conversationId });
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.off('');
    this.eventListeners.clear();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();

export default socketService;
