import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, Clock, MapPin, Stethoscope, IndianRupee, Video, Trash2, AlertTriangle, FileText, CheckCircle, XCircle, Activity } from "lucide-react";
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

  const [tab, setTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");

  const upcomingApts = myAppointments.filter(a => ["Booked", "Accepted", "In Progress"].includes(a.status));
  const completedApts = myAppointments.filter(a => a.status === "Completed");
  const cancelledApts = myAppointments.filter(a => a.status === "Cancelled");

  const displayedApts =
    tab === "upcoming" ? upcomingApts :
    tab === "completed" ? completedApts :
    tab === "cancelled" ? cancelledApts :
    myAppointments;

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

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    Booked:        { bg: "bg-amber-50 border border-amber-200",    text: "text-amber-700",   dot: "bg-amber-400" },
    Accepted:      { bg: "bg-emerald-50 border border-emerald-200",text: "text-emerald-700", dot: "bg-emerald-500" },
    "In Progress": { bg: "bg-blue-50 border border-blue-200",      text: "text-blue-700",    dot: "bg-blue-500" },
    Completed:     { bg: "bg-slate-50 border border-slate-200",    text: "text-slate-600",   dot: "bg-slate-400" },
    Cancelled:     { bg: "bg-red-50 border border-red-200",        text: "text-red-600",     dot: "bg-red-400" },
  };

  const getStatusBadge = (status: string) => {
    const c = statusConfig[status] || statusConfig["Booked"];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{status}
      </span>
    );
  };

  const borderColor = (status: string) => {
    if (status === "Booked") return "border-l-amber-400";
    if (status === "Accepted") return "border-l-emerald-500";
    if (status === "In Progress") return "border-l-blue-500";
    if (status === "Completed") return "border-l-teal-500";
    return "border-l-red-400";
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4 md:p-6 space-y-5">

      {/* ── Hero Header ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-primary p-6 shadow-lg border border-primary/20">
        <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-6 -left-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-primary-foreground/80 text-sm font-medium mb-1">Patient Portal 🏥</p>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">My Appointments</h1>
            <p className="text-primary-foreground/70 mt-1 text-sm">Track, manage and join all your appointments.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total",     value: myAppointments.length,  bg: "bg-white/20" },
              { label: "Upcoming",  value: upcomingApts.length,    bg: "bg-white/15" },
              { label: "Completed", value: completedApts.length,   bg: "bg-white/15" },
              { label: "Cancelled", value: cancelledApts.length,   bg: "bg-white/10" },
            ].map(({ label, value, bg }) => (
              <div key={label} className={`${bg} backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[64px]`}>
                <p className="text-xl font-bold text-primary-foreground leading-none">{value}</p>
                <p className="text-primary-foreground/70 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Filter ─────────────────────────────────────── */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit shadow-sm flex-wrap">
        {[
          { key: "all",       label: "All",       count: myAppointments.length },
          { key: "upcoming",  label: "Upcoming",  count: upcomingApts.length },
          { key: "completed", label: "Completed", count: completedApts.length },
          { key: "cancelled", label: "Cancelled", count: cancelledApts.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === key ? "bg-white/30 text-white" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Appointments List ──────────────────────────────── */}
      {displayedApts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-foreground">No appointments found</p>
            <p className="text-sm text-muted-foreground">
              {tab === "upcoming" ? "Book an appointment from the dashboard." : "Nothing to show here."}
            </p>
            {tab !== "all" && (
              <Button size="sm" variant="outline" onClick={() => setTab("all")}>Show All</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedApts.map((apt) => {
            const rx = getPrescriptionByAppointment(apt._id);
            const statusLower = apt.status.toLowerCase();
            const canJoin = (statusLower === "accepted" || statusLower === "in progress" || statusLower === "in-progress") && apt.date <= today;
            const isCompleted = statusLower === "completed";
            const isCancelled = statusLower === "cancelled";

            return (
              <div
                key={apt._id}
                className={`rounded-2xl border border-border border-l-4 ${borderColor(apt.status)} bg-white shadow-sm hover:shadow-md transition-all p-5`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    isCompleted ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                    isCancelled ? "bg-gradient-to-br from-red-400 to-rose-500" :
                    canJoin    ? "bg-gradient-to-br from-blue-500 to-indigo-600" :
                                  "bg-gradient-to-br from-indigo-500 to-violet-600"
                  }`}>
                    {isCompleted ? <CheckCircle className="h-6 w-6 text-white" /> :
                     isCancelled ? <XCircle className="h-6 w-6 text-white" /> :
                     canJoin     ? <Video className="h-6 w-6 text-white" /> :
                                   <Stethoscope className="h-6 w-6 text-white" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground">{apt.doctorName}</h3>
                      {getStatusBadge(apt.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{apt.specialization}</p>

                    {/* Info chips */}
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <CalendarDays className="h-3 w-3" />{apt.date}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3 w-3" />{apt.time}
                      </span>
                      {apt.location && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <MapPin className="h-3 w-3" />{apt.location}
                        </span>
                      )}
                      {apt.consultationFee ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          <IndianRupee className="h-3 w-3" />₹{apt.consultationFee}
                        </span>
                      ) : null}
                    </div>

                    {/* Prescription indicator */}
                    <div className="mt-2">
                      <span className={`text-xs font-medium ${rx ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {rx ? "✓ Prescription given" : "✗ No prescription yet"}
                      </span>
                    </div>

                    {/* Cancel reason */}
                    {isCancelled && apt.cancelReason && (
                      <p className="text-xs text-destructive mt-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                        Reason: {apt.cancelReason}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {canJoin && (
                        <Button
                          size="sm"
                          className="rounded-xl text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm font-semibold"
                          onClick={() => navigate(`/video/${apt._id}`)}
                        >
                          <Video className="h-3.5 w-3.5" /> Join Video
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium"
                        onClick={() => navigate(`/prescriptions/appointment/${apt._id}`)}
                      >
                        <FileText className="h-3.5 w-3.5" /> {rx ? "View Rx" : "Rx"}
                      </Button>
                      {!isCompleted && !isCancelled && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs gap-1.5 border-red-200 text-red-500 hover:bg-red-50 font-medium ml-auto"
                          onClick={() => setCancelDialog({ open: true, appointmentId: apt._id, reason: "", loading: false })}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Dialog */}
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
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, appointmentId: null, reason: "", loading: false })}>
              Keep Appointment
            </Button>
            <Button variant="destructive" onClick={handleCancelAppointment} disabled={cancelDialog.loading}>
              {cancelDialog.loading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientAppointments;
