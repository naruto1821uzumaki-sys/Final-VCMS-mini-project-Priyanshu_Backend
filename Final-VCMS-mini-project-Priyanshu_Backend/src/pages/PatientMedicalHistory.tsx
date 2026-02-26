import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, Stethoscope, IndianRupee, ChevronDown, ChevronUp, Plus, Activity, Heart, Brain, Bone, Pill, AlertCircle, FileText, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import AddMedicalHistoryForm from "@/components/AddMedicalHistoryForm";

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
  date?: string;
  isDoctorCreated: boolean;
}

interface MedicalHistoryFormData {
  condition: string;
  description: string;
  diagnosis: string;
  treatment: string;
  reportFileName?: string;
}

// Health condition categories with icons
const getConditionCategory = (condition: string): { icon: any; color: string; label: string } => {
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes('heart') || lowerCondition.includes('cardiac') || lowerCondition.includes('blood pressure')) {
    return { icon: Heart, color: 'text-red-600', label: 'Cardiac' };
  }
  if (lowerCondition.includes('stomach') || lowerCondition.includes('digestive') || lowerCondition.includes('gastric')) {
    return { icon: Activity, color: 'text-orange-600', label: 'Digestive' };
  }
  if (lowerCondition.includes('brain') || lowerCondition.includes('neuro') || lowerCondition.includes('headache') || lowerCondition.includes('migraine')) {
    return { icon: Brain, color: 'text-primary', label: 'Neurological' };
  }
  if (lowerCondition.includes('bone') || lowerCondition.includes('joint') || lowerCondition.includes('back pain') || lowerCondition.includes('arthritis')) {
    return { icon: Bone, color: 'text-amber-600', label: 'Musculoskeletal' };
  }
  if (lowerCondition.includes('diabetes') || lowerCondition.includes('thyroid') || lowerCondition.includes('hormone')) {
    return { icon: Pill, color: 'text-primary', label: 'Endocrine' };
  }
  return { icon: FileText, color: 'text-gray-600', label: 'General' };
};

