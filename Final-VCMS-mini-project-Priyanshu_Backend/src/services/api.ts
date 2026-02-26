import axios, { AxiosInstance } from 'axios';
import io, { Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let token: string | null = null;
let socket: Socket | null = null;

// Set auth token for subsequent requests
export const setToken = (t: string | null) => {
  token = t;
  if (t) {
    localStorage.setItem('authToken', t);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Get token from localStorage on init
export const getToken = () => {
  return token || localStorage.getItem('authToken');
};

// Create axios instance with interceptors
const createInstance = (): AxiosInstance => {
  const inst = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  inst.interceptors.request.use((config) => {
    const authToken = getToken();
    if (authToken && config.headers) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    return config;
  });

  inst.interceptors.response.use(
    (response) => response,
    (error) => {
      // Only redirect on 401 if we're not already on login/register page
      if (error.response?.status === 401 && !['/login', '/register'].includes(window.location.pathname)) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return inst;
};

const api = createInstance();

// ===== SOCKET.IO SETUP =====
export const initSocket = (userId: string) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: {
        token: getToken(),
      },
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
      socket?.emit('user-connected', userId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
  }
  return socket;
};

export const getSocket = () => socket;

// ===== AUTH SERVICES =====
export const authService = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/update-profile', data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

// ===== USER SERVICES =====
export const userService = {
  getAllUsers: (page = 1, limit = 10, role?: string, search?: string) =>
    api.get('/users', { params: { page, limit, role, search } }),
  getDoctors: (page = 1, limit = 10, specialization?: string, search?: string) =>
    api.get('/users/doctors', { params: { page, limit, specialization, search } }),
  getPatients: (page = 1, limit = 10, search?: string) =>
    api.get('/users/patients', { params: { page, limit, search } }),
  getUserById: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  toggleUserStatus: (id: string) => api.put(`/users/${id}/toggle-status`),
};

// ===== APPOINTMENT SERVICES =====
export const appointmentService = {
  createAppointment: (data: any) => api.post('/appointments', data),
  getAppointments: (page = 1, limit = 10, status?: string) =>
    api.get('/appointments', { params: { page, limit, status } }),
  getTodayAppointments: () => api.get('/appointments/today'),
  getAppointmentById: (id: string) => api.get(`/appointments/${id}`),
  updateAppointment: (id: string, data: any) =>
    api.put(`/appointments/${id}`, data),
  updateAppointmentStatus: (id: string, status: string) =>
    api.put(`/appointments/${id}/status`, { status }),
  deleteAppointment: (id: string) => api.delete(`/appointments/${id}`),
};

// ===== PRESCRIPTION SERVICES =====
export const prescriptionService = {
  createPrescription: (data: any) => api.post('/prescriptions', data),
  getPatientPrescriptions: (patientId: string, page = 1, limit = 10) =>
    api.get(`/prescriptions/patient/${patientId}`, { params: { page, limit } }),
  getPrescriptionByAppointment: (appointmentId: string) =>
    api.get(`/prescriptions/appointment/${appointmentId}`),
  getPrescriptionById: (id: string) => api.get(`/prescriptions/${id}`),
  updatePrescription: (id: string, data: any) =>
    api.put(`/prescriptions/${id}`, data),
};

// ===== MEDICAL HISTORY SERVICES =====
export const medicalHistoryService = {
  createRecord: (data: any) => api.post('/medical-history', data),
  getPatientHistory: (patientId: string, page = 1, limit = 10) =>
    api.get(`/medical-history/patient/${patientId}`, { params: { page, limit } }),
  getRecordById: (id: string) => api.get(`/medical-history/${id}`),
  updateRecord: (id: string, data: any) =>
    api.put(`/medical-history/${id}`, data),
  deleteRecord: (id: string) => api.delete(`/medical-history/${id}`),
};

// ===== NOTIFICATION SERVICES =====
export const notificationService = {
  getNotifications: (page = 1, limit = 10, isRead?: boolean) =>
    api.get('/notifications', { params: { page, limit, isRead } }),
  createNotification: (data: any) => api.post('/notifications', data),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};

// ===== CHATBOT SERVICES =====
export const chatbotService = {
  sendMessage: (message: string, sessionId?: string) =>
    api.post('/chat/message', { message, sessionId }),
  getChatHistory: (sessionId?: string) =>
    api.get('/chat/history', { params: { sessionId } }),
  getChatSessions: () => api.get('/chat/sessions'),
};

// ===== VIDEO CONSULTATION SERVICES =====
export const videoService = {
  createRoom: (appointmentId: string) =>
    api.post('/video/create-room', { appointmentId }),
  getRoom: (roomId: string) => api.get(`/video/room/${roomId}`),
  updateRoomStatus: (roomId: string, status: 'waiting' | 'active' | 'ended') =>
    api.put(`/video/room/${roomId}/status`, { status }),
  getRoomByAppointment: (appointmentId: string) =>
    api.get(`/video/appointment/${appointmentId}`),
};

// ===== ADMIN SERVICES =====
export const adminService = {
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getUsers: (page = 1, limit = 10, role?: string, search?: string) =>
    api.get('/admin/users', { params: { page, limit, role, search } }),
  getAppointments: (page = 1, limit = 10, status?: string) =>
    api.get('/admin/appointments', { params: { page, limit, status } }),
  changeUserRole: (userId: string, role: string) =>
    api.put(`/admin/users/${userId}/role`, { role }),
  getReports: (startDate?: string, endDate?: string, doctorId?: string) =>
    api.get('/admin/reports', { params: { startDate, endDate, doctorId } }),
};

// ===== SOCKET EVENT HANDLERS =====
export const socketEvents = {
  joinRoom: (roomId: string, userId: string) => {
    if (socket) {
      socket.emit('join-room', { roomId, userId });
    }
  },
  leaveRoom: (roomId: string, userId: string) => {
    if (socket) {
      socket.emit('leave-room', { roomId, userId });
    }
  },
  sendOffer: (offer: any, targetSocketId: string) => {
    if (socket) {
      socket.emit('offer', { ...offer, targetSocketId });
    }
  },
  sendAnswer: (answer: any, targetSocketId: string) => {
    if (socket) {
      socket.emit('answer', { ...answer, targetSocketId });
    }
  },
  sendICECandidate: (candidate: any, targetSocketId: string) => {
    if (socket) {
      socket.emit('ice-candidate', { candidate, targetSocketId });
    }
  },
  sendChatMessage: (message: any, roomId?: string) => {
    if (socket) {
      socket.emit('chat-message', { ...message, roomId });
    }
  },
  sendNotification: (userId: string, notification: any) => {
    if (socket) {
      socket.emit('notification', { to: userId, ...notification });
    }
  },
  onOffer: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('offer', callback);
    }
  },
  onAnswer: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('answer', callback);
    }
  },
  onICECandidate: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('ice-candidate', callback);
    }
  },
  onChatMessage: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('chat-message', callback);
    }
  },
  onNotification: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('notification', callback);
    }
  },
  onUserJoined: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('user-joined', callback);
    }
  },
  onUserLeft: (callback: (data: any) => void) => {
    if (socket) {
      socket.on('user-left', callback);
    }
  },
};
export default api;
