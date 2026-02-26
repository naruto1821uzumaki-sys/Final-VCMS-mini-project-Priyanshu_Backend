import api from './api';

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
    } catch (error) {
      console.error('Error analyzing report:', error);
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
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error('Failed to extract text from image');
    }
  },
};

export default openaiService;
