/**
 * Admin Service
 * Handles administrative operations (dashboard, user management, reporting)
 * 
 * Usage:
 *   const stats = await adminService.getDashboardStats();
 *   const users = await adminService.getUsers();
 */

import api from './api';

export interface DashboardStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  pendingDoctors: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  appointmentsToday: number;
  totalPrescriptions: number;
  activeConsultations: number;
  systemHealth: {
    uptime: number;
    responseTime: number;
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Admin management service
 */
export const adminService = {
  /**
   * Get dashboard statistics
   * @returns Dashboard stats
   */
  getDashboardStats: async (): Promise<ServiceResponse<DashboardStats>> => {
    try {
      const res = await api.get('/admin/dashboard-stats');
      return {
        success: true,
        message: 'Dashboard stats fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch dashboard stats',
        error: error.message,
      };
    }
  },

  /**
   * Get all users with pagination and filtering
   * @param page - Page number
   * @param limit - Results per page
   * @param role - Filter by role
   * @param search - Search query
   * @returns Paginated users
   */
  getUsers: async (
    page = 1,
    limit = 10,
    role?: string,
    search?: string
  ): Promise<ServiceResponse<{ users: any[]; total: number }>> => {
    try {
      const res = await api.get('/admin/users', { params: { page, limit, role, search } });
      return {
        success: true,
        message: 'Users fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch users',
        error: error.message,
      };
    }
  },

  /**
   * Get all appointments with filtering
   * @param page - Page number
   * @param limit - Results per page
   * @param status - Filter by status
   * @returns Paginated appointments
   */
  getAppointments: async (
    page = 1,
    limit = 10,
    status?: string
  ): Promise<ServiceResponse<{ appointments: any[]; total: number }>> => {
    try {
      const res = await api.get('/admin/appointments', { params: { page, limit, status } });
      return {
        success: true,
        message: 'Appointments fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch appointments',
        error: error.message,
      };
    }
  },

  /**
   * Change user role
   * @param userId - User ID
   * @param role - New role
   * @returns Updated user
   */
  changeUserRole: async (userId: string, role: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { role });
      return {
        success: true,
        message: 'User role changed',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change role',
        error: error.message,
      };
    }
  },

  /**
   * Approve doctor
   * @param doctorId - Doctor ID
   * @returns Updated doctor
   */
  approveDoctor: async (doctorId: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.post(`/admin/doctors/${doctorId}/approve`);
      return {
        success: true,
        message: 'Doctor approved',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to approve doctor',
        error: error.message,
      };
    }
  },

  /**
   * Reject doctor
   * @param doctorId - Doctor ID
   * @param reason - Rejection reason
   * @returns Updated doctor
   */
  rejectDoctor: async (doctorId: string, reason: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.post(`/admin/doctors/${doctorId}/reject`, { reason });
      return {
        success: true,
        message: 'Doctor rejected',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reject doctor',
        error: error.message,
      };
    }
  },

  /**
   * Get system reports
   * @param startDate - Start date (optional)
   * @param endDate - End date (optional)
   * @param doctorId - Filter by doctor (optional)
   * @returns Formatted reports
   */
  getReports: async (
    startDate?: string,
    endDate?: string,
    doctorId?: string
  ): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.get('/admin/reports', {
        params: { startDate, endDate, doctorId },
      });
      return {
        success: true,
        message: 'Reports fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch reports',
        error: error.message,
      };
    }
  },

  /**
   * Suspend user account
   * @param userId - User ID
   * @param reason - Suspension reason
   * @returns Updated user
   */
  suspendUser: async (userId: string, reason: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.put(`/admin/users/${userId}/suspend`, { reason });
      return {
        success: true,
        message: 'User suspended',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to suspend user',
        error: error.message,
      };
    }
  },

  /**
   * Unlock user account
   * @param userId - User ID
   * @returns Updated user
   */
  unlockUser: async (userId: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.put(`/admin/users/${userId}/unlock`);
      return {
        success: true,
        message: 'User unlocked',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to unlock user',
        error: error.message,
      };
    }
  },

  /**
   * Get audit logs
   * @param page - Page number
   * @param limit - Results per page
   * @param userId - Filter by user (optional)
   * @returns Paginated audit logs
   */
  getAuditLogs: async (
    page = 1,
    limit = 10,
    userId?: string
  ): Promise<ServiceResponse<{ logs: any[]; total: number }>> => {
    try {
      const res = await api.get('/admin/audit-logs', {
        params: { page, limit, userId },
      });
      return {
        success: true,
        message: 'Audit logs fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch logs',
        error: error.message,
      };
    }
  },

  /**
   * Export user data (GDPR compliance)
   * @param userId - User ID
   * @returns User data export
   */
  exportUserData: async (userId: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.get(`/admin/users/${userId}/export`, {
        responseType: 'blob',
      });
      return {
        success: true,
        message: 'Data exported',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to export data',
        error: error.message,
      };
    }
  },

  /**
   * Send system notification to all users
   * @param title - Notification title
   * @param message - Notification message
   * @param type - Notification type
   * @returns Sent count
   */
  sendSystemNotification: async (
    title: string,
    message: string,
    type: string = 'info'
  ): Promise<ServiceResponse<{ sentCount: number }>> => {
    try {
      const res = await api.post('/admin/notifications/broadcast', {
        title,
        message,
        type,
      });
      return {
        success: true,
        message: 'Notification sent',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send notification',
        error: error.message,
      };
    }
  },
};

export default adminService;
