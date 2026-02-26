/**
 * Services Index
 * Central export point for all service modules
 * 
 * Usage:
 *   import { authService, userService, appointmentService } from '@/services';
 *   
 *   // Or use individual imports
 *   import authService from '@/services/authService';
 */

export { default as authService } from './authService';
export { default as userService } from './userService';
export { default as appointmentService } from './appointmentService';
export { default as prescriptionService } from './prescriptionService';
export { default as consultationService } from './consultationService';
export { default as notificationService } from './notificationService';
export { default as medicalHistoryService } from './medicalHistoryService';
export { default as videoService } from './videoService';
export { default as adminService } from './adminService';
export { default as publicService } from './publicService';
export { default as guestService } from './guestService';
export { default as contactService } from './contactService';

// Re-export types for convenience
export type { LoginResponse, RegisterResponse, RefreshTokenResponse, AuthResponse } from './authService';
export type { User, ServiceResponse } from './userService';
export type { Appointment } from './appointmentService';
export type { Medication, Prescription } from './prescriptionService';
export type { ConsultationForm } from './consultationService';
export type { Notification } from './notificationService';
export type { MedicalHistoryRecord } from './medicalHistoryService';
export type { VideoSession } from './videoService';
export type { DashboardStats } from './adminService';
export type { PublicDoctorProfile, DoctorReview, Specialization } from './publicService';
export type { GuestAppointment, GuestConsultationForm } from './guestService';
export type { ContactInquiry } from './contactService';

// Default exports for convenience
import authService from './authService';
import userService from './userService';
import appointmentService from './appointmentService';
import prescriptionService from './prescriptionService';
import consultationService from './consultationService';
import notificationService from './notificationService';
import medicalHistoryService from './medicalHistoryService';
import videoService from './videoService';
import adminService from './adminService';
import publicService from './publicService';
import guestService from './guestService';
import contactService from './contactService';

/**
 * Service registry - all services in one place
 * Useful for dependency injection or factory patterns
 */
export const services = {
  auth: authService,
  user: userService,
  appointment: appointmentService,
  prescription: prescriptionService,
  consultation: consultationService,
  notification: notificationService,
  medicalHistory: medicalHistoryService,
  video: videoService,
  admin: adminService,
  public: publicService,
  guest: guestService,
  contact: contactService,
};

export default services;
