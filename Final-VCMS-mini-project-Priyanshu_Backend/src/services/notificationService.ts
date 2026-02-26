/**
 * Notification Service
 * Handles notification management and real-time updates
 * 
 * Usage:
 *   const notifications = await notificationService.getNotifications();
 *   await notificationService.markAsRead(notificationId);
 */

import api from './api';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'prescription' | 'message' | 'warning' | 'info';
  priority?: 'low' | 'normal' | 'high';
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  actions?: Array<{
    label: string;
    url: string;
    action: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Notification management service
 */
export const notificationService = {
  /**
   * Get all notifications for user
   * @param page - Page number
   * @param limit - Results per page
   * @param isRead - Filter by read status (optional)
   * @returns Paginated notifications
   */
  getNotifications: async (
    page = 1,
    limit = 10,
    isRead?: boolean
  ): Promise<ServiceResponse<{ notifications: Notification[]; total: number; unreadCount: number }>> => {
    try {
      const res = await api.get('/notifications', { params: { page, limit, isRead } });
      return {
        success: true,
        message: 'Notifications fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notifications',
        error: error.message,
      };
    }
  },

  /**
   * Get unread notifications only
   * @param limit - Max results
   * @returns Unread notifications
   */
  getUnreadNotifications: async (
    limit = 10
  ): Promise<ServiceResponse<Notification[]>> => {
    try {
      const res = await api.get('/notifications', { params: { isRead: false, limit } });
      return {
        success: true,
        message: 'Unread notifications fetched',
        data: res.data.notifications || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notifications',
        error: error.message,
      };
    }
  },

  /**
   * Mark notification as read
   * @param id - Notification ID
   * @returns Updated notification
   */
  markAsRead: async (id: string): Promise<ServiceResponse<Notification>> => {
    try {
      const res = await api.post(`/notifications/${id}/mark-read`, {});
      return {
        success: true,
        message: 'Notification marked as read',
        data: res.data.notification || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark as read',
        error: error.message,
      };
    }
  },

  /**
   * Mark all notifications as read
   * @returns Updated count
   */
  markAllAsRead: async (): Promise<ServiceResponse<{ markedCount: number }>> => {
    try {
      const res = await api.post('/notifications/mark-all-read', {});
      return {
        success: true,
        message: 'All notifications marked as read',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark all as read',
        error: error.message,
      };
    }
  },

  /**
   * Delete notification
   * @param id - Notification ID
   * @returns Deletion confirmation
   */
  deleteNotification: async (id: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.delete(`/notifications/${id}`);
      return {
        success: true,
        message: 'Notification deleted',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete notification',
        error: error.message,
      };
    }
  },

  /**
   * Delete all notifications
   * @returns Deletion confirmation
   */
  deleteAllNotifications: async (): Promise<ServiceResponse<{ deletedCount: number }>> => {
    try {
      const res = await api.delete('/notifications');
      return {
        success: true,
        message: 'All notifications deleted',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete notifications',
        error: error.message,
      };
    }
  },

  /**
   * Get notifications by type
   * @param type - Notification type
   * @param page - Page number
   * @param limit - Results per page
   * @returns Filtered notifications
   */
  getNotificationsByType: async (
    type: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ notifications: Notification[]; total: number }>> => {
    try {
      const res = await api.get('/notifications', { params: { page, limit, type } });
      return {
        success: true,
        message: 'Notifications fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notifications',
        error: error.message,
      };
    }
  },

  /**
   * Create notification (admin only)
   * @param notificationData - Notification details
   * @returns Created notification
   */
  createNotification: async (
    notificationData: Partial<Notification>
  ): Promise<ServiceResponse<Notification>> => {
    try {
      const res = await api.post('/notifications', notificationData);
      return {
        success: true,
        message: 'Notification created',
        data: res.data.notification || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create notification',
        error: error.message,
      };
    }
  },

  /**
   * Get notification by ID
   * @param id - Notification ID
   * @returns Notification details
   */
  getNotificationById: async (id: string): Promise<ServiceResponse<Notification>> => {
    try {
      const res = await api.get(`/notifications/${id}`);
      return {
        success: true,
        message: 'Notification fetched',
        data: res.data.notification || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notification',
        error: error.message,
      };
    }
  },

  /**
   * Get notification count summary
   * @returns Count by type and read status
   */
  getNotificationSummary: async (): Promise<ServiceResponse<{
    total: number;
    unread: number;
    byType: Record<string, number>;
  }>> => {
    try {
      const res = await api.get('/notifications/summary');
      return {
        success: true,
        message: 'Summary fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch summary',
        error: error.message,
      };
    }
  },

  /**
   * Clear old notifications (admin)
   * @param daysOld - Delete notifications older than this many days
   * @returns Deleted count
   */
  clearOldNotifications: async (daysOld = 30): Promise<ServiceResponse<{ deletedCount: number }>> => {
    try {
      const res = await api.delete('/notifications/clear-old', {
        params: { daysOld },
      });
      return {
        success: true,
        message: 'Old notifications cleared',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to clear notifications',
        error: error.message,
      };
    }
  },
};

export default notificationService;
