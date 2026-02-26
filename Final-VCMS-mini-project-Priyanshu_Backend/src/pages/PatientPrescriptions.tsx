import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { FileText, Download, CheckCircle2, Clock, AlertCircle, Pill, X, Stethoscope, CalendarDays } from "lucide-react";
import PrescriptionAISummary from "@/components/PrescriptionAISummary";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  refills: number;
  sideEffects: string[];
}

interface Prescription {
  _id: string;
  appointmentId: any;
  medicalHistoryId: any;
  patientId: any;
  doctorId: any;
  medications: Medication[];
  diagnosis: string;
  clinicalNotes: string;
  treatmentPlan: string;
  followUpDate: string;
  followUpRecommendations: string;
  status: "draft" | "issued" | "viewed" | "picked_up" | "cancelled";
  issuedAt: string;
  viewedAt: string;
  pickedUpAt: string;
  cancelledAt: string;
  cancelledReason: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

const PatientPrescriptions = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (user?._id) {
      fetchPrescriptions();
    }
  }, [user?._id, statusFilter]);

  // Socket listener for real-time prescription updates
  useEffect(() => {
    if (!socket || !user?._id) return;

    const handlePrescriptionIssued = (data: any) => {
      if (data.patientId === user._id) {
        setPrescriptions((prev) => [data, ...prev]);
        toast({ title: "New prescription", description: "Doctor has issued a new prescription." });
      }
    };

    socket.on("prescription:issued", handlePrescriptionIssued);
    return () => socket.off("prescription:issued", handlePrescriptionIssued);
  }, [socket, user?._id, toast]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      let url = `/prescriptions/patient/${user?._id}`;
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }
      const response = await api.get(url);
      if (response.data?.success) {
        setPrescriptions(response.data.prescriptions || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load prescriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPrescription = async (prescription: Prescription) => {
    if (prescription.status === "issued" && !prescription.viewedAt) {
      try {
        await api.post(`/prescriptions/${prescription._id}/view`);
        toast({ title: "Success", description: "Prescription marked as viewed" });
        fetchPrescriptions();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.response?.data?.message || "Failed to mark as viewed",
          variant: "destructive",
        });
      }
    }
    setSelectedPrescription(prescription);
  };

  const handlePickupPrescription = async (prescriptionId: string) => {
    try {
      const response = await api.post(`/prescriptions/${prescriptionId}/pickup`, {});
      if (response.data?.success) {
        toast({ title: "Success", description: "Prescription marked as picked up" });
        fetchPrescriptions();
        setSelectedPrescription(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to mark as picked up",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "issued":   return <Clock className="h-4 w-4 text-primary" />;
      case "viewed":   return <FileText className="h-4 w-4 text-secondary" />;
      case "picked_up": return <CheckCircle2 className="h-4 w-4 text-secondary" />;
      case "cancelled": return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "issued":   return "bg-primary/10 text-primary";
      case "viewed":   return "bg-secondary/10 text-secondary";
      case "picked_up": return "bg-secondary/20 text-secondary";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4 md:p-6 space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 shadow-lg border border-primary/20">
        <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-primary-foreground/80 text-sm font-medium mb-1">My Health 📊</p>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">Prescriptions</h1>
            <p className="text-primary-foreground/70 mt-1 text-sm">All prescriptions issued by your doctors with AI-powered summaries.</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-bold text-primary-foreground">{prescriptions.length}</p>
            <p className="text-primary-foreground/70 text-xs mt-0.5">Total</p>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit shadow-sm flex-wrap">
        {["all", "issued", "viewed", "picked_up", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              statusFilter === status
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {status === "picked_up" ? "Picked Up" : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Prescriptions list */}
      {prescriptions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold">No prescriptions found</p>
            <p className="text-sm text-muted-foreground">Your doctor will add prescriptions after your appointment</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx._id} className="rounded-2xl border border-border bg-white shadow-sm hover:shadow-md transition-shadow">
              {/* Top stripe by status */}
              <div className={`h-1 rounded-t-2xl ${rx.status === 'cancelled' ? 'bg-destructive' : rx.status === 'picked_up' ? 'bg-secondary' : 'bg-primary'}`} />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-bold text-foreground">{rx.diagnosis}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Stethoscope className="h-3.5 w-3.5" /> Dr. {rx.doctorId?.name || 'Unknown'}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize flex items-center gap-1.5 ${getStatusBadgeClass(rx.status)}`}>
                        {getStatusIcon(rx.status)}
                        {rx.status === 'picked_up' ? 'Picked Up' : rx.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span className="text-xs">Issued: {rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString() : '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className={`text-xs ${isExpired(rx.validUntil) ? 'text-destructive font-semibold' : ''}`}>
                          Valid until: {new Date(rx.validUntil).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {rx.medications.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {rx.medications.map((med, idx) => (
                          <span key={idx} className="text-xs bg-accent text-foreground border border-border px-2 py-0.5 rounded-full">
                            {med.name} {med.dosage}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3">
                      <PrescriptionAISummary
                        medications={rx.medications}
                        diagnosis={rx.diagnosis}
                        treatmentPlan={rx.treatmentPlan}
                        followUpRecommendations={rx.followUpRecommendations}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button size="sm" className="text-xs" onClick={() => handleViewPrescription(rx)}>Details</Button>
                    {rx.status === 'issued' && !rx.pickedUpAt && !isExpired(rx.validUntil) && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handlePickupPrescription(rx._id)}>Picked Up</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => window.print()}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 rounded-t-2xl">
              <div>
                <h2 className="font-bold text-lg text-foreground">Prescription Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Dr. {selectedPrescription.doctorId?.name}</p>
              </div>
              <button
                className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                onClick={() => setSelectedPrescription(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Status row */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize flex items-center gap-1.5 ${getStatusBadgeClass(selectedPrescription.status)}`}>
                  {getStatusIcon(selectedPrescription.status)}
                  {selectedPrescription.status === 'picked_up' ? 'Picked Up' : selectedPrescription.status}
                </span>
                <span className="text-sm text-muted-foreground">Issued: {selectedPrescription.issuedAt ? new Date(selectedPrescription.issuedAt).toLocaleDateString() : '—'}</span>
                <span className={`text-sm ${isExpired(selectedPrescription.validUntil) ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                  Valid until: {new Date(selectedPrescription.validUntil).toLocaleDateString()}
                </span>
              </div>

              {/* Diagnosis */}
              <div className="rounded-xl bg-accent/40 border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">Diagnosis</p>
                <p className="font-semibold text-foreground">{selectedPrescription.diagnosis}</p>
              </div>

              {/* Clinical Notes */}
              {selectedPrescription.clinicalNotes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">Clinical Notes</p>
                  <p className="text-sm text-foreground">{selectedPrescription.clinicalNotes}</p>
                </div>
              )}

              {/* Medications */}
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-2">Medications</p>
                <div className="space-y-2">
                  {selectedPrescription.medications.map((med, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-white p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">{med.name}</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{med.dosage}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span>Frequency: <span className="text-foreground font-medium">{med.frequency}</span></span>
                        <span>Duration: <span className="text-foreground font-medium">{med.duration}</span></span>
                      </div>
                      {med.instructions && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">Instructions: {med.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up */}
              {selectedPrescription.followUpDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Follow-up:</span>
                  <span className="font-medium">{new Date(selectedPrescription.followUpDate).toLocaleDateString()}</span>
                </div>
              )}

              <PrescriptionAISummary
                medications={selectedPrescription.medications}
                diagnosis={selectedPrescription.diagnosis}
                treatmentPlan={selectedPrescription.treatmentPlan}
                followUpRecommendations={selectedPrescription.followUpRecommendations}
              />

              {/* Action buttons */}
              <div className="flex gap-3 pt-2 border-t border-border flex-wrap">
                {selectedPrescription.status === 'issued' && !selectedPrescription.pickedUpAt && !isExpired(selectedPrescription.validUntil) && (
                  <Button onClick={() => handlePickupPrescription(selectedPrescription._id)}>Mark Picked Up</Button>
                )}
                <Button variant="outline" onClick={() => { window.print(); setSelectedPrescription(null); }}>
                  <Download className="h-4 w-4 mr-2" /> Print / Download
                </Button>
                <Button variant="ghost" onClick={() => setSelectedPrescription(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientPrescriptions;
