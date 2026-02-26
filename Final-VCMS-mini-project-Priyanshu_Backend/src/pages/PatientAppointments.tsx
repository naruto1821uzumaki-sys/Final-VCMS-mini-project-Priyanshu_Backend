import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, Clock, MapPin, Stethoscope, IndianRupee, Video, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface CancelDialogState {
  open: boolean;
  appointmentId: string | null;
  reason: string;
  loading: boolean;
}

const PatientAppointments = () => {
  const { user } = useAuth();
  const { appointments, getPrescriptionByAppointment, fetchAppointments } = useClinic();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState>({
    open: false,
    appointmentId: null,
    reason: "",
    loading: false,
  });

  const myAppointments = appointments
    .filter((a) => a.patientId === user?._id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  // Socket listeners for real-time appointment updates
  useEffect(() => {
    if (!socket) return;

    const handleAppointmentAccepted = (data: any) => {
      if (data.patientId === user?._id) {
        toast({ title: "Appointment accepted!", description: "Doctor has accepted your appointment." });
        fetchAppointments();
      }
    };

    const handleAppointmentRejected = (data: any) => {
      if (data.patientId === user?._id) {
        toast({ title: "Appointment rejected", description: `Reason: ${data.reason || "No reason provided"}` });
        fetchAppointments();
      }
    };

    const handleAppointmentCancelled = (data: any) => {
      if (data.patientId === user?._id) {
        toast({ title: "Appointment cancelled", description: `Reason: ${data.reason || "No reason provided"}` });
        fetchAppointments();
      }
    };

    socket.on("appointment:accepted", handleAppointmentAccepted);
    socket.on("appointment:rejected", handleAppointmentRejected);
    socket.on("appointment:cancelled", handleAppointmentCancelled);

    return () => {
      socket.off("appointment:accepted", handleAppointmentAccepted);
      socket.off("appointment:rejected", handleAppointmentRejected);
      socket.off("appointment:cancelled", handleAppointmentCancelled);
    };
  }, [socket, user?._id, fetchAppointments, toast]);

  const handleCancelAppointment = async () => {
    if (!cancelDialog.appointmentId) return;

    try {
      setCancelDialog(prev => ({ ...prev, loading: true }));
      
      const response = await api.post(
        `/appointments/${cancelDialog.appointmentId}/patient-delete`,
        { reason: cancelDialog.reason }
      );

      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Appointment cancelled and doctor has been notified",
        });
        setCancelDialog({ open: false, appointmentId: null, reason: "", loading: false });
        fetchAppointments();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    } finally {
      setCancelDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const statusColor = (s: string) => {
    const status = s.toLowerCase();
    switch (status) {
      case "booked":
      case "pending": return "bg-primary/10 text-primary";
      case "accepted":
      case "confirmed": return "bg-secondary/10 text-secondary";
      case "in progress":
      case "in-progress": return "bg-warning/10 text-warning";
      case "completed": return "bg-secondary/10 text-secondary";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Appointments</h1>
      <p className="text-muted-foreground">All your appointments in detail.</p>

      {myAppointments.length === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">No appointments found.</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {myAppointments.map((apt) => {
          const rx = getPrescriptionByAppointment(apt._id);
          const canJoin = apt.status.toLowerCase() === "accepted" && apt.date <= today;
          return (
            <Card key={apt._id} className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{apt.doctorName}</CardTitle>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusColor(apt.status)}`}>
                    {apt.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Stethoscope className="h-3.5 w-3.5" /> {apt.specialization}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {apt.location || "N/A"}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" /> {apt.date}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {apt.time}
                  </div>
                  {apt.consultationFee && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <IndianRupee className="h-3.5 w-3.5" /> ₹{apt.consultationFee}
                    </div>
                  )}
                </div>
                <div className="text-xs">
                  <span className={rx ? "text-secondary font-semibold" : "text-muted-foreground"}>
                    Prescription: {rx ? "Given" : "Not Given"}
                  </span>
                </div>
                {apt.status.toLowerCase() === "cancelled" && apt.cancelReason && (
                  <p className="text-xs text-destructive">Reason: {apt.cancelReason}</p>
                )}
                <div className="flex gap-2 pt-1">
                  {canJoin && (
                    <Button size="sm" onClick={() => navigate(`/video/${apt._id}`)} className="gap-1">
                      <Video className="h-3 w-3" /> Join Consultation
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => navigate(`/prescriptions/${apt._id}`)}>
                    {rx ? "View Prescription" : "View Rx"}
                  </Button>
                  {apt.status.toLowerCase() !== "completed" && apt.status.toLowerCase() !== "cancelled" && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => setCancelDialog({ open: true, appointmentId: apt._id, reason: "", loading: false })}
                      className="gap-1 ml-auto"
                    >
                      <Trash2 className="h-3 w-3" /> Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancel Appointment Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Cancel Appointment
            </DialogTitle>
            <DialogDescription>
              Once cancelled, the doctor will be notified immediately. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              The doctor will receive a notification about your cancellation with the reason you provide.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cancellation Reason (Optional)</label>
              <Textarea
                placeholder="Tell the doctor why you're cancelling this appointment..."
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: false, appointmentId: null, reason: "", loading: false })}
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAppointment}
              disabled={cancelDialog.loading}
            >
              {cancelDialog.loading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientAppointments;
