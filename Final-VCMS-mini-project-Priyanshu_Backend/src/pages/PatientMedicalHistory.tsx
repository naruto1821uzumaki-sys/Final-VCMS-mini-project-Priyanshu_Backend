import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock, MapPin, Stethoscope, IndianRupee, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface MedicalHistoryRecord {
  _id: string;
  patientId: string;
  doctorId?: string;
  doctorName?: string;
  condition: string;
  description?: string;
  diagnosis?: string;
  treatment?: string;
  createdAt: string;
  isDoctorCreated: boolean;
}

const PatientMedicalHistory = () => {
  const { user } = useAuth();
  const { appointments, getPrescriptionByAppointment } = useClinic();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ condition: "", description: "", diagnosis: "", treatment: "" });
  const [loading, setLoading] = useState(false);

  const pastAppointments = appointments
    .filter((a) => a.patientId === user?._id && (a.status?.toLowerCase() === "completed" || a.status?.toLowerCase() === "cancelled"))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Fetch medical history on mount
  useEffect(() => {
    if (user?._id) {
      fetchMedicalHistory();
    }
  }, [user?._id]);

  // Socket listener for real-time medical history updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMedicalHistory = (data: any) => {
      if (data.patientId === user?._id) {
        setMedicalHistory((prev) => [data, ...prev]);
        toast({ title: "New medical record added", description: "Doctor has recorded new medical information." });
      }
    };

    socket.on("medical-history:created", handleNewMedicalHistory);
    return () => socket.off("medical-history:created", handleNewMedicalHistory);
  }, [socket, user?._id, toast]);

  const fetchMedicalHistory = async () => {
    try {
      const res = await api.get(`/medical-history/patient/${user?._id}`);
      if (res.data?.success) {
        setMedicalHistory(res.data.medicalHistory || []);
      }
    } catch (err) {
      console.error("Error fetching medical history:", err);
    }
  };

  const handleAddMedicalHistory = async () => {
    if (!formData.condition.trim()) {
      toast({ title: "Condition is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/medical-history/patient/self", {
        condition: formData.condition,
        description: formData.description,
        diagnosis: formData.diagnosis,
        treatment: formData.treatment,
      });

      if (res.data?.success) {
        toast({ title: "Medical history recorded", description: res.data.message });
        setFormData({ condition: "", description: "", diagnosis: "", treatment: "" });
        setShowAddForm(false);
        fetchMedicalHistory();
      } else {
        toast({ title: "Failed", description: res.data?.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to save medical history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Medical History</h1>
      <p className="text-muted-foreground">Your medical records and past appointments.</p>

      {/* Patient's own medical history from registration */}
      {user?.medicalHistory && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">General Medical History (from registration)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{user.medicalHistory}</p>
          </CardContent>
        </Card>
      )}

      {/* Self-reported medical history form */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Add Medical Record</CardTitle>
          {!showAddForm && (
            <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          )}
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-3">
            <Input
              placeholder="Medical condition *"
              value={formData.condition}
              onChange={(e) => setFormData((p) => ({ ...p, condition: e.target.value }))}
            />
            <Textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
            <Textarea
              placeholder="Diagnosis (optional)"
              value={formData.diagnosis}
              onChange={(e) => setFormData((p) => ({ ...p, diagnosis: e.target.value }))}
              rows={2}
            />
            <Textarea
              placeholder="Treatment (optional)"
              value={formData.treatment}
              onChange={(e) => setFormData((p) => ({ ...p, treatment: e.target.value }))}
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddMedicalHistory} disabled={loading}>
                {loading ? "Saving..." : "Save Record"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Self-reported records */}
      {medicalHistory.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Your Medical Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {medicalHistory.map((record) => (
              <div key={record._id} className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{record.condition}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleDateString()}
                      {record.doctorName && ` • by Dr. ${record.doctorName}`}
                    </p>
                  </div>
                  {record.isDoctorCreated && (
                    <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded">Doctor</span>
                  )}
                </div>
                {record.description && <p className="text-sm mt-1">{record.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Past appointments */}
      {pastAppointments.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Past Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastAppointments.map((apt) => {
              const rx = getPrescriptionByAppointment(apt._id);
              const isExpanded = expandedId === apt._id;
              return (
                <div key={apt._id} className="border rounded-lg p-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : apt._id)}
                  >
                    <div className="flex items-center gap-3">
                      <Stethoscope className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="font-medium">{apt.doctorName}</p>
                        <p className="text-xs text-muted-foreground">{apt.specialization} • {apt.date}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {apt.date}
                        </div>
                        <div className="flex gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {apt.time}
                        </div>
                        <div className="flex gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {apt.location}
                        </div>
                        <div className="flex gap-1">
                          <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" /> ₹{apt.consultationFee}
                        </div>
                      </div>
                      {rx && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/prescription/${apt._id}`)} className="w-full">
                          View Prescription
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {pastAppointments.length === 0 && medicalHistory.length === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">No medical records or past appointments found.</CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientMedicalHistory;
