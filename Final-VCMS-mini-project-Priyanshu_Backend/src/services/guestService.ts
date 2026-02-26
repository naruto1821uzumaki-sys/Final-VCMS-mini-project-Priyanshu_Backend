/**
 * Guest Service - Guest appointment booking and tracking
 * 
 * Handles:
 * - Guest appointment booking (no authentication required)
 * - Guest appointment tracking via email token
 * - Pre-consultation forms for guests
 * - Guest data management
 * 
 * @module services/guestService
 */

import api from './api';

/**
 * Guest appointment type
 */
export interface GuestAppointment {
  _id: string;
  guestEmail: string;
  guestPhone: string;
  guestName: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  symptoms: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  consultationFormId?: string;
  trackingToken: string;
  expiresAt: string; // 30 days from creation
  createdAt: string;
  updatedAt: string;
}

/**
 * Guest consultation form type
 */
export interface GuestConsultationForm {
  _id: string;
  guestAppointmentId: string;
  guestEmail: string;
  symptoms: string;
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string;
  familyHistory: string;
  lifeStyleFacts: {
    diet: string;
    exercise: string;
    smoking: boolean;
    alcohol: boolean;
  };
  additionalNotes: string;
  submittedAt: string;
  status: 'draft' | 'submitted' | 'reviewed';
}

/**
 * Service response type
 */
export interface ServiceResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Guest Service - All guest booking and tracking features
 */
