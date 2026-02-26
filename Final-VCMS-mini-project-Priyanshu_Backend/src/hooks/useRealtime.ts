import { useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContextV2';
import { useClinic } from '../contexts/ClinicContextV2';
import { socketService } from '../services/socketService';

/**
 * useRealTimeSync
 * Hook to synchronize data in real-time with the server
 */
export const useRealTimeSync = () => {
  const { syncData: authSync, isOnline } = useAuth();
  const { syncData: clinicSync } = useClinic();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOnline) {
      // Sync immediately when coming online
      authSync();
      clinicSync();

      // Setup periodic sync every 30 seconds
      const interval = setInterval(() => {
        if (navigator.onLine) {
          authSync();
          clinicSync();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOnline, authSync, clinicSync]);

  const triggerSync = useCallback(() => {
    // Debounce sync requests
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      authSync();
      clinicSync();
    }, 1000);
  }, [authSync, clinicSync]);

  return { triggerSync, isOnline };
};

/**
 * useConnectionStatus
 * Hook to monitor connection status
 */
export const useConnectionStatus = () => {
  const [connectionState, setConnectionState] = useState({
    isConnected: socketService.isConnected(),
    isAuthenticated: socketService.isAuthenticated(),
    reconnecting: false,
  });

  useEffect(() => {
    const updateConnection = () => {
      setConnectionState({
        isConnected: socketService.isConnected(),
        isAuthenticated: socketService.isAuthenticated(),
        reconnecting: false,
      });
    };

    socketService.on('socket:connected', updateConnection);
    socketService.on('socket:disconnected', () => {
      setConnectionState(prev => ({ ...prev, isConnected: false }));
    });
    socketService.on('socket:reconnecting', () => {
      setConnectionState(prev => ({ ...prev, reconnecting: true }));
    });
    socketService.on('socket:authenticated', updateConnection);
    socketService.on('socket:auth_error', () => {
      setConnectionState(prev => ({ ...prev, isAuthenticated: false }));
    });

    return () => {
      socketService.off('socket:connected');
      socketService.off('socket:disconnected');
      socketService.off('socket:reconnecting');
      socketService.off('socket:authenticated');
      socketService.off('socket:auth_error');
    };
  }, []);

  return connectionState;
};

/**
 * useAppointmentUpdates
 * Hook to listen to appointment updates in real-time
 */
export const useAppointmentUpdates = (callback?: (apt: any) => void) => {
  const { subscribeToAppointments } = useClinic();

  useEffect(() => {
    if (!callback) return;

    const unsubscribe = subscribeToAppointments(callback);
    return unsubscribe;
  }, [callback, subscribeToAppointments]);

  // Also listen to socket events
  useEffect(() => {
    socketService.onAppointmentChange(callback || (() => {}));
  }, [callback]);
};

/**
 * useNotificationUpdates
 * Hook to listen to notification updates in real-time
 */
export const useNotificationUpdates = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { notifications, markNotificationRead } = useAuth();

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const markAllAsRead = useCallback(() => {
    notifications.forEach(n => {
      if (!n.read) {
        markNotificationRead(n.id);
      }
    });
  }, [notifications, markNotificationRead]);

  useEffect(() => {
    socketService.onNotificationChange(() => {
      // Trigger update
      setUnreadCount(prev => prev + 1);
    });
  }, []);

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead: markNotificationRead,
  };
};

/**
 * useOfflineSync
 * Hook to handle offline/online transitions
 */
export const useOfflineSync = () => {
  const { isOnline, syncData: authSync, getOfflineData } = useAuth();
  const { syncData: clinicSync } = useClinic();
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      console.log('🔄 Syncing after coming online...');
      setHasLocalChanges(true);
      await Promise.all([authSync(), clinicSync()]);
      setHasLocalChanges(false);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [authSync, clinicSync]);

  return {
    isOnline,
    hasLocalChanges,
    offlineData: getOfflineData(),
  };
};

/**
 * useAutoReconnect
 * Hook to handle automatic reconnection
 */
export const useAutoReconnect = () => {
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxAttempts = 5;

  useEffect(() => {
    socketService.on('socket:disconnected', () => {
      setReconnectAttempts(0);
    });

    socketService.on('socket:reconnecting', () => {
      setReconnectAttempts(prev => Math.min(prev + 1, maxAttempts));
    });

    socketService.on('socket:reconnected', () => {
      setReconnectAttempts(0);
    });

    return () => {
      socketService.off('socket:disconnected');
      socketService.off('socket:reconnecting');
      socketService.off('socket:reconnected');
    };
  }, []);

  const manualReconnect = useCallback(() => {
    socketService.reconnect();
  }, []);

  const isMaxAttemptsReached = reconnectAttempts >= maxAttempts;

  return {
    reconnectAttempts,
    maxAttempts,
    isMaxAttemptsReached,
    manualReconnect,
  };
};

