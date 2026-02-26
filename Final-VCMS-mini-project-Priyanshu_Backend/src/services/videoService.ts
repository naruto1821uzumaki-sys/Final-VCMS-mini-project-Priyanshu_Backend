/**
 * Video Service
 * Handles video consultation management
 * 
 * Usage:
 *   const room = await videoService.createRoom(appointmentId);
 *   await videoService.startSession(roomId);
 */

import api from './api';

export interface VideoSession {
  _id: string;
  roomId: string;
  appointmentId: string;
  participants: Array<{
    userId: string;
    role: 'patient' | 'doctor';
    joinedAt: string;
    leftAt?: string;
  }>;
  status: 'waiting' | 'active' | 'ended';
  startTime?: string;
  endTime?: string;
  duration?: number;
  recording?: {
    available: boolean;
    url?: string;
    recordedAt?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Video consultation management service
 */
export const videoService = {
  /**
   * Create video room for appointment
   * @param appointmentId - Appointment ID
   * @returns Video room details
   */
  createRoom: async (appointmentId: string): Promise<ServiceResponse<VideoSession>> => {
    try {
      const res = await api.post('/video/create-room', { appointmentId });
      return {
        success: true,
        message: 'Video room created',
        data: res.data.room || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create room',
        error: error.message,
      };
    }
  },

  /**
   * Get video room by ID
   * @param roomId - Room ID
   * @returns Room details
   */
  getRoom: async (roomId: string): Promise<ServiceResponse<VideoSession>> => {
    try {
      const res = await api.get(`/video/room/${roomId}`);
      return {
        success: true,
        message: 'Room fetched',
        data: res.data.room || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch room',
        error: error.message,
      };
    }
  },

  /**
   * Get room by appointment ID
   * @param appointmentId - Appointment ID
   * @returns Room details
   */
  getRoomByAppointment: async (appointmentId: string): Promise<ServiceResponse<VideoSession>> => {
    try {
      const res = await api.get(`/video/appointment/${appointmentId}`);
      return {
        success: true,
        message: 'Room fetched',
        data: res.data.room || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch room',
        error: error.message,
      };
    }
  },

  /**
   * Start video session
   * @param roomId - Room ID
   * @returns Updated room
   */
  startSession: async (roomId: string): Promise<ServiceResponse<VideoSession>> => {
    try {
      const res = await api.put(`/video/room/${roomId}/status`, { status: 'active' });
      return {
        success: true,
        message: 'Session started',
        data: res.data.room || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to start session',
        error: error.message,
      };
    }
  },

  /**
   * Update room status
   * @param roomId - Room ID
   * @param status - New status
   * @returns Updated room
   */
  updateRoomStatus: async (
    roomId: string,
    status: 'waiting' | 'active' | 'ended'
  ): Promise<ServiceResponse<VideoSession>> => {
    try {
      const res = await api.put(`/video/room/${roomId}/status`, { status });
      return {
        success: true,
        message: 'Room status updated',
        data: res.data.room || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update status',
        error: error.message,
      };
    }
  },

  /**
   * End video session
   * @param roomId - Room ID
   * @returns Ended room
   */
  endSession: async (roomId: string): Promise<ServiceResponse<VideoSession>> => {
    try {
      const res = await api.put(`/video/room/${roomId}/status`, { status: 'ended' });
      return {
        success: true,
        message: 'Session ended',
        data: res.data.room || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to end session',
        error: error.message,
      };
    }
  },

  /**
   * Record participant join
   * @param roomId - Room ID
   * @param userId - User ID
   * @param role - Participant role
   * @returns Updated room
   */
  addParticipant: async (
    roomId: string,
    userId: string,
    role: 'patient' | 'doctor'
  ): Promise<ServiceResponse<VideoSession>> => {
    try {
      const res = await api.post(`/video/room/${roomId}/participants`, { userId, role });
      return {
        success: true,
        message: 'Participant added',
        data: res.data.room || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add participant',
        error: error.message,
      };
    }
  },

  /**
   * Record participant leave
   * @param roomId - Room ID
   * @param userId - User ID
   * @returns Updated room
   */
  removeParticipant: async (roomId: string, userId: string): Promise<ServiceResponse<VideoSession>> => {
    try {
      const res = await api.delete(`/video/room/${roomId}/participants/${userId}`);
      return {
        success: true,
        message: 'Participant removed',
        data: res.data.room || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove participant',
        error: error.message,
      };
    }
  },

  /**
   * Get recording for session
   * @param roomId - Room ID
   * @returns Recording details
   */
  getRecording: async (roomId: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.get(`/video/room/${roomId}/recording`);
      return {
        success: true,
        message: 'Recording fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch recording',
        error: error.message,
      };
    }
  },

  /**
   * Download session recording
   * @param roomId - Room ID
   * @returns Recording blob
   */
  downloadRecording: async (roomId: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.get(`/video/room/${roomId}/recording/download`, {
        responseType: 'blob',
      });
      return {
        success: true,
        message: 'Recording downloaded',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to download recording',
        error: error.message,
      };
    }
  },

  /**
   * Get session history for user
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Results per page
   * @returns User's video sessions
   */
  getUserSessions: async (
    userId: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ sessions: VideoSession[]; total: number }>> => {
    try {
      const res = await api.get(`/video/user/${userId}/sessions`, {
        params: { page, limit },
      });
      return {
        success: true,
        message: 'Sessions fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch sessions',
        error: error.message,
      };
    }
  },

  /**
   * Generate video room token for WebRTC
   * @param roomId - Room ID
   * @param userId - User ID
   * @returns Access token
   */
  generateToken: async (roomId: string, userId: string): Promise<ServiceResponse<{ token: string }>> => {
    try {
      const res = await api.post(`/video/room/${roomId}/token`, { userId });
      return {
        success: true,
        message: 'Token generated',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate token',
        error: error.message,
      };
    }
  },

  /**
   * Send message in video room
   * @param roomId - Room ID
   * @param message - Message content
   * @returns Sent message
   */
  sendMessage: async (
    roomId: string,
    message: string
  ): Promise<ServiceResponse<{ messageId: string; timestamp: string }>> => {
    try {
      const res = await api.post(`/video/room/${roomId}/messages`, { message });
      return {
        success: true,
        message: 'Message sent',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send message',
        error: error.message,
      };
    }
  },

  /**
   * Get video room configuration
   * @param roomId - Room ID
   * @returns Configuration for video client
   */
  getConfiguration: async (roomId: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.get(`/video/configuration/${roomId}`);
      return {
        success: true,
        message: 'Configuration fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch configuration',
        error: error.message,
      };
    }
  },
};

export default videoService;
