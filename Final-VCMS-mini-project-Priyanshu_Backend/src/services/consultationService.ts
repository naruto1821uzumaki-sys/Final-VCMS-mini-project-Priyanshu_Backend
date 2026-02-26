/**
 * Consultation Service (NEW)
 * Handles consultation form management (symptom collection, medical history)
 * 
 * Usage:
 *   const consultation = await consultationService.createForm({
 *     patientId, symptoms, allergies, ...
 *   });
 */

import api from './api';

export interface ConsultationForm {
  _id: string;
  patientId: string;
  appointmentId?: string;
  symptoms: string[];
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string[];
  familyHistory: string[];
  lifeStyleFacts?: {
    smoking: boolean;
    alcohol: boolean;
    exercise: string;
  };
  status: 'draft' | 'submitted' | 'reviewed' | 'completed';
  aiAnalysis?: {
    generated: boolean;
    summary: string;
    recommendations: string[];
    generatedAt: string;
  };
  doctorReview?: {
    doctorId: string;
    notes: string;
    reviewedAt: string;
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
 * Consultation form management service
 */
export const consultationService = {
  /**
   * Create new consultation form
   * @param formData - Consultation form data
   * @returns Created form
   */
  createForm: async (formData: Partial<ConsultationForm>): Promise<ServiceResponse<ConsultationForm>> => {
    try {
      const res = await api.post('/consultations', formData);
      return {
        success: true,
        message: 'Consultation form created',
        data: res.data.consultation || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create form',
        error: error.message,
      };
    }
  },

  /**
   * Get consultation form by ID
   * @param id - Form ID
   * @returns Form details
   */
  getFormById: async (id: string): Promise<ServiceResponse<ConsultationForm>> => {
    try {
      const res = await api.get(`/consultations/${id}`);
      return {
        success: true,
        message: 'Form fetched successfully',
        data: res.data.consultation || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch form',
        error: error.message,
      };
    }
  },

  /**
   * Get all consultation forms for patient
   * @param patientId - Patient ID
   * @param page - Page number
   * @param limit - Results per page
   * @returns Patient's consultation forms
   */
  getPatientForms: async (
    patientId: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ forms: ConsultationForm[]; total: number }>> => {
    try {
      const res = await api.get('/consultations', {
        params: { page, limit, patientId },
      });
      return {
        success: true,
        message: 'Forms fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch forms',
        error: error.message,
      };
    }
  },

  /**
   * Update consultation form
   * @param id - Form ID
   * @param updates - Fields to update
   * @returns Updated form
   */
  updateForm: async (
    id: string,
    updates: Partial<ConsultationForm>
  ): Promise<ServiceResponse<ConsultationForm>> => {
    try {
      const res = await api.put(`/consultations/${id}`, updates);
      return {
        success: true,
        message: 'Form updated successfully',
        data: res.data.consultation || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update form',
        error: error.message,
      };
    }
  },

  /**
   * Submit consultation form (change status to submitted)
   * @param id - Form ID
   * @returns Submitted form
   */
  submitForm: async (id: string): Promise<ServiceResponse<ConsultationForm>> => {
    try {
      const res = await api.put(`/consultations/${id}`, { status: 'submitted' });
      return {
        success: true,
        message: 'Form submitted successfully',
        data: res.data.consultation || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit form',
        error: error.message,
      };
    }
  },

  /**
   * Doctor review consultation form
   * @param id - Form ID
   * @param doctorId - Doctor ID
   * @param notes - Doctor's review notes
   * @returns Reviewed form
   */
  reviewForm: async (
    id: string,
    doctorId: string,
    notes: string
  ): Promise<ServiceResponse<ConsultationForm>> => {
    try {
      const res = await api.put(`/consultations/${id}/review`, {
        doctorId,
        notes,
        status: 'reviewed',
      });
      return {
        success: true,
        message: 'Form reviewed successfully',
        data: res.data.consultation || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to review form',
        error: error.message,
      };
    }
  },

  /**
   * Generate AI analysis for symptoms
   * @param id - Form ID
   * @returns Form with AI analysis
   */
  generateAiAnalysis: async (id: string): Promise<ServiceResponse<ConsultationForm>> => {
    try {
      const res = await api.post(`/consultations/${id}/ai-analysis`);
      return {
        success: true,
        message: 'AI analysis generated',
        data: res.data.consultation || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate analysis',
        error: error.message,
      };
    }
  },

  /**
   * Get forms pending review by doctor
   * @param doctorId - Doctor ID
   * @param page - Page number
   * @param limit - Results per page
   * @returns Pending forms for doctor
   */
  getPendingFormsForDoctor: async (
    doctorId: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ forms: ConsultationForm[]; total: number }>> => {
    try {
      const res = await api.get('/consultations', {
        params: { page, limit, status: 'submitted', doctorId },
      });
      return {
        success: true,
        message: 'Pending forms fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch forms',
        error: error.message,
      };
    }
  },

  /**
   * Get forms for appointment
   * @param appointmentId - Appointment ID
   * @returns Forms linked to appointment
   */
  getFormsByAppointment: async (appointmentId: string): Promise<ServiceResponse<ConsultationForm[]>> => {
    try {
      const res = await api.get('/consultations', {
        params: { appointmentId },
      });
      return {
        success: true,
        message: 'Forms fetched',
        data: res.data.forms || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch forms',
        error: error.message,
      };
    }
  },

  /**
   * Delete consultation form
   * @param id - Form ID
   * @returns Deletion confirmation
   */
  deleteForm: async (id: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.delete(`/consultations/${id}`);
      return {
        success: true,
        message: 'Form deleted successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete form',
        error: error.message,
      };
    }
  },

  /**
   * Get consultation form template (empty form structure)
   * @returns Empty form template
   */
  getFormTemplate: async (): Promise<ServiceResponse<Partial<ConsultationForm>>> => {
    return {
      success: true,
      message: 'Template retrieved',
      data: {
        symptoms: [],
        allergies: [],
        currentMedications: [],
        medicalHistory: [],
        familyHistory: [],
        status: 'draft',
      },
    };
  },
};

export default consultationService;
