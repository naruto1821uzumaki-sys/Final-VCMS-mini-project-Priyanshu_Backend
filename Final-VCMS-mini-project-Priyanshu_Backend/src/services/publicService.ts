/**
 * Public Service - Guest-accessible doctor and appointment features
 * 
 * Handles:
 * - Public doctor profiles and listings
 * - Doctor ratings and reviews
 * - Specialization browsing
 * - Guest-friendly doctor information
 * 
 * @module services/publicService
 */

import api from './api';

/**
 * Doctor public profile response type
 */
export interface PublicDoctorProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  qualifications: string[];
  experience: number; // years
  bio: string;
  avatar?: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  consultationFee: number;
  rating: number; // 0-5
  totalReviews: number;
  responseTime: string; // e.g., "24 hours"
  availability: Array<{ day: string; startTime: string; endTime: string }>;
  availableOnline: boolean;
  availablePhysical: boolean;
  approvalStatus?: 'approved' | 'pending' | 'rejected' | 'suspended';
}

/**
 * Doctor review type
 */
export interface DoctorReview {
  _id: string;
  doctorId: string;
  patientName: string;
  rating: number; // 1-5
  comment: string;
  verifiedBooking: boolean;
  createdAt: string;
  helpful: number;
}

/**
 * Specialization type
 */
export interface Specialization {
  _id: string;
  name: string;
  description: string;
  doctorCount: number;
  icon?: string;
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
 * Public Service - All guest-accessible doctor features
 */
class PublicService {
  /**
   * Get list of all public specializations
   * 
   * @returns List of specializations with doctor counts
   * 
   * @example
   * const result = await publicService.getSpecializations();
   * if (result.success) {
   *   console.log(result.data?.specializations);
   * }
   */
  async getSpecializations(): Promise<ServiceResponse<{ specializations: Specialization[] }>> {
    try {
      const res = await api.get('/public/specializations');
      return {
        success: true,
        message: 'Specializations retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch specializations',
        error: error.message,
      };
    }
  }

  /**
   * Get list of all approved doctors
   * 
   * @param page - Page number for pagination (default: 1)
   * @param limit - Items per page (default: 10)
   * @param specialization - Filter by specialization (optional)
   * @param search - Search by name or location (optional)
   * @param sortBy - Sort field: 'rating', 'experience', 'name' (default: 'rating')
   * 
   * @returns Paginated list of public doctor profiles
   * 
   * @example
   * const result = await publicService.getDoctors(1, 10, 'Cardiology');
   * if (result.success) {
   *   console.log(result.data?.doctors);
   *   console.log(result.data?.total);
   * }
   */
  async getDoctors(
    page: number = 1,
    limit: number = 10,
    specialization?: string,
    search?: string,
    sortBy: string = 'rating'
  ): Promise<ServiceResponse<{ doctors: PublicDoctorProfile[]; total: number; pages: number }>> {
    try {
      const params: any = { page, limit, sortBy };
      if (specialization) params.specialization = specialization;
      if (search) params.search = search;

      const res = await api.get('/public/doctors', { params });
      return {
        success: true,
        message: 'Doctors retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch doctors',
        error: error.message,
      };
    }
  }

  /**
   * Get full public profile for a specific doctor
   * 
   * @param doctorId - Doctor's ID
   * 
   * @returns Complete public doctor profile with all details
   * 
   * @example
   * const result = await publicService.getDoctorProfile('doctor123');
   * if (result.success) {
   *   console.log(result.data?.doctor);
   * }
   */
  async getDoctorProfile(doctorId: string): Promise<ServiceResponse<{ doctor: PublicDoctorProfile }>> {
    try {
      const res = await api.get(`/public/doctors/${doctorId}`);
      return {
        success: true,
        message: 'Doctor profile retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch doctor profile',
        error: error.message,
      };
    }
  }

