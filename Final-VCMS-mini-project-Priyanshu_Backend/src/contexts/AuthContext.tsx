import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect 
} from "react";
import api, { setToken } from '../services/api';

// ─── Shared Types ────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'doctor' | 'patient';

export interface User {
  _id: string;
  id?: string; // alias — some legacy code uses .id
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  specialization?: string;
  qualifications?: string[];
  bio?: string;
  location?: string;
  profileImage?: string;
  avatar?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
  accountStatus?: 'active' | 'suspended' | 'locked';
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'admin-warning';
  isRead: boolean;
  read?: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'doctor' | 'patient';
  specialization?: string;
}

export interface AuthContextType {
  user: User | null;
  users: User[];
  notifications: Notification[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: User }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (userId: string, updates: Record<string, any>) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  warnUser: (userId: string, message: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  sendOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  addNotification: (notification: Partial<Notification>) => void;
  markNotificationRead: (notifId: string) => Promise<void>;
}
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const login = useCallback(async (email: string, password: string) => {
  try {
    const res = await api.post('/auth/login', { email, password });
    const result = res.data;
    if (!res || res.status !== 200) return { success: false, message: result.message };

    setToken(result.token);
    setUser(result.user);

    return { success: true, message: 'Login successful', user: result.user };

  
  } catch (error: any) {
    console.error("Frontend login error:", error);
    
    // Check for validation errors
    if (error.response?.data?.errors && error.response.data.errors.length > 0) {
      const validationMsg = error.response.data.errors[0]?.msg || "Invalid input";
      return { success: false, message: validationMsg };
    }
    
    // Check for server error message
    if (error.response?.data?.message) {
      return { success: false, message: error.response.data.message };
    }
    
    // Default fallback
    return { success: false, message: "Email or password is incorrect" };
  }
}, []);


  const register = useCallback(async (data: RegisterData) => {
    try {
      const res = await api.post('/auth/register', data);
      if (res.status === 201) return { success: true, message: 'Registration successful' };
      return { success: false, message: res.data?.message || 'Registration failed' };
    } catch (error: any) {
      console.error("Register error details:", error.response?.data);
      const errorMsg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || "Server error";
      return { success: false, message: errorMsg };
    }
  }, []);

  const logout = useCallback(() => {
    // Clear auth token and user state
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (userId: string, updates: Record<string, any>) => {
    try {
      const res = await api.put(`/users/${userId}`, updates);
      if (res.status === 200) {
        setUser(res.data.user);
        return { success: true, message: 'Profile updated' };
      }
      return { success: false, message: 'Update failed' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
      return { success: false, message: msg };
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      if (res.status === 200) {
        setUsers(prev => prev.filter(u => u._id !== userId));
        return { success: true, message: 'User deleted' };
      }
      return { success: false, message: 'Deletion failed' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Server error';
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
      return { success: false, message: msg };
    }
  }, []);

  const addNotification = useCallback((notif: any) => {
    setNotifications(prev => [notif, ...prev]);
  }, []);

  const markNotificationRead = useCallback(async (notifId: string) => {
    try {
      await api.post(`/notifications/${notifId}/mark-read`, {});
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('authToken');
    if (t) {
      setToken(t);
      // try to fetch user profile
      api.get('/auth/me')
        .then(r => setUser(r.data.user))
        .catch(() => { /* ignore */ });
      // Fetch all users only if authenticated (admin endpoint)
      api.get('/admin/users')
        .then(r => {
          const userList = r.data.users || r.data;
          setUsers(Array.isArray(userList) ? userList : []);
        })
        .catch(() => setUsers([]));
    } else {
      // No auth token - don't fetch protected endpoints
      setUsers([]);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        notifications,
        isAuthenticated: !!user,
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
