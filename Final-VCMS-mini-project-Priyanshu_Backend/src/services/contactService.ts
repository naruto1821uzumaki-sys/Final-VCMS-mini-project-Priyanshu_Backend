/**
 * Contact Service - Guest contact form and inquiry management
 * 
 * Handles:
 * - Guest contact form submission
 * - Inquiry tracking
 * - Contact response management
 * - Support ticketing
 * 
 * @module services/contactService
 */

import api from './api';

/**
 * Contact inquiry type
 */
export interface ContactInquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: 'general' | 'appointment' | 'medical' | 'billing' | 'complaint' | 'feedback' | 'other';
  message: string;
  attachments?: string[];
  status: 'new' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  response?: {
    message: string;
    respondent: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
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
 * Contact Service - All guest inquiry and contact features
 */
class ContactService {
  /**
   * Submit contact form inquiry
   * 
   * @param inquiryData - Contact form data
   * - name: Full name
   * - email: Email address
   * - phone: Optional phone number
   * - subject: Category of inquiry
   * - message: Inquiry message
   * - attachments: Optional file uploads
   * 
   * @returns Created inquiry with ticket number
   * 
   * @example
   * const result = await contactService.submitInquiry({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   phone: '9876543210',
   *   subject: 'appointment',
   *   message: 'I would like to reschedule my appointment'
   * });
   * if (result.success) {
   *   console.log('Ticket:', result.data?.ticketNumber);
   * }
   */
  async submitInquiry(inquiryData: {
    name: string;
    email: string;
    phone?: string;
    subject: 'general' | 'appointment' | 'medical' | 'billing' | 'complaint' | 'feedback' | 'other';
    message: string;
    attachments?: FileList;
  }): Promise<ServiceResponse<{
    inquiry: ContactInquiry;
    ticketNumber: string;
  }>> {
    try {
      // Use FormData for file uploads if attachments present
      let data: any = inquiryData;
      
      if (inquiryData.attachments && inquiryData.attachments.length > 0) {
        const formData = new FormData();
        formData.append('name', inquiryData.name);
        formData.append('email', inquiryData.email);
        if (inquiryData.phone) formData.append('phone', inquiryData.phone);
        formData.append('subject', inquiryData.subject);
        formData.append('message', inquiryData.message);
        
        for (let i = 0; i < inquiryData.attachments.length; i++) {
          formData.append('attachments', inquiryData.attachments[i]);
        }
        
        data = formData;
      }

      const res = await api.post('/contact/inquiries', data);
      return {
        success: true,
        message: 'Your inquiry has been received. We will respond shortly.',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit inquiry',
        error: error.message,
      };
    }
  }

  /**
   * Get inquiry details using ticket number
   * 
   * @param ticketNumber - Unique ticket identifier
   * @param email - Inquirer's email for verification
   * 
   * @returns Inquiry details with response history
   * 
   * @example
   * const result = await contactService.getInquiry('TKT-2024-001', 'john@example.com');
   * if (result.success) {
   *   console.log(result.data?.inquiry.status);
   *   console.log(result.data?.inquiry.response);
   * }
   */
  async getInquiry(
    ticketNumber: string,
    email: string
  ): Promise<ServiceResponse<{ inquiry: ContactInquiry }>> {
    try {
      const res = await api.get(`/contact/inquiries/${ticketNumber}`, {
        params: { email }
      });
      return {
        success: true,
        message: 'Inquiry retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Inquiry not found',
        error: error.message,
      };
    }
  }

  /**
   * Get all inquiries by email
   * 
   * @param email - Inquirer's email address
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * 
   * @returns List of inquiries for email
   * 
   * @example
   * const result = await contactService.getInquiriesByEmail('john@example.com');
   * if (result.success) {
   *   console.log(result.data?.inquiries);
   * }
   */
  async getInquiriesByEmail(
    email: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ServiceResponse<{
    inquiries: ContactInquiry[];
    total: number;
    pages: number;
  }>> {
    try {
      const res = await api.get('/contact/inquiries', {
        params: { email, page, limit }
      });
      return {
        success: true,
        message: 'Inquiries retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch inquiries',
        error: error.message,
      };
    }
  }

  /**
   * Add response to inquiry (support staff)
   * 
   * @param ticketNumber - Inquiry ticket number
   * @param responseMessage - Support team response
   * @param respondentEmail - Support staff email (note: usually from auth token)
   * 
   * @returns Updated inquiry with response
   * 
   * @example
   * const result = await contactService.respondToInquiry(
   *   'TKT-2024-001',
   *   'You can reschedule by clicking the link in your confirmation email'
   * );
   * if (result.success) {
   *   console.log('Response sent');
   * }
   */
  async respondToInquiry(
    ticketNumber: string,
    responseMessage: string,
    respondentEmail?: string
  ): Promise<ServiceResponse<{ inquiry: ContactInquiry }>> {
    try {
      const res = await api.post(`/contact/inquiries/${ticketNumber}/respond`, {
        message: responseMessage,
        respondentEmail
      });
      return {
        success: true,
        message: 'Response sent successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send response',
        error: error.message,
      };
    }
  }

  /**
   * Update inquiry status
   * 
   * @param ticketNumber - Inquiry ticket number
   * @param newStatus - New status value
   * 
   * @returns Updated inquiry
   * 
   * @example
   * const result = await contactService.updateInquiryStatus(
   *   'TKT-2024-001',
   *   'resolved'
   * );
   */
  async updateInquiryStatus(
    ticketNumber: string,
    newStatus: 'new' | 'assigned' | 'in-progress' | 'resolved' | 'closed'
  ): Promise<ServiceResponse<{ inquiry: ContactInquiry }>> {
    try {
      const res = await api.patch(`/contact/inquiries/${ticketNumber}`, {
        status: newStatus
      });
      return {
        success: true,
        message: 'Inquiry status updated successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update status',
        error: error.message,
      };
    }
  }

  /**
   * Close inquiry ticket
   * 
   * @param ticketNumber - Inquiry ticket number
   * @param closureReason - Reason for closure
   * 
   * @returns Closed inquiry
   * 
   * @example
   * const result = await contactService.closeInquiry(
   *   'TKT-2024-001',
   *   'Issue resolved'
   * );
   */
  async closeInquiry(
    ticketNumber: string,
    closureReason?: string
  ): Promise<ServiceResponse<{ inquiry: ContactInquiry }>> {
    try {
      const res = await api.post(`/contact/inquiries/${ticketNumber}/close`, {
        reason: closureReason
      });
      return {
        success: true,
        message: 'Inquiry closed successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to close inquiry',
        error: error.message,
      };
    }
  }

  /**
   * Get inquiry subjects/categories
   * 
   * @returns List of available inquiry subjects
   * 
   * @example
   * const result = await contactService.getInquirySubjects();
   * if (result.success) {
   *   console.log(result.data?.subjects);
   * }
   */
  async getInquirySubjects(): Promise<ServiceResponse<{
    subjects: Array<{
      value: string;
      label: string;
      description: string;
    }>;
  }>> {
    try {
      const res = await api.get('/contact/inquiries/subjects');
      return {
        success: true,
        message: 'Subjects retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch subjects',
        error: error.message,
      };
    }
  }

  /**
   * Upload attachment for inquiry
   * 
   * @param file - File to upload
   * 
   * @returns File upload details
   * 
   * @example
   * const result = await contactService.uploadAttachment(fileInput.files[0]);
   * if (result.success) {
   *   console.log('File ID:', result.data?.fileId);
   * }
   */
  async uploadAttachment(file: File): Promise<ServiceResponse<{
    fileId: string;
    fileName: string;
    size: number;
  }>> {
    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const res = await api.post('/contact/upload-attachment', formData);
      return {
        success: true,
        message: 'File uploaded successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to upload file',
        error: error.message,
      };
    }
  }

  /**
   * Request callback from support team
   * 
   * @param callbackData - Callback request details
   * - email: Email address
   * - phone: Preferred contact number
   * - subject: Brief description
   * - preferredTime: Preferred callback time
   * 
   * @returns Callback request confirmation
   * 
   * @example
   * const result = await contactService.requestCallback({
   *   email: 'john@example.com',
   *   phone: '9876543210',
   *   subject: 'Appointment issue',
   *   preferredTime: '10:00 AM - 12:00 PM'
   * });
   * if (result.success) {
   *   console.log('We will call you at your preferred time');
   * }
   */
  async requestCallback(callbackData: {
    email: string;
    phone: string;
    subject: string;
    preferredTime: string;
  }): Promise<ServiceResponse<{ callbackId: string; estimatedTime: string }>> {
    try {
      const res = await api.post('/contact/request-callback', callbackData);
      return {
        success: true,
        message: 'Callback request submitted successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to request callback',
        error: error.message,
      };
    }
  }

  /**
   * Send feedback about clinic/doctors
   * 
   * @param feedbackData - Feedback details
   * - name: Feedback submitter name
   * - email: Feedback submitter email
   * - subject: Feedback subject
   * - rating: Overall rating (1-5)
   * - message: Detailed feedback
   * 
   * @returns Feedback submission confirmation
   * 
   * @example
   * const result = await contactService.sendFeedback({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   subject: 'Appointment experience',
   *   rating: 5,
   *   message: 'Great service!'
   * });
   */
  async sendFeedback(feedbackData: {
    name: string;
    email: string;
    subject: string;
    rating: number;
    message: string;
  }): Promise<ServiceResponse<{ feedbackId: string }>> {
    try {
      const res = await api.post('/contact/feedback', feedbackData);
      return {
        success: true,
        message: 'Thank you for your feedback!',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit feedback',
        error: error.message,
      };
    }
  }

  /**
   * Check support availability
   * 
   * @returns Support team availability status
   * 
   * @example
   * const result = await contactService.checkAvailability();
   * if (result.success) {
   *   console.log(result.data?.available);
   *   console.log(result.data?.responseTime);
   * }
   */
  async checkAvailability(): Promise<ServiceResponse<{
    available: boolean;
    responseTime: string; // e.g., "2-4 hours"
    currentQueueSize: number;
    estimatedWaitTime: string;
  }>> {
    try {
      const res = await api.get('/contact/availability');
      return {
        success: true,
        message: 'Availability check successful',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check availability',
        error: error.message,
      };
    }
  }

  /**
   * Get FAQ and knowledge base articles
   * 
   * @param category - FAQ category (optional)
   * @param searchQuery - Search query (optional)
   * 
   * @returns FAQ articles and helpful resources
   * 
   * @example
   * const result = await contactService.getFAQ('appointment');
   * if (result.success) {
   *   console.log(result.data?.faqs);
   * }
   */
  async getFAQ(
    category?: string,
    searchQuery?: string
  ): Promise<ServiceResponse<{
    faqs: Array<{
      id: string;
      question: string;
      answer: string;
      category: string;
      helpful: number;
    }>;
  }>> {
    try {
      const params: any = {};
      if (category) params.category = category;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/contact/faq', { params });
      return {
        success: true,
        message: 'FAQs retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch FAQs',
        error: error.message,
      };
    }
  }
}

export default new ContactService();
