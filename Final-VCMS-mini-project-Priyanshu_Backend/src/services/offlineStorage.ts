/**
 * Offline Storage Service
 * Handles local storage with versioning and expiration
 */

export interface StorageEntry<T> {
  data: T;
  timestamp: number;
  version: number;
  expiresAt?: number;
}

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = 'vcms_';

export class OfflineStorageService {
  private static instance: OfflineStorageService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  /**
   * Save data to local storage
   */
  set<T>(key: string, data: T, expiresIn?: number): boolean {
    try {
      const entry: StorageEntry<T> = {
        data,
        timestamp: Date.now(),
        version: STORAGE_VERSION,
        expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      };
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
      return true;
    } catch (error) {
      console.error(`Failed to save ${key} to local storage:`, error);
      return false;
    }
  }

  /**
   * Get data from local storage
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (!stored) return defaultValue;

      const entry: StorageEntry<T> = JSON.parse(stored);

      // Check if expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.remove(key);
        return defaultValue;
      }

      // Check version compatibility
      if (entry.version !== STORAGE_VERSION) {
        console.warn(`Storage version mismatch for ${key}`);
        return defaultValue;
      }

      return entry.data;
    } catch (error) {
      console.error(`Failed to get ${key} from local storage:`, error);
      return defaultValue;
    }
  }

  /**
   * Remove data from local storage
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch (error) {
      console.error(`Failed to remove ${key} from local storage:`, error);
      return false;
    }
  }

  /**
   * Clear all stored data
   */
  clear(): boolean {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to clear local storage:', error);
      return false;
    }
  }

  /**
   * Get all stored keys
   */
  keys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keys.push(key.replace(STORAGE_PREFIX, ''));
        }
      }
    } catch (error) {
      console.error('Failed to get storage keys:', error);
    }
    return keys;
  }

  /**
   * Get storage size in bytes
   */
  getSize(): number {
    let size = 0;
    try {
      for (let key in localStorage) {
        if (key.startsWith(STORAGE_PREFIX)) {
          size += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
    }
    return size;
  }

  /**
   * Check if data exists
   */
  has(key: string): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (!stored) return false;

      const entry: StorageEntry<any> = JSON.parse(stored);
      
      // Check if expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.remove(key);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Merge data (useful for updating partial state)
   */
  merge<T extends object>(key: string, updates: Partial<T>): T | undefined {
    try {
      const current = this.get<T>(key);
      if (!current) return undefined;

      const merged = { ...current, ...updates };
      this.set(key, merged);
      return merged;
    } catch (error) {
      console.error(`Failed to merge ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Get storage with expiration info
   */
  getWithExpiry(key: string): { data: any; expiresIn?: number; isExpired: boolean } | null {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (!stored) return null;

      const entry: StorageEntry<any> = JSON.parse(stored);
      const now = Date.now();
      const isExpired = entry.expiresAt ? entry.expiresAt < now : false;

      if (isExpired) {
        this.remove(key);
      }

      return {
        data: entry.data,
        expiresIn: entry.expiresAt ? entry.expiresAt - now : undefined,
        isExpired,
      };
    } catch (error) {
      console.error(`Failed to get ${key} with expiry:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const offlineStorage = OfflineStorageService.getInstance();

export default offlineStorage;
