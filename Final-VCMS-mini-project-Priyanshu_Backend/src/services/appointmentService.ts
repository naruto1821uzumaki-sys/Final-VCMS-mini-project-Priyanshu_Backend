/**
 * Appointment Service
 * Handles appointment management (booking, status updates, cancellation, etc.)
 * 
 * Usage:
 *   const appointment = await appointmentService.createAppointment({
 *     patientId, doctorId, startTime, ...
 *   });
 *   await appointmentService.updateStatus(appointmentId, 'confirmed');
 */

import api from './api';

export interface Appointment {
  _id: string;
  patientId: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  reason: string;
  notes?: string;
  consultationFormId?: string;
  cancellationReason?: string;
  duration?: number;
  actualStartTime?: string;
  actualEndTime?: string;
  isFollowUp?: boolean;
  nextAppointmentDate?: string;
  attachments?: string[];
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
 * Appointment management service
 */
export const appointmentService = {
  /**
   * Create new appointment
   * @param appointmentData - Appointment details
   * @returns Created appointment
   */
  createAppointment: async (appointmentData: Partial<Appointment>): Promise<ServiceResponse<Appointment>> => {
    try {
      const res = await api.post('/appointments', appointmentData);
      return {
        success: true,
        message: 'Appointment created successfully',
        data: res.data.appointment || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create appointment',
        error: error.message,
      };
    }
  },

  /**
   * Get all appointments with pagination and filtering
   * @param page - Page number
   * @param limit - Results per page
   * @param status - Filter by status (optional)
   * @returns Paginated appointments
   */
  getAppointments: async (
    page = 1,
    limit = 10,
    status?: string
  ): Promise<ServiceResponse<{ appointments: Appointment[]; total: number }>> => {
    try {
      const res = await api.get('/appointments', { params: { page, limit, status } });
      return {
        success: true,
        message: 'Appointments fetched successfully',
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
   * Get today's appointments
   * @returns Today's appointments
   */
  getTodayAppointments: async (): Promise<ServiceResponse<Appointment[]>> => {
    try {
      const res = await api.get('/appointments/today');
      return {
        success: true,
        message: "Today's appointments fetched",
        data: res.data.appointments || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch today\'s appointments',
        error: error.message,
      };
    }
  },

  /**
   * Get appointment by ID
   * @param id - Appointment ID
   * @returns Appointment details
   */
  getAppointmentById: async (id: string): Promise<ServiceResponse<Appointment>> => {
    try {
      const res = await api.get(`/appointments/${id}`);
      return {
        success: true,
        message: 'Appointment fetched successfully',
        data: res.data.appointment || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch appointment',
        error: error.message,
      };
    }
  },

  /**
   * Update appointment details
   * @param id - Appointment ID
   * @param updates - Fields to update
   * @returns Updated appointment
   */
  updateAppointment: async (
    id: string,
    updates: Partial<Appointment>
  ): Promise<ServiceResponse<Appointment>> => {
    try {
      const res = await api.put(`/appointments/${id}`, updates);
      return {
        success: true,
        message: 'Appointment updated successfully',
        data: res.data.appointment || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update appointment',
        error: error.message,
      };
    }
  },

  /**
   * Update appointment status
   * @param id - Appointment ID
   * @param status - New status
   * @returns Updated appointment
   */
  updateAppointmentStatus: async (
    id: string,
    status: string
  ): Promise<ServiceResponse<Appointment>> => {
    try {
      const res = await api.put(`/appointments/${id}/status`, { status });
      return {
        success: true,
        message: 'Appointment status updated',
        data: res.data.appointment || res.data,
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
   * Cancel appointment
   * @param id - Appointment ID
   * @param cancellationReason - Reason for cancellation
   * @returns Cancelled appointment
   */
  cancelAppointment: async (
    id: string,
    cancellationReason?: string
  ): Promise<ServiceResponse<Appointment>> => {
    try {
      const res = await api.put(`/appointments/${id}/status`, {
        status: 'cancelled',
        cancellationReason,
      });
      return {
        success: true,
        message: 'Appointment cancelled successfully',
        data: res.data.appointment || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to cancel appointment',
        error: error.message,
      };
    }
  },

  /**
   * Get patient's appointments
   * @param patientId - Patient ID
   * @param page - Page number
   * @param limit - Results per page
   * @returns Patient's appointments
   */
  getPatientAppointments: async (
    patientId: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ appointments: Appointment[]; total: number }>> => {
    try {
      const res = await api.get('/appointments', {
        params: { page, limit, patientId },
      });
      return {
        success: true,
        message: 'Patient appointments fetched',
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
   * Get doctor's appointments
   * @param doctorId - Doctor ID
   * @param page - Page number
   * @param limit - Results per page
   * @returns Doctor's appointments
   */
  getDoctorAppointments: async (
    doctorId: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ appointments: Appointment[]; total: number }>> => {
    try {
      const res = await api.get('/appointments', {
        params: { page, limit, doctorId },
      });
      return {
        success: true,
        message: 'Doctor appointments fetched',
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
   * Delete appointment
   * @param id - Appointment ID
   * @returns Deletion confirmation
   */
  deleteAppointment: async (id: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.delete(`/appointments/${id}`);
      return {
        success: true,
        message: 'Appointment deleted successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete appointment',
        error: error.message,
      };
    }
  },

  /**
   * Get available doctor slots
   * @param doctorId - Doctor ID
   * @param date - Date to check (YYYY-MM-DD)
   * @returns Available time slots
   */
  getAvailableSlots: async (
    doctorId: string,
    date: string
  ): Promise<ServiceResponse<{ slots: string[] }>> => {
    try {
      const res = await api.get(`/appointments/available-slots/${doctorId}`, {
        params: { date },
      });
      return {
        success: true,
        message: 'Available slots fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch slots',
        error: error.message,
      };
    }
  },
};

export default appointmentService;
