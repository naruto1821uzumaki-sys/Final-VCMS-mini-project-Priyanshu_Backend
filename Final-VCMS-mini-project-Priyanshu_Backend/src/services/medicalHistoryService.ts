/**
 * Medical History Service
 * Handles patient medical history records management
 * 
 * Usage:
 *   const history = await medicalHistoryService.createRecord({
 *     patientId, condition, treatment, ...
 *   });
 */

import api from './api';

export interface MedicalHistoryRecord {
  _id: string;
  patientId: string;
  condition: string;
  diagnosis: string;
  treatment: string;
  startDate: string;
  endDate?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  status: 'ongoing' | 'resolved' | 'pending';
  notes?: string;
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
 * Medical history management service
 */
export const medicalHistoryService = {
  /**
   * Create medical history record
   * @param recordData - Medical history record details
   * @returns Created record
   */
  createRecord: async (
    recordData: Partial<MedicalHistoryRecord>
  ): Promise<ServiceResponse<MedicalHistoryRecord>> => {
    try {
      const res = await api.post('/medical-history', recordData);
      return {
        success: true,
        message: 'Medical history record created',
        data: res.data.record || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create record',
        error: error.message,
      };
    }
  },

  /**
   * Get patient's medical history
   * @param patientId - Patient ID
   * @param page - Page number
   * @param limit - Results per page
   * @returns Patient's medical history
   */
  getPatientHistory: async (
    patientId: string,
    page = 1,
    limit = 10
  ): Promise<ServiceResponse<{ records: MedicalHistoryRecord[]; total: number }>> => {
    try {
      const res = await api.get(`/medical-history/patient/${patientId}`, {
        params: { page, limit },
      });
      return {
        success: true,
        message: 'Medical history fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch history',
        error: error.message,
      };
    }
  },

  /**
   * Get medical history record by ID
   * @param id - Record ID
   * @returns Record details
   */
  getRecordById: async (id: string): Promise<ServiceResponse<MedicalHistoryRecord>> => {
    try {
      const res = await api.get(`/medical-history/${id}`);
      return {
        success: true,
        message: 'Record fetched successfully',
        data: res.data.record || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch record',
        error: error.message,
      };
    }
  },

  /**
   * Update medical history record
   * @param id - Record ID
   * @param updates - Fields to update
   * @returns Updated record
   */
  updateRecord: async (
    id: string,
    updates: Partial<MedicalHistoryRecord>
  ): Promise<ServiceResponse<MedicalHistoryRecord>> => {
    try {
      const res = await api.put(`/medical-history/${id}`, updates);
      return {
        success: true,
        message: 'Record updated successfully',
        data: res.data.record || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update record',
        error: error.message,
      };
    }
  },

  /**
   * Delete medical history record
   * @param id - Record ID
   * @returns Deletion confirmation
   */
  deleteRecord: async (id: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.delete(`/medical-history/${id}`);
      return {
        success: true,
        message: 'Record deleted successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete record',
        error: error.message,
      };
    }
  },

  /**
   * Get active conditions for patient
   * @param patientId - Patient ID
   * @returns Active medical conditions
   */
  getActiveConditions: async (
    patientId: string
  ): Promise<ServiceResponse<MedicalHistoryRecord[]>> => {
    try {
      const res = await api.get(`/medical-history/patient/${patientId}`, {
        params: { status: 'ongoing' },
      });
      return {
        success: true,
        message: 'Active conditions fetched',
        data: res.data.records || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch conditions',
        error: error.message,
      };
    }
  },

  /**
   * Get resolved conditions for patient
   * @param patientId - Patient ID
   * @returns Resolved medical conditions
   */
  getResolvedConditions: async (
    patientId: string
  ): Promise<ServiceResponse<MedicalHistoryRecord[]>> => {
    try {
      const res = await api.get(`/medical-history/patient/${patientId}`, {
        params: { status: 'resolved' },
      });
      return {
        success: true,
        message: 'Resolved conditions fetched',
        data: res.data.records || res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch conditions',
        error: error.message,
      };
    }
  },

  /**
   * Add medication to medical condition
   * @param recordId - Record ID
   * @param medication - Medication details
   * @returns Updated record
   */
  addMedication: async (
    recordId: string,
    medication: {
      name: string;
      dosage: string;
      frequency: string;
    }
  ): Promise<ServiceResponse<MedicalHistoryRecord>> => {
    try {
      const res = await api.post(`/medical-history/${recordId}/medications`, medication);
      return {
        success: true,
        message: 'Medication added',
        data: res.data.record || res.data,
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
   * Get full medical history timeline
   * @param patientId - Patient ID
   * @returns Timeline of all medical events
   */
  getMedicalTimeline: async (
    patientId: string
  ): Promise<ServiceResponse<{
    timeline: Array<{
      date: string;
      event: string;
      type: string;
    }>;
  }>> => {
    try {
      const res = await api.get(`/medical-history/patient/${patientId}/timeline`);
      return {
        success: true,
        message: 'Timeline fetched',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch timeline',
        error: error.message,
      };
    }
  },

  /**
   * Export medical history as PDF
   * @param patientId - Patient ID
   * @returns PDF download
   */
  exportMedicalHistoryPdf: async (patientId: string): Promise<ServiceResponse<any>> => {
    try {
      const res = await api.get(`/medical-history/patient/${patientId}/export-pdf`, {
        responseType: 'blob',
      });
      return {
        success: true,
        message: 'PDF exported',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to export PDF',
        error: error.message,
      };
    }
  },

  /**
   * Get medical summary for patient
   * @param patientId - Patient ID
   * @returns Summary of medical history
   */
  getMedicalSummary: async (
    patientId: string
  ): Promise<ServiceResponse<{
    totalConditions: number;
    activeConditions: number;
    resolvedConditions: number;
    lastVisit?: string;
    conditions: string[];
  }>> => {
    try {
      const res = await api.get(`/medical-history/patient/${patientId}/summary`);
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
};

export default medicalHistoryService;
