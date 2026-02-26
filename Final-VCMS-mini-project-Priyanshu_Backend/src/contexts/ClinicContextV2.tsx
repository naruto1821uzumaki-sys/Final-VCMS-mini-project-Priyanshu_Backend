import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import api from "@/services/api";
import { socketService, SocketEvent } from "@/services/socketService";
import { offlineStorage } from "@/services/offlineStorage";

// Type definitions
export interface Appointment {
  id: string;
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
  cancelReason?: string;
  consultationFee?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Prescription {
  id: string;
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
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SyncStats {
  lastSynced: Date | null;
  appointmentsCount: number;
  prescriptionsCount: number;
  pendingChanges: number;
}

export interface ClinicContextType {
  // State
  appointments: Appointment[];
  prescriptions: Prescription[];
  syncStatus: "synced" | "syncing" | "offline" | "error";
  syncStats: SyncStats;

  // Appointment operations
  bookAppointment: (apt: Omit<Appointment, "id" | "status" | "createdAt" | "updatedAt">) => Promise<boolean>;
  updateAppointmentStatus: (id: string, status: Appointment["status"]) => Promise<boolean>;
  acceptAppointment: (id: string) => Promise<boolean>;
  rejectAppointment: (id: string, reason: string) => Promise<boolean>;
  cancelAppointment: (id: string, reason?: string) => Promise<boolean>;

  // Prescription operations
  addPrescription: (rx: Omit<Prescription, "id" | "createdAt" | "updatedAt">) => Promise<boolean>;
  updatePrescription: (id: string, rx: Partial<Prescription>) => Promise<boolean>;
  deletePrescription: (id: string) => Promise<boolean>;

  // Query operations
  getPrescriptionByAppointment: (appointmentId: string) => Prescription | undefined;
  isSlotBooked: (doctorId: string, date: string, time: string) => boolean;
  getAppointmentById: (id: string) => Appointment | undefined;

  // Sync operations
  syncData: () => Promise<void>;
  getOfflineData: () => { appointments: Appointment[]; prescriptions: Prescription[] };

  // Real-time subscriptions
  subscribeToAppointments: (callback: (apt: Appointment) => void) => () => void;
  subscribeToPrescriptions: (callback: (rx: Prescription) => void) => () => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

// Mock data
const mockAppointments: Appointment[] = [
  {
    id: "apt-1",
    patientId: "pat-1",
    patientName: "John Doe",
    patientAge: 32,
    patientMedicalHistory: "No significant history",
    doctorId: "doc-1",
    doctorName: "Dr. Rajesh Sharma",
    specialization: "Cardiology",
    location: "Mumbai",
    date: "2026-02-14",
    time: "10:00",
    status: "Accepted",
    consultationFee: 500,
  },
];

const mockPrescriptions: Prescription[] = [];

// Provider component
export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    return offlineStorage.get<Appointment[]>("clinic_appointments", mockAppointments);
  });

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    return offlineStorage.get<Prescription[]>("clinic_prescriptions", mockPrescriptions);
  });

  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">("offline");
  const [syncStats, setSyncStats] = useState<SyncStats>({
    lastSynced: null,
    appointmentsCount: appointments.length,
    prescriptionsCount: prescriptions.length,
    pendingChanges: 0,
  });

  // Refs
  const syncLockedRef = useRef(false);
  const appointmentSubscribersRef = useRef<Set<(apt: Appointment) => void>>(new Set());
  const prescriptionSubscribersRef = useRef<Set<(rx: Prescription) => void>>(new Set());

  // Persist to offline storage
  useEffect(() => {
    offlineStorage.set("clinic_appointments", appointments);
    updateSyncStats();
  }, [appointments]);

  useEffect(() => {
    offlineStorage.set("clinic_prescriptions", prescriptions);
    updateSyncStats();
  }, [prescriptions]);

  // Update sync stats
  const updateSyncStats = useCallback(() => {
    setSyncStats((prev) => ({
      ...prev,
      appointmentsCount: appointments.length,
      prescriptionsCount: prescriptions.length,
    }));
  }, [appointments.length, prescriptions.length]);

  // Setup Socket.io real-time listeners
  useEffect(() => {
    socketService.on(SocketEvent.APPOINTMENT_CREATED, (apt: Appointment) => {
      setAppointments((prev) => [...prev, apt]);
      appointmentSubscribersRef.current.forEach((cb) => cb(apt));
    });

    socketService.on(SocketEvent.APPOINTMENT_UPDATED, (apt: Appointment) => {
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? apt : a)));
      appointmentSubscribersRef.current.forEach((cb) => cb(apt));
    });

    socketService.on(SocketEvent.APPOINTMENT_CANCELLED, (apt: Appointment) => {
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? apt : a)));
      appointmentSubscribersRef.current.forEach((cb) => cb(apt));
    });

    socketService.on(SocketEvent.APPOINTMENT_STATUS_CHANGED, (apt: Appointment) => {
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? apt : a)));
      appointmentSubscribersRef.current.forEach((cb) => cb(apt));
    });

    socketService.on(SocketEvent.PRESCRIPTION_CREATED, (rx: Prescription) => {
      setPrescriptions((prev) => [...prev, rx]);
      prescriptionSubscribersRef.current.forEach((cb) => cb(rx));
    });

    socketService.on(SocketEvent.PRESCRIPTION_UPDATED, (rx: Prescription) => {
      setPrescriptions((prev) => prev.map((p) => (p.id === rx.id ? rx : p)));
      prescriptionSubscribersRef.current.forEach((cb) => cb(rx));
    });

    return () => {
      socketService.off(SocketEvent.APPOINTMENT_CREATED);
      socketService.off(SocketEvent.APPOINTMENT_UPDATED);
      socketService.off(SocketEvent.APPOINTMENT_CANCELLED);
      socketService.off(SocketEvent.APPOINTMENT_STATUS_CHANGED);
      socketService.off(SocketEvent.PRESCRIPTION_CREATED);
      socketService.off(SocketEvent.PRESCRIPTION_UPDATED);
    };
  }, []);

  // Sync data from server
  const syncData = useCallback(async () => {
    if (syncLockedRef.current) return;

    syncLockedRef.current = true;
    setSyncStatus("syncing");

    try {
      const [aptRes, rxRes] = await Promise.all([
        api.get("/appointments").catch(() => ({ data: { appointments: [] } })),
        api.get("/prescriptions").catch(() => ({ data: { prescriptions: [] } })),
      ]);

      const apts = aptRes.data.appointments || aptRes.data;
      const rxs = rxRes.data.prescriptions || rxRes.data;

      if (Array.isArray(apts)) {
        setAppointments(apts.length > 0 ? apts : mockAppointments);
      }

      if (Array.isArray(rxs)) {
        setPrescriptions(rxs.length > 0 ? rxs : mockPrescriptions);
      }

      setSyncStatus("synced");
      setSyncStats((prev) => ({
        ...prev,
        lastSynced: new Date(),
      }));
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus("error");
    } finally {
      syncLockedRef.current = false;
    }
  }, []);

  // Book appointment
  const bookAppointment = useCallback(
    async (apt: Omit<Appointment, "id" | "status" | "createdAt" | "updatedAt">) => {
      try {
        setSyncStatus("syncing");

        const res = await api.post("/appointments", {
          ...apt,
          status: "Booked",
        });

        if (res.status === 201) {
          const newApt = res.data.appointment || {
            ...apt,
            id: `apt-${Date.now()}`,
            status: "Booked",
          };

          setAppointments((prev) => [...prev, newApt]);
          socketService.emit(SocketEvent.APPOINTMENT_CREATED, newApt);
          setSyncStatus("synced");
          return true;
        }

        return false;
      } catch (error) {
        console.error("Book appointment error:", error);
        setSyncStatus("error");
        return false;
      }
    },
    []
  );

  // Update appointment status
  const updateAppointmentStatus = useCallback(async (id: string, status: Appointment["status"]) => {
    try {
      setSyncStatus("syncing");

      const res = await api.put(`/appointments/${id}`, { status });

      if (res.status === 200) {
        const updatedApt = res.data.appointment || { id, status };
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedApt } : a)));
        socketService.emit(SocketEvent.APPOINTMENT_STATUS_CHANGED, updatedApt);
        setSyncStatus("synced");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Update appointment status error:", error);
      setSyncStatus("error");
      return false;
    }
  }, []);

  // Accept appointment
  const acceptAppointment = useCallback(
    async (id: string) => updateAppointmentStatus(id, "Accepted"),
    [updateAppointmentStatus]
  );

  // Reject appointment
  const rejectAppointment = useCallback(async (id: string, reason: string) => {
    try {
      setSyncStatus("syncing");

      const res = await api.put(`/appointments/${id}`, {
        status: "Cancelled",
        cancelReason: reason,
      });

      if (res.status === 200) {
        const updatedApt = res.data.appointment || { id, status: "Cancelled", cancelReason: reason };
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedApt } : a)));
        socketService.emit(SocketEvent.APPOINTMENT_CANCELLED, updatedApt);
        setSyncStatus("synced");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Reject appointment error:", error);
      setSyncStatus("error");
      return false;
    }
  }, []);

  // Cancel appointment
  const cancelAppointment = useCallback(async (id: string, reason?: string) => {
    try {
      setSyncStatus("syncing");

      const res = await api.put(`/appointments/${id}`, {
        status: "Cancelled",
        cancelReason: reason || "Cancelled by admin",
      });

      if (res.status === 200) {
        const updatedApt = res.data.appointment || {
          id,
          status: "Cancelled",
          cancelReason: reason || "Cancelled by admin",
        };
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedApt } : a)));
        socketService.emit(SocketEvent.APPOINTMENT_CANCELLED, updatedApt);
        setSyncStatus("synced");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Cancel appointment error:", error);
      setSyncStatus("error");
      return false;
    }
  }, []);

  // Add prescription
  const addPrescription = useCallback(async (rx: Omit<Prescription, "id" | "createdAt" | "updatedAt">) => {
    try {
      setSyncStatus("syncing");

      const res = await api.post("/prescriptions", rx);

      if (res.status === 201) {
        const newRx = res.data.prescription || {
          ...rx,
          id: `rx-${Date.now()}`,
        };

        setPrescriptions((prev) => [...prev, newRx]);
        socketService.emit(SocketEvent.PRESCRIPTION_CREATED, newRx);
        setSyncStatus("synced");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Add prescription error:", error);
      setSyncStatus("error");
      return false;
    }
  }, []);

  // Update prescription
  const updatePrescription = useCallback(async (id: string, rx: Partial<Prescription>) => {
    try {
      setSyncStatus("syncing");

      const res = await api.put(`/prescriptions/${id}`, rx);

      if (res.status === 200) {
        const updatedRx = res.data.prescription || { id, ...rx };
        setPrescriptions((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatedRx } : p)));
        socketService.emit(SocketEvent.PRESCRIPTION_UPDATED, updatedRx);
        setSyncStatus("synced");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Update prescription error:", error);
      setSyncStatus("error");
      return false;
    }
  }, []);

  // Delete prescription
  const deletePrescription = useCallback(async (id: string) => {
    try {
      setSyncStatus("syncing");

      const res = await api.delete(`/prescriptions/${id}`);

      if (res.status === 200) {
        setPrescriptions((prev) => prev.filter((p) => p.id !== id));
        socketService.emit("prescription:deleted", { id });
        setSyncStatus("synced");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Delete prescription error:", error);
      setSyncStatus("error");
      return false;
    }
  }, []);

  // Get prescription by appointment
  const getPrescriptionByAppointment = useCallback(
    (appointmentId: string) => prescriptions.find((p) => p.appointmentId === appointmentId),
    [prescriptions]
  );

  // Is slot booked
  const isSlotBooked = useCallback(
    (doctorId: string, date: string, time: string) => {
      return appointments.some(
        (a) => a.doctorId === doctorId && a.date === date && a.time === time && a.status !== "Cancelled"
      );
    },
    [appointments]
  );

  // Get appointment by ID
  const getAppointmentById = useCallback(
    (id: string) => appointments.find((a) => a.id === id),
    [appointments]
  );

  // Get offline data
  const getOfflineData = useCallback(
    () => ({
      appointments: offlineStorage.get("clinic_appointments", appointments),
      prescriptions: offlineStorage.get("clinic_prescriptions", prescriptions),
    }),
    [appointments, prescriptions]
  );

  // Subscribe to appointments
  const subscribeToAppointments = useCallback(
    (callback: (apt: Appointment) => void) => {
      appointmentSubscribersRef.current.add(callback);
      return () => {
        appointmentSubscribersRef.current.delete(callback);
      };
    },
    []
  );

  // Subscribe to prescriptions
  const subscribeToPrescriptions = useCallback((callback: (rx: Prescription) => void) => {
    prescriptionSubscribersRef.current.add(callback);
    return () => {
      prescriptionSubscribersRef.current.delete(callback);
    };
  }, []);

  const value: ClinicContextType = {
    appointments,
    prescriptions,
    syncStatus,
    syncStats,
    bookAppointment,
    updateAppointmentStatus,
    acceptAppointment,
    rejectAppointment,
    cancelAppointment,
    addPrescription,
    updatePrescription,
    deletePrescription,
    getPrescriptionByAppointment,
    isSlotBooked,
    getAppointmentById,
    syncData,
    getOfflineData,
    subscribeToAppointments,
    subscribeToPrescriptions,
  };

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
};

// Hook to use context
export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within ClinicProvider");
  }
  return context;
};

export default ClinicContext;
