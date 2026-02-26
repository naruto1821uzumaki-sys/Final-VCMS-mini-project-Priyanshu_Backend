import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import api, { setToken } from "../services/api";
import { socketService } from "../services/socketService";
import { offlineStorage } from "../services/offlineStorage";

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "doctor" | "patient";
  phone?: string;
  avatar?: string;
  specialization?: string;
  qualifications?: string[];
  bio?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
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
  // State
  user: User | null;
  users: User[];
  notifications: Notification[];
  isAuthenticated: boolean;
  isOnline: boolean;
  syncStatus: "synced" | "syncing" | "offline" | "error";

  // Authentication
  login: (email: string, password: string) => Promise<{
    success: boolean;
    message: string;
    user?: User;
  }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;

  // User Management
  updateUser: (id: string, userData: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{
    success: boolean;
    message: string;
  }>;

  // Notifications
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Sync & Offline
  syncData: () => Promise<void>;
  getOfflineData: () => any;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core state
  const [user, setUser] = useState<User | null>(() => {
    // Restore from offline storage
    return offlineStorage.get<User>("auth_user");
  });

  const [users, setUsers] = useState<User[]>(() => {
    return offlineStorage.get<User[]>("auth_users", []);
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    return offlineStorage.get<Notification[]>("notifications", []);
  });

  // Sync state
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">(
    isOnline ? "synced" : "offline"
  );

  // Refs for debouncing
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const syncLockedRef = useRef(false);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log("✅ Online");
      setIsOnline(true);
      setSyncStatus("syncing");
      syncData();
    };

    const handleOffline = () => {
      console.log("❌ Offline");
      setIsOnline(false);
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initialize Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && isOnline) {
      socketService.initialize(token);

      socketService.on("socket:authenticated", () => {
        console.log("✅ Socket authenticated");
        setSyncStatus("synced");
      });

      socketService.on("socket:disconnected", () => {
        console.log("❌ Socket disconnected");
        setSyncStatus("offline");
      });

      socketService.on("notification:new", (notification: Notification) => {
        addNotification(notification);
      });

      socketService.on("user:updated", (updatedUser: User) => {
        if (user?.id === updatedUser.id) {
          setUser(updatedUser);
          offlineStorage.set("auth_user", updatedUser);
        }
        setUsers((prev) =>
          prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
      });
    }

    return () => {
      socketService.cleanup();
    };
  }, [isOnline, user?.id]);

  // Persist state to offline storage
  useEffect(() => {
    if (user) {
      offlineStorage.set("auth_user", user);
    }
  }, [user]);

  useEffect(() => {
    offlineStorage.set("auth_users", users);
  }, [users]);

  useEffect(() => {
    offlineStorage.set("notifications", notifications);
  }, [notifications]);

  // Login function
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setSyncStatus("syncing");
        const res = await api.post("/auth/login", { email, password });

        const result = res.data;
        if (!res || res.status !== 200) {
          return { success: false, message: result.message };
        }

        // Save token
        const token = result.token;
        localStorage.setItem("token", token);
        setToken(token);

        // Initialize Socket.io with token
        socketService.initialize(token);

        // Update user
        setUser(result.user);
        setSyncStatus("synced");

        return { success: true, message: "Login successful", user: result.user };
      } catch (error: any) {
        console.error("Login error:", error);
        setSyncStatus("error");

        if (error.response?.data?.errors?.[0]?.msg) {
          return { success: false, message: error.response.data.errors[0].msg };
        }

        if (error.response?.data?.message) {
          return { success: false, message: error.response.data.message };
        }

        return { success: false, message: "Email or password is incorrect" };
      }
    },
    []
  );

  // Register function
  const register = useCallback(async (data: RegisterData) => {
    try {
      setSyncStatus("syncing");
      const res = await api.post("/auth/register", data);

      if (res.status === 201) {
        setSyncStatus("synced");
        return { success: true, message: "Registration successful" };
      }

      return { success: false, message: res.data?.message || "Registration failed" };
    } catch (error: any) {
      console.error("Register error:", error);
      setSyncStatus("error");

      const errorMsg =
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.message ||
        "Server error";

      return { success: false, message: errorMsg };
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setUsers([]);
    setNotifications([]);
    offlineStorage.clear();
    socketService.disconnect();
    setSyncStatus("offline");
  }, []);

  // Update user function
  const updateUser = useCallback(async (id: string, userData: Partial<User>) => {
    try {
      setSyncStatus("syncing");
      const res = await api.put(`/users/${id}`, userData);

      if (res.status === 200) {
        const updatedUser = res.data.user;

        if (user?.id === id) {
          setUser(updatedUser);
        }

        setUsers((prev) =>
          prev.map((u) => (u.id === id ? updatedUser : u))
        );

        // Emit via socket for real-time sync
        socketService.emit("user:update", { id, userData });

        setSyncStatus("synced");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Update user error:", error);
      setSyncStatus("error");
      return false;
    }
  }, [user?.id]);

  // Delete user function
  const deleteUser = useCallback(async (id: string) => {
    try {
      setSyncStatus("syncing");
      const res = await api.delete(`/users/${id}`);

      if (res.status === 200) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        socketService.emit("user:deleted", { id });
        setSyncStatus("synced");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Delete user error:", error);
      setSyncStatus("error");
      return false;
    }
  }, []);

  // Change password function
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        setSyncStatus("syncing");
        const res = await api.post("/auth/change-password", {
          currentPassword,
          newPassword,
        });

        if (res.status === 200) {
          setSyncStatus("synced");
          return { success: true, message: "Password changed successfully" };
        }

        return { success: false, message: "Failed to change password" };
      } catch (error: any) {
        console.error("Change password error:", error);
        setSyncStatus("error");

        return {
          success: false,
          message: error.response?.data?.message || "Failed to change password",
        };
      }
    },
    []
  );

  // Add notification function
  const addNotification = useCallback((notification: Omit<Notification, "id" | "createdAt">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Emit via socket
    socketService.emit("notification:received", newNotification);
  }, []);

  // Mark notification read function
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Emit via socket
    socketService.emit("notification:read", { id });
  }, []);

  // Clear notifications function
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    socketService.emit("notifications:clear");
  }, []);

  // Sync data function
  const syncData = useCallback(async () => {
    if (syncLockedRef.current || !isOnline) {
      return;
    }

    syncLockedRef.current = true;
    setSyncStatus("syncing");

    try {
      // Fetch user if logged in
      if (localStorage.getItem("token")) {
        const userRes = await api.get("/auth/me").catch(() => null);
        if (userRes?.data?.user) {
          setUser(userRes.data.user);
        }

        // Fetch all users only if authenticated
        const usersRes = await api.get("/users").catch(() => null);
        if (usersRes?.data?.users) {
          setUsers(usersRes.data.users);
        } else if (usersRes?.data && Array.isArray(usersRes.data)) {
          setUsers(usersRes.data);
        }
      } else {
        // No auth token - don't fetch protected endpoints
        setUsers([]);
      }

      setSyncStatus("synced");
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus("error");
    } finally {
      syncLockedRef.current = false;
    }
  }, [isOnline]);

  // Debounced sync on change
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncData();
    }, 2000);
  }, [syncData]);

  // Get offline data
  const getOfflineData = useCallback(() => {
    return {
      user: offlineStorage.get("auth_user"),
      users: offlineStorage.get("auth_users", []),
      notifications: offlineStorage.get("notifications", []),
    };
  }, []);

  const value: AuthContextType = {
    user,
    users,
    notifications,
    isAuthenticated: !!user,
    isOnline,
    syncStatus,
    login,
    register,
    logout,
    updateUser,
    deleteUser,
    changePassword,
    addNotification,
    markNotificationRead,
    clearNotifications,
    syncData,
    getOfflineData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default AuthContext;