const PatientMedicalHistory = () => {
  const { user } = useAuth();
  const { appointments, getPrescriptionByAppointment } = useClinic();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const pastAppointments = appointments
    .filter((a) => a.patientId === user?._id && (a.status?.toLowerCase() === "completed" || a.status?.toLowerCase() === "cancelled"))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Filter medical history by last 5 years
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const recentMedicalHistory = useMemo(() => {
    return medicalHistory.filter(record => {
      const recordDate = new Date(record.date || record.createdAt);
      return recordDate >= fiveYearsAgo;
    }).sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [medicalHistory]);

  // Group medical history by year
  const medicalHistoryByYear = useMemo(() => {
    const grouped: { [year: string]: MedicalHistoryRecord[] } = {};
    recentMedicalHistory.forEach(record => {
      const year = new Date(record.date || record.createdAt).getFullYear().toString();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(record);
    });
    return grouped;
  }, [recentMedicalHistory]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = recentMedicalHistory.length;
    const doctorRecords = recentMedicalHistory.filter(r => r.isDoctorCreated).length;
    const selfRecords = total - doctorRecords;
    const categories = new Set(recentMedicalHistory.map(r => getConditionCategory(r.condition).label));
    
    return {
      total,
      doctorRecords,
      selfRecords,
      categories: Array.from(categories),
    };
  }, [recentMedicalHistory]);

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

  const handleAddMedicalHistory = async (data: MedicalHistoryFormData) => {
    if (!data.condition.trim()) {
      toast({ title: "Condition is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/medical-history/patient/self", {
        condition: data.condition,
        description: data.description,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        reportFileName: data.reportFileName || undefined,
      });

      if (res.data?.success) {
        toast({ title: "Medical history recorded", description: res.data.message });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4 md:p-6 space-y-5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 shadow-lg border border-primary/20">
        <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-primary-foreground/80 text-sm font-medium mb-1">Health Records 🏥</p>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">Medical History</h1>
            <p className="text-primary-foreground/70 mt-1 text-sm">Your complete medical records from the last 5 years.</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                size="sm"
                className="bg-white text-primary hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4" /> Add Record
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20 gap-1.5"
                onClick={() => navigate('/patient/ai-analyzer')}
              >
                <ScanLine className="h-4 w-4" /> AI Analyzer
              </Button>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[72px]">
              <p className="text-2xl font-bold text-primary-foreground">{stats.total}</p>
              <p className="text-primary-foreground/70 text-xs mt-0.5">Records</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[72px]">
              <p className="text-2xl font-bold text-primary-foreground">{stats.doctorRecords}</p>
              <p className="text-primary-foreground/70 text-xs mt-0.5">By Doctor</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[72px]">
              <p className="text-2xl font-bold text-primary-foreground">{stats.categories.length}</p>
              <p className="text-primary-foreground/70 text-xs mt-0.5">Categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* General profile medical history */}
      {user?.medicalHistory && (
        <div className="flex items-start gap-3 rounded-2xl bg-white border border-border px-5 py-4 shadow-sm">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">General Health Notes (from registration)</p>
            <p className="text-sm text-foreground">{user.medicalHistory}</p>
          </div>
        </div>
      )}

      <AddMedicalHistoryForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onAddRecord={handleAddMedicalHistory}
        loading={loading}
      />

      {/* Medical History Timeline (Last 5 Years) - Grouped by Year */}
      {Object.keys(medicalHistoryByYear).length > 0 && (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border">
            <div className="bg-muted/80 border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-foreground font-bold text-lg">Medical Records Timeline</h2>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                Last 5 Years • {recentMedicalHistory.length} Records
              </span>
            </div>
          </div>

          {Object.keys(medicalHistoryByYear)
            .sort((a, b) => parseInt(b) - parseInt(a))
            .map(year => (
              <div key={year} className="space-y-3">
                {/* Year Header */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border"></div>
                  <h3 className="text-xl font-bold text-muted-foreground">{year}</h3>
                  <div className="h-px flex-1 bg-border"></div>
                </div>

                {/* Records for this year */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {medicalHistoryByYear[year].map(record => {
                    const category = getConditionCategory(record.condition);
                    const Icon = category.icon;
                    const recordDate = new Date(record.date || record.createdAt);

                    return (
                      <Card key={record._id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base font-semibold">{record.condition}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {recordDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={record.isDoctorCreated ? "default" : "secondary"} className="text-xs">
                                {record.isDoctorCreated ? "Doctor" : "Self-Reported"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {category.label}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {record.description && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">Description</p>
                              <p className="mt-1">{record.description}</p>
                            </div>
                          )}
                          {record.diagnosis && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">Diagnosis</p>
                              <p className="mt-1">{record.diagnosis}</p>
                            </div>
                          )}
                          {record.treatment && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">Treatment</p>
                              <p className="mt-1">{record.treatment}</p>
                            </div>
                          )}
                          {record.isDoctorCreated && record.doctorName && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Stethoscope className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Dr. {record.doctorName}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Empty state */}
      {recentMedicalHistory.length === 0 && (
          <Card className="border border-border shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">No medical records found</p>
                <p className="text-sm text-muted-foreground mt-1">Start adding your medical history to track your health journey</p>
              </div>
              <Button size="sm" onClick={() => setShowAddForm(true)} className="mt-2">
                <Plus className="h-4 w-4 mr-2" /> Add First Record
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past appointments */}
      {pastAppointments.length > 0 && (
        <Card className="border border-border shadow-md">
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
                        <Button size="sm" variant="outline" onClick={() => navigate(`/prescriptions/${apt._id}`)} className="w-full">
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
        <Card className="border border-border shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">No medical records or past appointments found.</CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientMedicalHistory;
