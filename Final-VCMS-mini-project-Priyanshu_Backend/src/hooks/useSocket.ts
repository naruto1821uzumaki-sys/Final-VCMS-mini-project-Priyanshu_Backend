import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // ✅ NEW: Track previous rooms for reconnection
  const roomsRef = useRef<Set<string>>(new Set());
  const sessionDataRef = useRef<Record<string, any>>({});
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: {
        userId: user._id,
        token: localStorage.getItem('token'),
      },
    });

    // ✅ ENHANCED: Connection event with room setup
    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected:', socketRef.current?.id);
      setIsConnected(true);
      setIsReconnecting(false);

      // Notify server user is online
      socketRef.current?.emit('user-connected', {
        userId: user._id,
        socketId: socketRef.current?.id,
      });

      // Join user-specific rooms
      const defaultRooms = [`user_${user._id}`, `${user.role}_${user._id}`];
      defaultRooms.forEach(room => {
        socketRef.current?.emit('join-room', { roomId: room, userId: user._id });
        roomsRef.current.add(room);
      });
    });

    // ✅ NEW: Reconnect event with room rejoin
    socketRef.current.on('reconnect', () => {
      console.log('🔄 Socket reconnected:', socketRef.current?.id);
      setIsReconnecting(false);

      // Send reconnect event with previous rooms
      socketRef.current?.emit('user-reconnected', {
        userId: user._id,
        previousRooms: Array.from(roomsRef.current),
        sessionData: sessionDataRef.current,
      });
    });

    // ✅ NEW: Session restored event
    socketRef.current.on('session-restored', (data) => {
      console.log('📋 Session restored:', data);
      sessionDataRef.current = data;
    });

    // ✅ NEW: Disconnect event
    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      setIsReconnecting(true);
    });

    // ✅ NEW: Reconnect attempt event
    socketRef.current.on('reconnect_attempt', () => {
      console.log('🔄 Attempting to reconnect...');
      setIsReconnecting(true);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    // ✅ NEW: Room join notification
    socketRef.current.on('user-joined-room', (data) => {
      console.log('👤 User joined room:', data);
    });

    // ✅ NEW: Room leave notification
    socketRef.current.on('user-left-room', (data) => {
      console.log('👤 User left room:', data);
    });

    // ✅ NEW: Room rejoin notification
    socketRef.current.on('user-rejoined-room', (data) => {
      console.log('🔄 User rejoined room:', data);
    });

    // ✅ NEW: Real-time appointment status change
    socketRef.current.on('appointment-status-changed', (data) => {
      console.log('📋 Appointment status changed:', data);
      // This will be consumed by pages/components listening to this event
    });

    // ✅ NEW: Real-time prescription issued
    socketRef.current.on('prescription-issued', (data) => {
      console.log('💊 Prescription issued:', data);
      // This will be consumed by pages/components listening to this event
    });

    // ✅ NEW: Doctor approved
    socketRef.current.on('doctor-approved', (data) => {
      console.log('✅ Doctor approved:', data);
      // This will be consumed by admin dashboard
    });

    // ✅ NEW: Doctor rejected
    socketRef.current.on('doctor-rejected', (data) => {
      console.log('❌ Doctor rejected:', data);
      // This will be consumed by admin dashboard
    });

    // ✅ NEW: Online/Offline status
    socketRef.current.on('user-online', (data) => {
      console.log('🟢 User online:', data);
    });

    socketRef.current.on('user-offline', (data) => {
      console.log('🔴 User offline:', data);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('reconnect');
        socketRef.current.off('disconnect');
        socketRef.current.off('reconnect_attempt');
        socketRef.current.off('connect_error');
        socketRef.current.off('user-joined-room');
        socketRef.current.off('user-left-room');
        socketRef.current.off('user-rejoined-room');
        socketRef.current.off('session-restored');
        socketRef.current.off('appointment-status-changed');
        socketRef.current.off('prescription-issued');
        socketRef.current.off('doctor-approved');
        socketRef.current.off('doctor-rejected');
        socketRef.current.off('user-online');
        socketRef.current.off('user-offline');
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user]);

  // ✅ NEW: Helper to track room joins
  const joinRoom = useCallback((roomId: string) => {
    roomsRef.current.add(roomId);
    socketRef.current?.emit('join-room', { roomId, userId: user?._id });
  }, [user]);

  // ✅ NEW: Helper to track room leaves
  const leaveRoom = useCallback((roomId: string) => {
    roomsRef.current.delete(roomId);
    socketRef.current?.emit('leave-room', { roomId, userId: user?._id });
  }, [user]);

  // ✅ NEW: Store session data for persistence
  const storeSessionData = useCallback((key: string, value: any) => {
    sessionDataRef.current[key] = value;
    socketRef.current?.emit('store-session-data', {
      userId: user?._id,
      key,
      value,
    });
  }, [user]);

  // Helper function to listen to socket events
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, callback);
  }, []);

  // Helper function to emit socket events
  const emit = useCallback((event: string, data: any) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, data);
  }, []);

  // Helper function to remove listener
  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (!socketRef.current) return;
    if (callback) {
      socketRef.current.off(event, callback);
    } else {
      socketRef.current.off(event);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    on,
    emit,
    off,
    joinRoom,
    leaveRoom,
    storeSessionData,
    getRooms: () => Array.from(roomsRef.current),
    getSessionData: () => ({ ...sessionDataRef.current }),
  };
};

export default useSocket;
