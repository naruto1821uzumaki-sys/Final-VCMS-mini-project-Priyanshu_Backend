/**
 * Authentication Service
 * Handles user login, registration, token refresh, and session management
 * 
 * Usage:
 *   const result = await authService.login(email, password);
 *   if (result.success) {
 *     const { token, refreshToken, user } = result.data;
 *   }
 */

import api from './api';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: any;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: any;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const authService = {
  /**
   * Login user with email and password
   * @param email - User email
   * @param password - User password
   * @returns Login response with token, refresh token, and user data
   */
  login: async (email: string, password: string): Promise<AuthResponse<LoginResponse>> => {
    try {
      const res = await api.post('/auth/login', { email, password });
      return {
        success: true,
        message: 'Login successful',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  /**
   * Register new user
   * @param data - Registration data (email, password, name, phone, role, etc.)
   * @returns Registration response
   */
  register: async (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    role: 'patient' | 'doctor';
    specialization?: string;
    experience?: number;
    dateOfBirth?: string;
  }): Promise<AuthResponse<RegisterResponse>> => {
    try {
      const res = await api.post('/auth/register', data);
      return {
        success: true,
        message: 'Registration successful',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Valid refresh token
   * @returns New access token and refresh token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse<RefreshTokenResponse>> => {
    try {
      const res = await api.post('/auth/refresh-token', { refreshToken });
      return {
        success: true,
        message: 'Token refreshed',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Token refresh failed';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  /**
   * Get current user profile
   * @returns Current user profile
   */
  getProfile: async (): Promise<AuthResponse<any>> => {
    try {
      const res = await api.get('/auth/me');
      return {
        success: true,
        message: 'Profile fetched',
        data: res.data.user,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch profile';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  /**
   * Logout user
   * @returns Logout confirmation
   */
  logout: async (): Promise<AuthResponse<any>> => {
    try {
      const res = await api.post('/auth/logout');
      return {
        success: true,
        message: 'Logout successful',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Logout failed';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  /**
   * Change user password
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns Password change confirmation
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<AuthResponse<any>> => {
    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      return {
        success: true,
        message: res.data?.message || 'Password changed successfully',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to change password';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  /**
   * Request OTP for password reset
   * @param phone - User phone number
   * @returns OTP request confirmation
   */
  sendOtp: async (phone: string): Promise<AuthResponse<any>> => {
    try {
      const res = await api.post('/auth/send-otp', { phone });
      return {
        success: true,
        message: res.data?.message || 'OTP sent successfully',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to send OTP';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  /**
   * Verify OTP code
   * @param phone - User phone number
   * @param code - OTP code
   * @returns OTP verification confirmation
   */
  verifyOtp: async (phone: string, code: string): Promise<AuthResponse<any>> => {
    try {
      const res = await api.post('/auth/verify-otp', { phone, code });
      return {
        success: true,
        message: res.data?.message || 'OTP verified successfully',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to verify OTP';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  /**
   * Reset password using OTP
   * @param phone - User phone number
   * @param code - OTP code
   * @param newPassword - New password
   * @param confirmPassword - Password confirmation
   * @returns Password reset confirmation
   */
  resetPassword: async (
    phone: string,
    code: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<AuthResponse<any>> => {
    try {
      const res = await api.post('/auth/reset-password', {
        phone,
        code,
        newPassword,
        confirmPassword,
      });
      return {
        success: true,
        message: res.data?.message || 'Password reset successfully',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to reset password';
      return {
        success: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },
};

export default authService;
