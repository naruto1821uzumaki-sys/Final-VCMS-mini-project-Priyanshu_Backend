import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect,
  useRef
} from "react";
import api, { setToken } from '../services/api';

// ✅ NEW: Type definitions for PHASE 3
export interface User {
  _id: string;
  id?: string;
  email: string;
  name: string;
  role: "admin" | "doctor" | "patient";
  phone?: string;
  avatar?: string;
  specialization?: string;
  qualifications?: string[];
  bio?: string;
  location?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  accountStatus?: "active" | "suspended" | "locked";
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: "doctor" | "patient";
  specialization?: string;
}

export interface AuthContextType {
  // ✅ State
  user: User | null;
  users: User[];
  notifications: Notification[];
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  isRefreshingToken: boolean;

  // ✅ Authentication Methods
  login: (email: string, password: string) => Promise<{
    success: boolean;
    message: string;
    user?: User;
  }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;

  // ✅ User Management
  updateUser: (id: string, userData: any) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; message: string }>;
  warnUser: (id: string, message: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;

  // ✅ OTP & Password Reset
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, code: string) => Promise<{ success: boolean; message: string; verified?: boolean }>;
  resetPassword: (phone: string, code: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;

  // ✅ Notifications
  addNotification: (notification: any) => void;
  markNotificationRead: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ NEW: Token refresh interval (15 minutes = 900000ms)
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000;

// ✅ NEW: Session storage keys
const STORAGE_KEYS = {
  TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'authUser',
  SESSION_TIMESTAMP: 'authSessionTimestamp',
} as const;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // ✅ NEW: Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  
  // ✅ NEW: Token refresh timer ref
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  /**
   * ✅ NEW: Refresh access token using refresh token
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    // Prevent multiple refresh attempts
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    setIsRefreshingToken(true);
    
    const refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        
        if (!refreshToken) {
          console.log('❌ No refresh token found');
          return false;
        }

        console.log('🔄 Attempting to refresh access token...');
        const res = await api.post('/auth/refresh-token', { refreshToken });
        
        if (res.status === 200 && res.data.accessToken) {
          // ✅ Update tokens
          const newAccessToken = res.data.accessToken;
          const newRefreshToken = res.data.refreshToken || refreshToken;
          
          setToken(newAccessToken);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, Date.now().toString());
          
          console.log('✅ Token refreshed successfully');
          setAuthError(null);
          return true;
        }
        
        console.error('❌ Invalid refresh response:', res.data);
        return false;
      } catch (error: any) {
        console.error('❌ Token refresh failed:', error.response?.data?.message || error.message);
        
        // Clear session on refresh failure
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        setToken(null);
        setUser(null);
        setAuthError('Session expired. Please login again.');
        
        return false;
      } finally {
        setIsRefreshingToken(false);
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  /**
   * ✅ NEW: Setup automatic token refresh
   */
  const setupTokenRefresh = useCallback(() => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Set up new timer for token refresh every 15 minutes
    refreshTimerRef.current = setInterval(() => {
      refreshAccessToken();
    }, TOKEN_REFRESH_INTERVAL);

    console.log('✅ Token refresh timer set (15 minutes)');
  }, [refreshAccessToken]);

  /**
   * ✅ NEW: Clear token refresh timer
   */
  const clearTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
      console.log('🛑 Token refresh timer cleared');
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthError(null);
      const res = await api.post('/auth/login', { email, password });
      const result = res.data;
      
      if (!res || res.status !== 200) {
        return { success: false, message: result.message };
      }

      // ✅ NEW: Store tokens and user data
      const { token, refreshToken, user: userData } = result;
      
      setToken(token);
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, Date.now().toString());
      
      setUser(userData);
      setAuthError(null);
      
      // ✅ NEW: Start token refresh timer
      setupTokenRefresh();

      return { success: true, message: 'Login successful', user: userData };

    } catch (error: any) {
      console.error("Frontend login error:", error);
      
      // Check for validation errors
      if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        const validationMsg = error.response.data.errors[0]?.msg || "Invalid input";
        setAuthError(validationMsg);
        return { success: false, message: validationMsg };
      }
      
      // Check for server error message
      if (error.response?.data?.message) {
        setAuthError(error.response.data.message);
        return { success: false, message: error.response.data.message };
      }
      
      const errorMsg = "Email or password is incorrect";
      setAuthError(errorMsg);
      return { success: false, message: errorMsg };
    }
  }, [setupTokenRefresh]);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setAuthError(null);
      const res = await api.post('/auth/register', data);
      
      if (res.status === 201) {
        return { success: true, message: 'Registration successful' };
      }
      
      return { success: false, message: res.data?.message || 'Registration failed' };
    } catch (error: any) {
      console.error("Register error details:", error.response?.data);
      const errorMsg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || "Server error";
      setAuthError(errorMsg);
      return { success: false, message: errorMsg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // ✅ NEW: Optional - notify server of logout
      await api.post('/auth/logout').catch(() => {
        /* Ignore errors */
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear all stored session data
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
      
      setToken(null);
      setUser(null);
      setAuthError(null);
      clearTokenRefresh();
      
      console.log('✅ Logged out successfully');
    }
  }, [clearTokenRefresh]);

  const updateUser = useCallback(async (userId: string, updates: Record<string, any>) => {
    try {
      const res = await api.put(`/users/${userId}`, updates);
      if (res.status === 200) {
        const updatedUser = res.data.user;
        setUser(updatedUser);
        
        // ✅ NEW: Sync user data in localStorage
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        
        return { success: true, message: 'Profile updated' };
      }
      return { success: false, message: 'Update failed' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const res = await api.delete(`/users/${userId}`);
      if (res.status === 200) {
        setUsers(prev => prev.filter(u => u._id !== userId));
        return { success: true, message: 'User deleted' };
      }
      return { success: false, message: 'Deletion failed' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }, []);

  const warnUser = useCallback(async (userId: string, message: string) => {
    try {
      const res = await api.put(`/admin/users/${userId}/warn`, { message });
      if (res.status === 200) {
        return { success: true, message: 'Warning sent' };
      }
      return { success: false, message: 'Failed to send warning' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      if (res.status === 200) {
        return { success: true, message: 'Password changed' };
      }
      return { success: false, message: 'Failed to change password' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    try {
      const res = await api.post('/auth/send-otp', { phone });
      if (res.status === 200) {
        return { success: true, message: res.data.message };
      }
      return { success: false, message: 'Failed to send OTP' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    try {
      const res = await api.post('/auth/verify-otp', { phone, code });
      if (res.status === 200) {
        return { success: true, message: res.data.message, verified: true };
      }
      return { success: false, message: 'Failed to verify OTP' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }, []);

  const resetPassword = useCallback(async (phone: string, code: string, newPassword: string, confirmPassword: string) => {
    try {
      const res = await api.post('/auth/reset-password', { phone, code, newPassword, confirmPassword });
      if (res.status === 200) {
        return { success: true, message: res.data.message };
      }
      return { success: false, message: 'Failed to reset password' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }, []);

  const addNotification = useCallback((notif: any) => {
    setNotifications(prev => [notif, ...prev]);
  }, []);

  const markNotificationRead = useCallback(async (notifId: string) => {
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  /**
   * ✅ NEW: Initialize auth on app startup
   * - Check for existing session
   * - Try to refresh token if available
   * - Fetch user profile
   */
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        
        // ✅ NEW: Restore user from localStorage if available
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
        
        // If we have a token, set it in axios
        if (token) {
          setToken(token);
          
          // ✅ NEW: Try to refresh token if near expiration
          if (refreshToken) {
            try {
              await refreshAccessToken();
            } catch (error) {
              console.log('Token refresh on init failed, trying to fetch profile...');
            }
          }
          
          // Try to fetch user profile to verify session is still valid
          try {
            const res = await api.get('/auth/me');
            setUser(res.data.user);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
            
            // ✅ NEW: Setup token refresh timer if login was successful
            setupTokenRefresh();
            
            // Fetch all users only if authenticated
            try {
              const usersRes = await api.get('/users');
              const userList = usersRes.data.users || usersRes.data;
              setUsers(Array.isArray(userList) ? userList : []);
            } catch (error) {
              console.error('Failed to fetch users:', error);
              setUsers([]);
            }
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
            
            // Clear invalid session
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            setToken(null);
            setUser(null);
            setAuthError('Session expired. Please login again.');
            setUsers([]);  
        }
        } else {
          // No auth token - don't fetch protected endpoints
          setUsers([])
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // ✅ NEW: Cleanup on unmount
    return () => {
      clearTokenRefresh();
    };
  }, [setupTokenRefresh, refreshAccessToken, clearTokenRefresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        notifications,
        isAuthenticated: !!user,
        isLoading,
        authError,
        isRefreshingToken,
        login,
        register,
        logout,
        updateUser,
        deleteUser,
        warnUser,
        changePassword,
        sendOtp,
        verifyOtp,
        resetPassword,
        addNotification,
        markNotificationRead,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
