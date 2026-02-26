import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Video, CheckCircle, XCircle, AlertTriangle, CalendarDays, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface RejectDialogState {
  open: boolean;
  appointmentId: string | null;
  reason: string;
  loading: boolean;
}

const DoctorTodayAppointments = () => {
  const { user } = useAuth();
  const { appointments, acceptAppointment, rejectAppointment, updateAppointmentStatus, getPrescriptionByAppointment, fetchAppointments } = useClinic();
  const navigate = useNavigate();
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments
    .filter((a) => (a.doctorId === user?._id || a.doctorId === user?.id) && a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({
    open: false,
    appointmentId: null,
    reason: "",
    loading: false,
  });

  const handleRejectWithWarning = async () => {
    if (!rejectDialog.appointmentId || !rejectDialog.reason.trim()) {
      toast({ 
        title: "Required", 
        description: "Please provide a rejection reason",
        variant: "destructive" 
      });
      return;
    }

    try {
      setRejectDialog(prev => ({ ...prev, loading: true }));
      
      const response = await api.post(
        `/appointments/${rejectDialog.appointmentId}/doctor-reject`,
        { reason: rejectDialog.reason }
      );

      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Appointment rejected and patient notified",
        });
        setRejectDialog({ open: false, appointmentId: null, reason: "", loading: false });
        fetchAppointments();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reject appointment",
        variant: "destructive",
      });
    } finally {
      setRejectDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Booked": return "bg-primary/10 text-primary";
      case "Accepted": return "bg-secondary/10 text-secondary";
      case "In Progress": return "bg-warning/10 text-warning";
      case "Completed": return "bg-secondary/10 text-secondary";
      case "Cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary via-secondary to-teal-500 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><CalendarDays className="h-6 w-6" /> Today's Schedule</h1>
            <p className="mt-1 text-white/70 text-sm">{today} · {todayAppointments.length} appointment{todayAppointments.length !== 1 ? "s" : ""} scheduled</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => fetchAppointments()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {todayAppointments.length === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No appointments for today</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Enjoy your day! New bookings will appear here.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {todayAppointments.map((apt) => {
          const rx = getPrescriptionByAppointment(apt.id);
          return (
            <Card key={apt.id} className="border-0 shadow-md">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {apt.patientName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{apt.patientName}</p>
                      <p className="text-xs text-muted-foreground">Age: {apt.patientAge || "—"} • {apt.patientMedicalHistory || "No history"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />{apt.time}
                        <span>• {apt.specialization}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(apt.status)}`}>{apt.status}</span>
                </div>

                {apt.status === "Booked" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => acceptAppointment(apt.id)} className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-destructive"
                      onClick={() => setRejectDialog({ 
                        open: true, 
                        appointmentId: apt.id,
                        reason: "",
                        loading: false 
                      })}
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                {apt.status === "Accepted" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { updateAppointmentStatus(apt.id, "In Progress"); navigate(`/video/${apt.id}`); }} className="gap-1">
                      <Video className="h-3 w-3" /> Start Consultation
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateAppointmentStatus(apt.id, "Completed")}>Mark Completed</Button>
                  </div>
                )}

                {apt.status === "In Progress" && (
                  <Button size="sm" onClick={() => navigate(`/video/${apt.id}`)} className="gap-1">
                    <Video className="h-3 w-3" /> Rejoin Video
                  </Button>
                )}

                <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(`/prescriptions/${apt.id}`)}>
                  {rx ? "View Prescription" : "View Rx"}
                </Button>

                {apt.status === "Cancelled" && apt.cancelReason && (
                  <p className="text-xs text-destructive">Reason: {apt.cancelReason}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reject Appointment Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Reject Appointment
            </DialogTitle>
            <DialogDescription>
              The patient will be notified immediately with your rejection reason.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Patient will receive a notification with your rejection reason and automatic status update.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rejection Reason *</label>
              <Textarea
                placeholder="Explain why you're rejecting this appointment (e.g., scheduling conflict, health issue, etc.)"
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, appointmentId: null, reason: "", loading: false })}
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectWithWarning}
              disabled={rejectDialog.loading || !rejectDialog.reason.trim()}
            >
              {rejectDialog.loading ? "Rejecting..." : "Reject & Notify Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorTodayAppointments;
