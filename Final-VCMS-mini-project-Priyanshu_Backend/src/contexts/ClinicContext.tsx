import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/services/api";
import { useAuth } from "./AuthContext";

export interface Appointment {
  id: string;
  _id?: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientMedicalHistory?: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  location?: string;
  date: string;
  time: string;
  status: "Booked" | "Accepted" | "In Progress" | "Completed" | "Cancelled";
  symptoms?: string;
  cancelReason?: string;
  consultationFee?: number;
}

export interface Prescription {
  id: string;
  _id?: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  date: string;
  medicineName: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface ClinicContextType {
  appointments: Appointment[];
  prescriptions: Prescription[];
  bookAppointment: (apt: Omit<Appointment, "id" | "status">) => Promise<{ success: boolean; message: string }>;
  updateAppointmentStatus: (id: string, status: Appointment["status"]) => Promise<void>;
  acceptAppointment: (id: string) => Promise<{ success: boolean; message: string }>;
  rejectAppointment: (id: string, reason: string) => Promise<{ success: boolean; message: string }>;
  cancelAppointment: (id: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  addPrescription: (rx: Omit<Prescription, "id">) => Promise<{ success: boolean; message: string }>;
  getPrescriptionByAppointment: (appointmentId: string) => Prescription | undefined;
  isSlotBooked: (doctorId: string, date: string, time: string) => boolean;
  fetchAppointments: () => Promise<void>;
  fetchPrescriptions: () => Promise<void>;
}

// Helper function to map DB status to UI status
const mapStatusDbToUI = (dbStatus: string): Appointment["status"] => {
  const statusMap: Record<string, Appointment["status"]> = {
    pending: "Booked",
    confirmed: "Accepted",
    "in-progress": "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return statusMap[dbStatus] || ("Booked" as any);
};

// Helper function to map UI status to DB status
const mapStatusUiToDb = (uiStatus: Appointment["status"]): string => {
  const statusMap: Record<Appointment["status"], string> = {
    Booked: "pending",
    Accepted: "confirmed",
    "In Progress": "in-progress",
    Completed: "completed",
    Cancelled: "cancelled",
  };
  return statusMap[uiStatus];
};

// Helper function to map appointment from DB to UI format
const mapAppointmentDbToUI = (dbApt: any): Appointment => {
  return {
    id: dbApt._id?.toString() || dbApt.id,
    _id: dbApt._id?.toString(),
    patientId: dbApt.patientId?._id?.toString() || dbApt.patientId,
    patientName: dbApt.patientId?.name || "Unknown",
    patientAge: dbApt.patientId?.age,
    patientMedicalHistory: dbApt.patientId?.medicalHistory,
    doctorId: dbApt.doctorId?._id?.toString() || dbApt.doctorId,
    doctorName: dbApt.doctorId?.name ? `Dr. ${dbApt.doctorId.name}` : "Dr. Unknown",
    specialization: dbApt.doctorId?.specialization || "General",
    location: dbApt.doctorId?.location,
    date: new Date(dbApt.date).toISOString().split("T")[0],
    time: dbApt.time,
    status: mapStatusDbToUI(dbApt.status),
    symptoms: dbApt.symptoms || '',
    consultationFee: dbApt.doctorId?.consultationFee,
    cancelReason: dbApt.cancellationReason || dbApt.notes || '',
  };
};

// Helper function to map prescription from DB to UI format
const mapPrescriptionDbToUI = (dbRx: any): Prescription => {
  // Get first medication for display (since DB has array)
  const firstMed = dbRx.medications?.[0] || {};
  return {
    id: dbRx._id?.toString() || dbRx.id,
    _id: dbRx._id?.toString(),
    appointmentId: dbRx.appointmentId?._id?.toString() || dbRx.appointmentId,
    doctorId: dbRx.doctorId?._id?.toString() || dbRx.doctorId,
    doctorName: dbRx.doctorId?.name ? `Dr. ${dbRx.doctorId.name}` : "Dr. Unknown",
    patientId: dbRx.patientId?._id?.toString() || dbRx.patientId,
    patientName: dbRx.patientId?.name || "Unknown",
    date: new Date(dbRx.createdAt || dbRx.date).toISOString().split("T")[0],
    medicineName: firstMed.name || "",
    dosage: firstMed.dosage || "",
    duration: firstMed.duration || "",
    instructions: firstMed.instructions || "",
  };
};

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  // Fetch appointments from backend
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get('/appointments', { params: { limit: 1000 } });
      const apts = res.data.appointments || res.data.data || [];
      
      if (Array.isArray(apts)) {
        const mappedApts = apts.map(mapAppointmentDbToUI);
        setAppointments(mappedApts);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setAppointments([]);
    }
  }, []);