class GuestService {
  /**
   * Book an appointment as guest (no authentication required)
   * 
   * @param guestData - Guest information and appointment details
   * - guestName: Full name
   * - guestEmail: Email for confirmation and tracking
   * - guestPhone: Contact number
   * - doctorId: Selected doctor ID
   * - appointmentDate: Date (YYYY-MM-DD)
   * - appointmentTime: Time (HH:MM)
   * - symptoms: Reason for visit
   * 
   * @returns Created guest appointment with tracking token
   * 
   * @example
   * const result = await guestService.bookAppointment({
   *   guestName: 'John Doe',
   *   guestEmail: 'john@example.com',
   *   guestPhone: '9876543210',
   *   doctorId: 'doc123',
   *   appointmentDate: '2024-02-25',
   *   appointmentTime: '10:30',
   *   symptoms: 'Headache and fever'
   * });
   * if (result.success) {
   *   console.log('Confirmation sent to:', result.data?.guestEmail);
   * }
   */
  async bookAppointment(guestData: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    symptoms: string;
  }): Promise<ServiceResponse<{ appointment: GuestAppointment; trackingLink: string }>> {
    try {
      const res = await api.post('/guest/appointments', guestData);
      return {
        success: true,
        message: 'Appointment booked successfully! Check your email for confirmation.',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to book appointment',
        error: error.message,
      };
    }
  }

  /**
   * Get guest appointment details using tracking token
   * 
   * @param trackingToken - Unique token from email confirmation
   * 
   * @returns Guest appointment details with status and form
   * 
   * @example
   * const result = await guestService.getAppointment('token_xyz123');
   * if (result.success) {
   *   console.log(result.data?.appointment.status);
   *   console.log(result.data?.appointment.appointmentDate);
   * }
   */
  async getAppointment(trackingToken: string): Promise<ServiceResponse<{
    appointment: GuestAppointment;
    doctorInfo?: { name: string; specialization: string; phone: string };
    consultationForm?: GuestConsultationForm;
  }>> {
    try {
      const res = await api.get(`/guest/appointments/${trackingToken}`);
      return {
        success: true,
        message: 'Appointment details retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Unable to find appointment',
        error: error.message,
      };
    }
  }

  /**
   * Get appointment using email and verification code
   * 
   * @param guestEmail - Guest's email address
   * @param verificationCode - Code sent to email
   * 
   * @returns Guest appointment details
   * 
   * @example
   * const result = await guestService.getAppointmentByEmail(
   *   'john@example.com',
   *   '123456'
   * );
   * if (result.success) {
   *   console.log(result.data?.appointment);
   * }
   */
  async getAppointmentByEmail(
    guestEmail: string,
    verificationCode: string
  ): Promise<ServiceResponse<{ appointment: GuestAppointment }>> {
    try {
      const res = await api.post('/guest/appointments/verify-email', {
        guestEmail,
        verificationCode
      });
      return {
        success: true,
        message: 'Appointment retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Verification failed',
        error: error.message,
      };
    }
  }

  /**
   * Cancel guest appointment
   * 
   * @param trackingToken - Tracking token from email
   * @param reason - Cancellation reason
   * 
   * @returns Updated appointment status
   * 
   * @example
   * const result = await guestService.cancelAppointment(
   *   'token_xyz123',
   *   'Unable to attend'
   * );
   * if (result.success) {
   *   console.log('Appointment cancelled');
   * }
   */
  async cancelAppointment(
    trackingToken: string,
    reason: string
  ): Promise<ServiceResponse<{ appointment: GuestAppointment }>> {
    try {
      const res = await api.post(`/guest/appointments/${trackingToken}/cancel`, {
        reason
      });
      return {
        success: true,
        message: 'Appointment cancelled successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to cancel appointment',
        error: error.message,
      };
    }
  }

  /**
   * Reschedule guest appointment
   * 
   * @param trackingToken - Tracking token
   * @param newDate - New appointment date (YYYY-MM-DD)
   * @param newTime - New appointment time (HH:MM)
   * 
   * @returns Updated appointment
   * 
   * @example
   * const result = await guestService.rescheduleAppointment(
   *   'token_xyz123',
   *   '2024-02-27',
   *   '14:00'
   * );
   * if (result.success) {
   *   console.log('Appointment rescheduled');
   * }
   */
  async rescheduleAppointment(
    trackingToken: string,
    newDate: string,
    newTime: string
  ): Promise<ServiceResponse<{ appointment: GuestAppointment }>> {
    try {
      const res = await api.post(`/guest/appointments/${trackingToken}/reschedule`, {
        newDate,
        newTime
      });
      return {
        success: true,
        message: 'Appointment rescheduled successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reschedule appointment',
        error: error.message,
      };
    }
  }

  /**
   * Submit pre-consultation form as guest
   * 
   * @param trackingToken - Guest appointment tracking token
   * @param formData - Pre-consultation form data
   * 
   * @returns Submitted form
   * 
   * @example
   * const result = await guestService.submitConsultationForm(
   *   'token_xyz123',
   *   {
   *     symptoms: 'High fever and cough',
   *     allergies: ['Penicillin'],
   *     currentMedications: [],
   *     medicalHistory: 'None',
   *     familyHistory: 'Diabetes in family',
   *     lifeStyleFacts: {...},
   *     additionalNotes: 'Currently on no medications'
   *   }
   * );
   * if (result.success) {
   *   console.log('Form submitted');
   * }
   */
  async submitConsultationForm(
    trackingToken: string,
    formData: Omit<GuestConsultationForm, '_id' | 'guestAppointmentId' | 'guestEmail' | 'submittedAt' | 'status'>
  ): Promise<ServiceResponse<{ form: GuestConsultationForm }>> {
    try {
      const res = await api.post(
        `/guest/appointments/${trackingToken}/consultation-form`,
        formData
      );
      return {
        success: true,
        message: 'Consultation form submitted successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit form',
        error: error.message,
      };
    }
  }

  /**
   * Get empty consultation form template
   * 
   * @returns Template with empty fields and field descriptions
   * 
   * @example
   * const result = await guestService.getFormTemplate();
   * if (result.success) {
   *   console.log(result.data?.template);
   * }
   */
  async getFormTemplate(): Promise<ServiceResponse<{ template: GuestConsultationForm }>> {
    try {
      const res = await api.get('/guest/consultation-form/template');
      return {
        success: true,
        message: 'Template retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch template',
        error: error.message,
      };
    }
  }

  /**
   * Get guest consultation form
   * 
   * @param trackingToken - Guest appointment tracking token
   * 
   * @returns Submitted consultation form or empty template
   * 
   * @example
   * const result = await guestService.getConsultationForm('token_xyz123');
   * if (result.success) {
   *   console.log(result.data?.form);
   * }
   */
  async getConsultationForm(trackingToken: string): Promise<ServiceResponse<{
    form: GuestConsultationForm;
    status: 'draft' | 'submitted' | 'reviewed';
  }>> {
    try {
      const res = await api.get(`/guest/appointments/${trackingToken}/consultation-form`);
      return {
        success: true,
        message: 'Consultation form retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch form',
        error: error.message,
      };
    }
  }

  /**
   * Download appointment details as PDF
   * 
   * @param trackingToken - Guest appointment tracking token
   * 
   * @returns PDF file blob
   * 
   * @example
   * const result = await guestService.downloadAppointmentPdf('token_xyz123');
   * if (result.success) {
   *   // Save file or open in new window
   * }
   */
  async downloadAppointmentPdf(trackingToken: string): Promise<ServiceResponse<{ downloadUrl: string }>> {
    try {
      const res = await api.post(`/guest/appointments/${trackingToken}/download-pdf`);
      return {
        success: true,
        message: 'Download ready',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate PDF',
        error: error.message,
      };
    }
  }

  /**
   * Resend confirmation email with tracking link
   * 
   * @param trackingToken - Appointment tracking token
   * 
   * @returns Confirmation sent status
   * 
   * @example
   * const result = await guestService.resendConfirmationEmail('token_xyz123');
   * if (result.success) {
   *   console.log('Email sent');
   * }
   */
  async resendConfirmationEmail(trackingToken: string): Promise<ServiceResponse<{ sent: boolean }>> {
    try {
      const res = await api.post(`/guest/appointments/${trackingToken}/resend-email`);
      return {
        success: true,
        message: 'Confirmation email sent successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send email',
        error: error.message,
      };
    }
  }

  /**
   * Get guest appointment status updates
   * 
   * @param trackingToken - Tracking token
   * 
   * @returns Appointment status and timeline
   * 
   * @example
   * const result = await guestService.getAppointmentUpdates('token_xyz123');
   * if (result.success) {
   *   console.log(result.data?.timeline);
   * }
   */
  async getAppointmentUpdates(trackingToken: string): Promise<ServiceResponse<{
    status: string;
    timeline: Array<{ event: string; timestamp: string; message: string }>;
  }>> {
    try {
      const res = await api.get(`/guest/appointments/${trackingToken}/updates`);
      return {
        success: true,
        message: 'Updates retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch updates',
        error: error.message,
      };
    }
  }

  /**
   * Subscribe to appointment status notifications via email
   * 
   * @param trackingToken - Tracking token
   * @param notificationPreferences - Notification settings
   * 
   * @returns Subscription status
   * 
   * @example
   * const result = await guestService.subscribeToNotifications('token_xyz123', {
   *   confirmation: true,
   *   reminder: true,
   *   update: true
   * });
   */
  async subscribeToNotifications(
    trackingToken: string,
    notificationPreferences: {
      confirmation?: boolean;
      reminder?: boolean;
      update?: boolean;
    }
  ): Promise<ServiceResponse<{ subscribed: boolean }>> {
    try {
      const res = await api.post(
        `/guest/appointments/${trackingToken}/subscribe-notifications`,
        notificationPreferences
      );
      return {
        success: true,
        message: 'Notification preferences updated',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update preferences',
        error: error.message,
      };
    }
  }

  /**
   * Request data deletion (GDPR compliance)
   * 
   * @param trackingToken - Tracking token
   * @param reason - Optional reason for deletion
   * 
   * @returns Deletion request status
   * 
   * @example
   * const result = await guestService.requestDataDeletion('token_xyz123');
   * if (result.success) {
   *   console.log('Data deletion requested');
   * }
   */
  async requestDataDeletion(
    trackingToken: string,
    reason?: string
  ): Promise<ServiceResponse<{ deletionScheduled: boolean; deletionDate: string }>> {
    try {
      const res = await api.post(`/guest/appointments/${trackingToken}/request-deletion`, {
        reason
      });
      return {
        success: true,
        message: 'Data deletion request submitted',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to request deletion',
        error: error.message,
      };
    }
  }
}

export default new GuestService();
