import React from 'react';
import { useSyncStatus } from '@/hooks/useRealtime';
import { useConnectionStatus } from '@/hooks/useRealtime';

/**
 * SyncStatusIndicator Component
 * Displays real-time sync status and connection information
 */
export const SyncStatusIndicator: React.FC<{ showDetails?: boolean }> = ({ showDetails = false }) => {
  const { overallStatus, isSyncing, isError, isOffline } = useSyncStatus();
  const { isConnected, reconnecting } = useConnectionStatus();

  const getStatusColor = () => {
    if (isError) return 'bg-red-100 text-red-800';
    if (isOffline) return 'bg-yellow-100 text-yellow-800';
    if (isSyncing) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = () => {
    if (isError) return '❌';
    if (isOffline) return '📡';
    if (isSyncing) return '🔄';
    return '✅';
  };

  const getStatusText = () => {
    if (isError) return 'Sync Error';
    if (isOffline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    return 'Synced';
  };

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${getStatusColor()}`}>
      <span>{getStatusIcon()}</span>
      <span>{getStatusText()}</span>
      {showDetails && reconnecting && <span className="ml-2 animate-pulse">(Reconnecting...)</span>}
    </div>
  );
};

/**
 * ConnectionStatusBanner Component
 * Full-width banner showing connection status
 */
export const ConnectionStatusBanner: React.FC = () => {
  const { isConnected, reconnecting } = useConnectionStatus();
  const { isOffline } = useSyncStatus();

  if (isConnected && !isOffline) {
    return null;
  }

  return (
    <div className={`w-full px-4 py-3 text-center text-sm font-medium ${
      isOffline ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
    }`}>
      {isOffline ? (
        <div>
          📡 You're offline. Changes will sync when you're back online.
        </div>
      ) : reconnecting ? (
        <div>
          🔄 Reconnecting to server...
        </div>
      ) : (
        <div>
          ❌ Connection lost. Attempting to reconnect...
        </div>
      )}
    </div>
  );
};

/**
 * SyncErrorAlert Component
 * Alert for sync errors with retry option
 */
export const SyncErrorAlert: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { isError } = useSyncStatus();

  if (!isError) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-red-800">Sync Error</h3>
          <p className="text-sm text-red-700 mt-1">
            Unable to synchronize data with the server. Please check your connection and try again.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-3 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded text-sm font-medium"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default {
  SyncStatusIndicator,
  ConnectionStatusBanner,
  SyncErrorAlert,
};