  // Fetch prescriptions from backend
  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await api.get('/prescriptions', { params: { limit: 1000 } });
      const rxs = res.data.prescriptions || res.data.data || [];
      
      if (Array.isArray(rxs)) {
        const mappedRxs = rxs.map(mapPrescriptionDbToUI);
        setPrescriptions(mappedRxs);
      }
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
      setPrescriptions([]);
    }
  }, []);

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchPrescriptions();
    }
  }, [user, fetchAppointments, fetchPrescriptions]);

  const bookAppointment = useCallback(async (apt: Omit<Appointment, "id" | "status">) => {
    try {
      const res = await api.post('/appointments', {
        doctorId: apt.doctorId,
        date: apt.date,
        time: apt.time,
        symptoms: apt.cancelReason || "",
        notes: "",
        type: "video",
      });

      if (res.status === 201) {
        await fetchAppointments();
        return { success: true, message: 'Appointment booked successfully' };
      }
      return { success: false, message: 'Failed to book appointment' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error booking appointment';
      return { success: false, message: msg };
    }
  }, [fetchAppointments]);

  const acceptAppointment = useCallback(async (id: string) => {
    try {
      const res = await api.post(`/appointments/${id}/accept`);
      if (res.status === 200) {
        await fetchAppointments();
        return { success: true, message: 'Appointment accepted' };
      }
      return { success: false, message: 'Failed to accept appointment' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error accepting appointment';
      return { success: false, message: msg };
    }
  }, [fetchAppointments]);

  const rejectAppointment = useCallback(async (id: string, reason: string) => {
    try {
      const res = await api.post(`/appointments/${id}/reject`, { reason });
      if (res.status === 200) {
        await fetchAppointments();
        return { success: true, message: 'Appointment rejected' };
      }
      return { success: false, message: 'Failed to reject appointment' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error rejecting appointment';
      return { success: false, message: msg };
    }
  }, [fetchAppointments]);

  const cancelAppointment = useCallback(async (id: string, reason?: string) => {
    try {
      const res = await api.post(`/appointments/${id}/cancel`, { reason: reason || "Cancelled" });
      if (res.status === 200) {
        await fetchAppointments();
        return {success: true, message: 'Appointment cancelled' };
      }
      return { success: false, message: 'Failed to cancel appointment' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error cancelling appointment';
      return { success: false, message: msg };
    }
  }, [fetchAppointments]);

  const updateAppointmentStatus = useCallback(async (id: string, status: Appointment["status"]) => {
    try {
      const dbStatus = mapStatusUiToDb(status);
      await api.put(`/appointments/${id}/status`, { status: dbStatus });
      await fetchAppointments();
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }
  }, [fetchAppointments]);

  const addPrescription = useCallback(async (rx: Omit<Prescription, "id">) => {
    try {
      const res = await api.post('/prescriptions', {
        appointmentId: rx.appointmentId,
        medications: [{
          name: rx.medicineName,
          dosage: rx.dosage,
          frequency: "as prescribed",
          duration: rx.duration,
          instructions: rx.instructions,
        }],
        diagnosis: "See medications",
        clinicalNotes: "",
        treatmentPlan: "",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      if (res.status === 201) {
        await fetchPrescriptions();
        return { success: true, message: 'Prescription created' };
      }
      return { success: false, message: 'Failed to create prescription' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error creating prescription';
      return { success: false, message: msg };
    }
  }, [fetchPrescriptions]);

  const getPrescriptionByAppointment = useCallback(
    (appointmentId: string) => prescriptions.find((p) => p.appointmentId === appointmentId),
    [prescriptions]
  );

  const isSlotBooked = useCallback(
    (doctorId: string, date: string, time: string) => {
      return appointments.some(
        (a) => a.doctorId === doctorId && a.date === date && a.time === time && a.status !== "Cancelled"
      );
    },
    [appointments]
  );

  return (
    <ClinicContext.Provider
      value={{
        appointments,
        prescriptions,
        bookAppointment,
        updateAppointmentStatus,
        acceptAppointment,
        rejectAppointment,
        cancelAppointment,
        addPrescription,
        getPrescriptionByAppointment,
        isSlotBooked,
        fetchAppointments,
        fetchPrescriptions,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error("useClinic must be used within ClinicProvider");
  return context;
};
