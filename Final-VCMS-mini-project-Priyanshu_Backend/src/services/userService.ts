/**
 * User Service
 * Handles user management operations (profile updates, role management, etc.)
 * 
 * Usage:
 *   const user = await userService.getUserById(userId);
 *   await userService.updateProfile(userId, { name: 'New Name' });
 */

import api from './api';

export interface User {
  _id: string;
  email: string;
  name: string;
  phone: string;
  role: 'admin' | 'doctor' | 'patient';
  avatar?: string;
  specialization?: string;
  qualifications?: string[];
  bio?: string;
  location?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  accountStatus?: 'active' | 'suspended' | 'locked';
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
 * User management service with CRUD operations
 */
export const userService = {
  /**
   * Get all users with pagination and filtering
   * @param page - Page number (1-indexed)
   * @param limit - Results per page
   * @param role - Filter by role (optional)
   * @param search - Search by name or email (optional)
   * @returns Paginated user list
   */
  getAllUsers: async (
    page = 1,
    limit = 10,
    role?: string,
    search?: string
  ): Promise<ServiceResponse<{ users: User[]; total: number }>> => {
    try {
      const res = await api.get('/users', { params: { page, limit, role, search } });
      return {
        success: true,
        message: 'Users fetched successfully',
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
   * Get user by ID
   * @param id - User ID
   * @returns User details
   */
  getUserById: async (id: string): Promise<ServiceResponse<User>> => {
    try {
      const res = await api.get(`/users/${id}`);
      return {
        success: true,
        message: 'User fetched successfully',
        data: res.data.user || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch user',
        error: error.message,
      };
    }
  },

  /**
   * Get all doctors with filtering
   * @param page - Page number
   * @param limit - Results per page
   * @param specialization - Filter by specialization (optional)
   * @param search - Search query (optional)
   * @returns List of doctors
   */
  getDoctors: async (
    page = 1,
    limit = 10,
    specialization?: string,
    search?: string
  ): Promise<ServiceResponse<{ doctors: User[]; total: number }>> => {
    try {
      const res = await api.get('/users/doctors', {
        params: { page, limit, specialization, search },
      });
      return {
        success: true,
        message: 'Doctors fetched successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch doctors',
        error: error.message,
      };
    }
  },

  /**
   * Get all patients with pagination
   * @param page - Page number
   * @param limit - Results per page
   * @param search - Search query (optional)
   * @returns List of patients
   */
  getPatients: async (
    page = 1,
    limit = 10,
    search?: string
  ): Promise<ServiceResponse<{ patients: User[]; total: number }>> => {
    try {
      const res = await api.get('/users/patients', { params: { page, limit, search } });
      return {
        success: true,
        message: 'Patients fetched successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch patients',
        error: error.message,
      };
    }
  },

  /**
   * Update user profile
   * @param id - User ID
   * @param updates - Fields to update
   * @returns Updated user
   */
  updateProfile: async (id: string, updates: Partial<User>): Promise<ServiceResponse<User>> => {
    try {
      const res = await api.put(`/users/${id}`, updates);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: res.data.user || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile',
        error: error.message,
      };
    }
  },

  /**
   * Delete user account
   * @param id - User ID
   * @returns Deletion confirmation
   */
  deleteUser: async (id: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.delete(`/users/${id}`);
      return {
        success: true,
        message: 'User deleted successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete user',
        error: error.message,
      };
    }
  },

  /**
   * Toggle user account status (active/suspended)
   * @param id - User ID
   * @returns Updated user
   */
  toggleUserStatus: async (id: string): Promise<ServiceResponse<User>> => {
    try {
      const res = await api.put(`/users/${id}/toggle-status`);
      return {
        success: true,
        message: 'User status toggled successfully',
        data: res.data.user || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to toggle status',
        error: error.message,
      };
    }
  },

  /**
   * Send warning to user
   * @param userId - User ID
   * @param message - Warning message
   * @returns Warning confirmation
   */
  warnUser: async (userId: string, message: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.put(`/admin/users/${userId}/warn`, { message });
      return {
        success: true,
        message: 'Warning sent successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send warning',
        error: error.message,
      };
    }
  },

  /**
   * Search users by name or email
   * @param query - Search query
   * @param role - Filter by role (optional)
   * @returns Matching users
   */
  searchUsers: async (
    query: string,
    role?: string
  ): Promise<ServiceResponse<{ users: User[] }>> => {
    try {
      const res = await api.get('/users', { params: { search: query, role } });
      return {
        success: true,
        message: 'Search completed',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Search failed',
        error: error.message,
      };
    }
  },
};

export default userService;