/**
 * useSyncStatus
 * Hook to track sync status across auth and clinic
 */
export const useSyncStatus = () => {
  const { syncStatus: authSyncStatus } = useAuth();
  const { syncStatus: clinicSyncStatus } = useClinic();

  const overallStatus = (() => {
    if (authSyncStatus === 'syncing' || clinicSyncStatus === 'syncing') return 'syncing';
    if (authSyncStatus === 'error' || clinicSyncStatus === 'error') return 'error';
    if (authSyncStatus === 'offline' && clinicSyncStatus === 'offline') return 'offline';
    return 'synced';
  })();

  return {
    authSyncStatus,
    clinicSyncStatus,
    overallStatus,
    isSyncing: overallStatus === 'syncing',
    isError: overallStatus === 'error',
    isOffline: overallStatus === 'offline',
    isSynced: overallStatus === 'synced',
  };
};

/**
 * useRealtimeChat
 * Hook for real-time chat operations
 */
export const useRealtimeChat = () => {
  const [typing, setTyping] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const sendTypingIndicator = useCallback((conversationId: string) => {
    socketService.sendTypingIndicator(conversationId);

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTypingIndicator(conversationId);
    }, 3000);
  }, []);

  const stopTypingIndicator = useCallback((conversationId: string) => {
    socketService.stopTypingIndicator(conversationId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    socketService.on('typing', (data: any) => {
      setTyping(prev => new Set([...prev, data.userId]));
    });

    socketService.on('typing:stop', (data: any) => {
      setTyping(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      socketService.off('typing');
      socketService.off('typing:stop');
    };
  }, []);

  return {
    typing: Array.from(typing),
    sendTypingIndicator,
    stopTypingIndicator,
  };
};

/**
 * useDataCache
 * Hook to cache frequently accessed data
 */
export const useDataCache = () => {
  const { appointments } = useClinic();
  const { users } = useAuth();
  const cacheRef = useRef({
    appointmentsByDoctor: new Map<string, any[]>(),
    appointmentsByPatient: new Map<string, any[]>(),
    usersByRole: new Map<string, any[]>(),
    lastUpdated: new Date(),
  });

  const rebuildCache = useCallback(() => {
    // Group appointments by doctor
    const byDoctor = new Map<string, any[]>();
    appointments.forEach(apt => {
      if (!byDoctor.has(apt.doctorId)) {
        byDoctor.set(apt.doctorId, []);
      }
      byDoctor.get(apt.doctorId)?.push(apt);
    });

    // Group appointments by patient
    const byPatient = new Map<string, any[]>();
    appointments.forEach(apt => {
      if (!byPatient.has(apt.patientId)) {
        byPatient.set(apt.patientId, []);
      }
      byPatient.get(apt.patientId)?.push(apt);
    });

    // Group users by role
    const byRole = new Map<string, any[]>();
    users.forEach(user => {
      if (!byRole.has(user.role)) {
        byRole.set(user.role, []);
      }
      byRole.get(user.role)?.push(user);
    });

    cacheRef.current = {
      appointmentsByDoctor: byDoctor,
      appointmentsByPatient: byPatient,
      usersByRole: byRole,
      lastUpdated: new Date(),
    };
  }, [appointments, users]);

  useEffect(() => {
    rebuildCache();
  }, [rebuildCache]);

  return {
    getAppointmentsByDoctor: (doctorId: string) => cacheRef.current.appointmentsByDoctor.get(doctorId) || [],
    getAppointmentsByPatient: (patientId: string) => cacheRef.current.appointmentsByPatient.get(patientId) || [],
    getUsersByRole: (role: string) => cacheRef.current.usersByRole.get(role) || [],
    getCacheStats: () => ({
      doctors: cacheRef.current.appointmentsByDoctor.size,
      patients: cacheRef.current.appointmentsByPatient.size,
      roles: cacheRef.current.usersByRole.size,
      lastUpdated: cacheRef.current.lastUpdated,
    }),
  };
};

export default {
  useRealTimeSync,
  useConnectionStatus,
  useAppointmentUpdates,
  useNotificationUpdates,
  useOfflineSync,
  useAutoReconnect,
  useSyncStatus,
  useRealtimeChat,
  useDataCache,
};
