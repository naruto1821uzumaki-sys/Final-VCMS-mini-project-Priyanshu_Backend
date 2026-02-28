import api from './api';
import axios from 'axios';

/**
 * Service to interact with OpenAI API for summaries and analysis
 */

interface SummaryRequest {
  type: 'prescription' | 'report' | 'medical_history';
  data: string;
}

interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  recommendations?: string[];
  aiPowered?: boolean;
}

export const openaiService = {
  /**
   * Get AI summary for prescriptions
   */
  async summarizePrescription(
    medications: any[],
    diagnosis: string,
    treatmentPlan: string,
    followUpRecommendations: string
  ): Promise<SummaryResponse> {
    try {
      const prescriptionText = `
        Diagnosis: ${diagnosis}
        
        Medications:
        ${medications.map(m => `- ${m.name} ${m.dosage}, ${m.frequency} for ${m.duration}`).join('\n')}
        
        Treatment Plan: ${treatmentPlan}
        
        Follow-up Recommendations: ${followUpRecommendations}
      `;

      const response = await api.post('/ai/summarize', {
        type: 'prescription',
        content: prescriptionText,
      });

      return {
        summary: response.data.summary,
        keyPoints: response.data.keyPoints || [],
        recommendations: response.data.recommendations || [],
      };
    } catch (error) {
      console.error('Error summarizing prescription:', error);
      throw new Error('Failed to generate prescription summary');
    }
  },

  /**
   * Get AI analysis for medical reports
   */
  async analyzeReport(reportText: string): Promise<SummaryResponse> {
    try {
      const response = await api.post('/ai/analyze-report', {
        type: 'report',
        content: reportText,
      });

      return {
        summary: response.data.summary,
        keyPoints: response.data.keyPoints || [],
        recommendations: response.data.recommendations || [],
        aiPowered: response.data.aiPowered,
      };
    } catch (error: unknown) {
      console.error('Error analyzing report:', error);
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.error || error.response?.data?.message;
        if (msg) throw new Error(msg);
        if (error.code === 'ERR_NETWORK') {
          throw new Error('Backend server is not reachable on port 5000. Please start the backend server.');
        }
      }
      throw new Error('Failed to analyze report');
    }
  },

  /**
   * Extract text from image using OCR
   */
  async extractTextFromImage(imageFile: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await api.post('/ai/extract-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data.text;
    } catch (error: unknown) {
      console.error('Error extracting text:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }

        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }

        if (error.code === 'ERR_NETWORK') {
          throw new Error('Backend server is not reachable on port 5000. Please start the backend server.');
        }
      }

      throw new Error('Failed to extract text from image');
    }
  },
};

export default openaiService;
