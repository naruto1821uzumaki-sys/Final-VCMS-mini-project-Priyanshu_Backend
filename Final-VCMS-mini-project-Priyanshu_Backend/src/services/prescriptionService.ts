/**
 * Prescription Service
 * Handles prescription management (creation, retrieval, updates)
 * 
 * Usage:
 *   const prescription = await prescriptionService.createPrescription({
 *     patientId, doctorId, medications, ...
 *   });
 */

import api from './api';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  medications: Medication[];
  diagnosis: string;
  notes: string;
  issueDate?: string;
  expiryDate?: string;
  aiSummary?: {
    generated: boolean;
    content: string;
    generatedAt: string;
    disclaimerShown: boolean;
  };
  status?: 'active' | 'expired' | 'completed';
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
 * Prescription management service
 */
export const prescriptionService = {
  /**
   * Create new prescription
   * @param prescriptionData - Prescription details including medications
   * @returns Created prescription
   */
  createPrescription: async (
    prescriptionData: Partial<Prescription>
  ): Promise<ServiceResponse<Prescription>> => {
    try {
      const res = await api.post('/prescriptions', prescriptionData);
      return {
        success: true,
        message: 'Prescription created successfully',
        data: res.data.prescription || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create prescription',
        error: error.message,
      };
    }
  },

  /**
   * Get prescription by ID
   * @param id - Prescription ID
   * @returns Prescription details
   */
  getPrescriptionById: async (id: string): Promise<ServiceResponse<Prescription>> => {
    try {
      const res = await api.get(`/prescriptions/${id}`);
      return {
        success: true,
        message: 'Prescription fetched successfully',
        data: res.data.prescription || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch prescription',
        error: error.message,
      };
    }
  },

  /**
   * Get patient's prescriptions
   * @param patientId - Patient ID
   * @param page - Page number
   * @param limit - Results per page
   * @returns Patient's prescriptions
   */
  getPatientPrescriptions: async (
    patientId: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ prescriptions: Prescription[]; total: number }>> => {
    try {
      const res = await api.get(`/prescriptions/patient/${patientId}`, {
        params: { page, limit },
      });
      return {
        success: true,
        message: 'Patient prescriptions fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch prescriptions',
        error: error.message,
      };
    }
  },

  /**
   * Get prescription by appointment
   * @param appointmentId - Appointment ID
   * @returns Prescription for the appointment
   */
  getPrescriptionByAppointment: async (
    appointmentId: string
  ): Promise<ServiceResponse<Prescription>> => {
    try {
      const res = await api.get(`/prescriptions/appointment/${appointmentId}`);
      return {
        success: true,
        message: 'Prescription fetched',
        data: res.data.prescription || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch prescription',
        error: error.message,
      };
    }
  },

  /**
   * Update prescription
   * @param id - Prescription ID
   * @param updates - Fields to update
   * @returns Updated prescription
   */
  updatePrescription: async (
    id: string,
    updates: Partial<Prescription>
  ): Promise<ServiceResponse<Prescription>> => {
    try {
      const res = await api.put(`/prescriptions/${id}`, updates);
      return {
        success: true,
        message: 'Prescription updated successfully',
        data: res.data.prescription || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update prescription',
        error: error.message,
      };
    }
  },

  /**
   * Add medication to prescription
   * @param id - Prescription ID
   * @param medication - Medication to add
   * @returns Updated prescription
   */
  addMedication: async (
    id: string,
    medication: Medication
  ): Promise<ServiceResponse<Prescription>> => {
    try {
      const res = await api.post(`/prescriptions/${id}/medications`, medication);
      return {
        success: true,
        message: 'Medication added successfully',
        data: res.data.prescription || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add medication',
        error: error.message,
      };
    }
  },

  /**
   * Remove medication from prescription
   * @param id - Prescription ID
   * @param medicationIndex - Index of medication to remove
   * @returns Updated prescription
   */
  removeMedication: async (
    id: string,
    medicationIndex: number
  ): Promise<ServiceResponse<Prescription>> => {
    try {
      const res = await api.delete(`/prescriptions/${id}/medications/${medicationIndex}`);
      return {
        success: true,
        message: 'Medication removed successfully',
        data: res.data.prescription || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove medication',
        error: error.message,
      };
    }
  },

  /**
   * Generate AI summary for prescription
   * @param id - Prescription ID
   * @returns Prescription with AI summary
   */
  generateAiSummary: async (id: string): Promise<ServiceResponse<Prescription>> => {
    try {
      const res = await api.post(`/prescriptions/${id}/ai-summary`);
      return {
        success: true,
        message: 'AI summary generated',
        data: res.data.prescription || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to generate AI summary',
        error: error.message,
      };
    }
  },

  /**
   * Get prescriptions issued by doctor
   * @param doctorId - Doctor ID
   * @param page - Page number
   * @param limit - Results per page
   * @returns Doctor's issued prescriptions
   */
  getDoctorPrescriptions: async (
    doctorId: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ prescriptions: Prescription[]; total: number }>> => {
    try {
      const res = await api.get('/prescriptions', {
        params: { page, limit, doctorId },
      });
      return {
        success: true,
        message: 'Doctor prescriptions fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch prescriptions',
        error: error.message,
      };
    }
  },

  /**
   * Download prescription as PDF
   * @param id - Prescription ID
   * @returns PDF download link
   */
  downloadPrescriptionPdf: async (id: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.get(`/prescriptions/${id}/pdf`, {
        responseType: 'blob',
      });
      return {
        success: true,
        message: 'PDF downloaded',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to download PDF',
        error: error.message,
      };
    }
  },

  /**
   * Delete prescription
   * @param id - Prescription ID
   * @returns Deletion confirmation
   */
  deletePrescription: async (id: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.delete(`/prescriptions/${id}`);
      return {
        success: true,
        message: 'Prescription deleted successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete prescription',
        error: error.message,
      };
    }
  },
};

export default prescriptionService;