  /**
   * Get doctors by specialization
   * 
   * @param specialization - Specialization name or ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * 
   * @returns Doctors in specified specialization
   * 
   * @example
   * const result = await publicService.getDoctorsBySpecialization('Cardiology', 1, 20);
   * if (result.success) {
   *   console.log(result.data?.doctors);
   * }
   */
  async getDoctorsBySpecialization(
    specialization: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ServiceResponse<{ doctors: PublicDoctorProfile[]; total: number }>> {
    try {
      const res = await api.get('/public/doctors/by-specialization', {
        params: { specialization, page, limit }
      });
      return {
        success: true,
        message: 'Doctors retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch doctors',
        error: error.message,
      };
    }
  }

  /**
   * Search doctors by name, city, or specialization
   * 
   * @param query - Search query
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * 
   * @returns Matching doctors
   * 
   * @example
   * const result = await publicService.searchDoctors('Dr. Smith Cardio', 1, 10);
   * if (result.success) {
   *   console.log(result.data?.doctors);
   * }
   */
  async searchDoctors(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ServiceResponse<{ doctors: PublicDoctorProfile[]; total: number }>> {
    try {
      const res = await api.get('/public/doctors/search', {
        params: { q: query, page, limit }
      });
      return {
        success: true,
        message: 'Search completed successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Search failed',
        error: error.message,
      };
    }
  }

  /**
   * Get reviews for a specific doctor
   * 
   * @param doctorId - Doctor's ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 5)
   * @param sortBy - Sort by 'recent', 'helpful', 'rating' (default: 'recent')
   * 
   * @returns Paginated reviews with ratings
   * 
   * @example
   * const result = await publicService.getDoctorReviews('doctor123', 1, 5);
   * if (result.success) {
   *   console.log(result.data?.reviews);
   *   console.log(result.data?.averageRating);
   * }
   */
  async getDoctorReviews(
    doctorId: string,
    page: number = 1,
    limit: number = 5,
    sortBy: string = 'recent'
  ): Promise<ServiceResponse<{
    reviews: DoctorReview[];
    total: number;
    averageRating: number;
    ratingBreakdown: Record<number, number>;
  }>> {
    try {
      const res = await api.get(`/public/doctors/${doctorId}/reviews`, {
        params: { page, limit, sortBy }
      });
      return {
        success: true,
        message: 'Reviews retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch reviews',
        error: error.message,
      };
    }
  }

  /**
   * Submit a review for a doctor (verified booking only)
   * 
   * @param appointmentId - Completed appointment ID
   * @param doctorId - Doctor ID
   * @param rating - Rating 1-5
   * @param comment - Review comment
   * 
   * @returns Created review
   * 
   * @example
   * const result = await publicService.submitReview(
   *   'apt123',
   *   'doc123',
   *   5,
   *   'Excellent consultation!'
   * );
   * if (result.success) {
   *   console.log('Review submitted');
   * }
   */
  async submitReview(
    appointmentId: string,
    doctorId: string,
    rating: number,
    comment: string
  ): Promise<ServiceResponse<{ review: DoctorReview }>> {
    try {
      const res = await api.post('/public/reviews', {
        appointmentId,
        doctorId,
        rating,
        comment,
      });
      return {
        success: true,
        message: 'Review submitted successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit review',
        error: error.message,
      };
    }
  }

  /**
   * Get doctors sorted by rating
   * 
   * @param minRating - Minimum rating threshold (default: 0)
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * 
   * @returns Top-rated doctors
   * 
   * @example
   * const result = await publicService.getTopRatedDoctors(4.5, 1, 10);
   * if (result.success) {
   *   console.log(result.data?.doctors);
   * }
   */
  async getTopRatedDoctors(
    minRating: number = 0,
    page: number = 1,
    limit: number = 10
  ): Promise<ServiceResponse<{ doctors: PublicDoctorProfile[]; total: number }>> {
    try {
      const res = await api.get('/public/doctors/top-rated', {
        params: { minRating, page, limit }
      });
      return {
        success: true,
        message: 'Top rated doctors retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch top rated doctors',
        error: error.message,
      };
    }
  }

  /**
   * Get doctors with most recent availability
   * 
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * 
   * @returns Doctors with recent slot availability
   * 
   * @example
   * const result = await publicService.getAvailableDoctors();
   * if (result.success) {
   *   console.log(result.data?.doctors);
   * }
   */
  async getAvailableDoctors(
    page: number = 1,
    limit: number = 10
  ): Promise<ServiceResponse<{ doctors: PublicDoctorProfile[]; total: number }>> {
    try {
      const res = await api.get('/public/doctors/available', {
        params: { page, limit }
      });
      return {
        success: true,
        message: 'Available doctors retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch available doctors',
        error: error.message,
      };
    }
  }

  /**
   * Get doctors available for online consultation
   * 
   * @param specialization - Filter by specialization (optional)
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * 
   * @returns Doctors offering online consultations
   * 
   * @example
   * const result = await publicService.getOnlineDoctors('Psychiatry');
   * if (result.success) {
   *   console.log(result.data?.doctors);
   * }
   */
  async getOnlineDoctors(
    specialization?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ServiceResponse<{ doctors: PublicDoctorProfile[]; total: number }>> {
    try {
      const params: any = { page, limit };
      if (specialization) params.specialization = specialization;

      const res = await api.get('/public/doctors/online', { params });
      return {
        success: true,
        message: 'Online doctors retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch online doctors',
        error: error.message,
      };
    }
  }

  /**
   * Get doctor's availability for a specific date range
   * 
   * @param doctorId - Doctor's ID
   * @param fromDate - Start date (YYYY-MM-DD)
   * @param toDate - End date (YYYY-MM-DD)
   * 
   * @returns Available time slots
   * 
   * @example
   * const result = await publicService.getDoctorAvailability(
   *   'doc123',
   *   '2024-02-20',
   *   '2024-02-25'
   * );
   * if (result.success) {
   *   console.log(result.data?.availability);
   * }
   */
  async getDoctorAvailability(
    doctorId: string,
    fromDate: string,
    toDate: string
  ): Promise<ServiceResponse<{
    availability: Record<string, string[]>;
  }>> {
    try {
      const res = await api.get(`/public/doctors/${doctorId}/availability`, {
        params: { fromDate, toDate }
      });
      return {
        success: true,
        message: 'Availability retrieved successfully',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch availability',
        error: error.message,
      };
    }
  }
}

export default new PublicService();
