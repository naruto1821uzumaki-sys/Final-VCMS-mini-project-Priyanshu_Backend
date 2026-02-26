import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock, Users, IndianRupee, Stethoscope, FileText, Video, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const DoctorDashboard = () => {
  const { user } = useAuth();
  const { appointments, acceptAppointment, rejectAppointment, cancelAppointment, updateAppointmentStatus, addPrescription, getPrescriptionByAppointment, fetchAppointments } = useClinic();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();

  const myAppointments = appointments.filter((a) => a.doctorId === user?._id);
  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = myAppointments.filter((a) => a.date === today && a.status !== "Cancelled");
  const uniquePatients = new Set(myAppointments.filter((a) => a.status !== "Cancelled").map((a) => a.patientId)).size;

  // Reject state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Prescription form state
  const [rxAppointmentId, setRxAppointmentId] = useState<string | null>(null);
  const [rxForm, setRxForm] = useState({ medicineName: "", dosage: "", duration: "", instructions: "" });

  // Pagination
  const [visibleCount, setVisibleCount] = useState(10);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleAppointmentAccepted = (data: any) => {
      if (data.doctorId === user?._id) {
        toast({ title: "Appointment accepted by patient", description: "Check your appointments." });
        fetchAppointments();
      }
    };

    const handleAppointmentRejected = (data: any) => {
      if (data.doctorId === user?._id) {
        toast({ title: "Appointment rejected", description: "Patient has rejected this appointment." });
        fetchAppointments();
      }
    };

    const handleAppointmentCancelled = (data: any) => {
      if (data.doctorId === user?._id) {
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

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    const result = await rejectAppointment(id, rejectReason);
    if (result.success) {
      toast({ title: "Appointment rejected", description: result.message });
      setRejectId(null);
      setRejectReason("");
    } else {
      toast({ title: "Rejection failed", description: result.message, variant: "destructive" });
    }
  };

  const handleMarkCompleted = async (aptId: string) => {
    const result = await updateAppointmentStatus(aptId, "completed");
    if (result.success) {
      toast({ title: "Appointment marked as completed", description: result.message });
      setRxAppointmentId(aptId);
    }
  };

  const handleStartConsultation = async (aptId: string) => {
    const result = await updateAppointmentStatus(aptId, "in-progress");
    if (result.success) {
      toast({ title: "Consultation started", description: result.message });
      navigate(`/video/${aptId}`);
    }
  };

  const handleSavePrescription = async () => {
    const apt = myAppointments.find((a) => a._id === rxAppointmentId);
    if (!apt || !user) return;

    const result = await addPrescription({
      appointmentId: apt._id,
      doctorId: user._id,
      doctorName: `Dr. ${user.name}`,
      patientId: apt.patientId,
      patientName: apt.patientName,
      date: new Date().toISOString().split("T")[0],
      medications: [{
        name: rxForm.medicineName,
        dosage: rxForm.dosage,
        duration: rxForm.duration,
        instructions: rxForm.instructions,
      }],
    });

    if (result.success) {
      toast({ title: "Prescription saved", description: result.message });
      setRxAppointmentId(null);
      setRxForm({ medicineName: "", dosage: "", duration: "", instructions: "" });
    } else {
      toast({ title: "Save failed", description: result.message, variant: "destructive" });
    }
  };

  const statusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "booked": return "bg-primary/10 text-primary";
      case "accepted": return "bg-secondary/10 text-secondary";
      case "in progress": return "bg-warning/10 text-warning";
      case "in-progress": return "bg-warning/10 text-warning";
      case "completed": return "bg-secondary/10 text-secondary";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const sortedAppointments = [...myAppointments]
    .sort((a, b) => {
      if (a.date === today && b.date !== today) return -1;
      if (b.date === today && a.date !== today) return 1;
      return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
    });

  const canJoinVideo = (apt: typeof myAppointments[0]) => {
    const aptStatus = apt.status.toLowerCase();
    return (aptStatus === "accepted" || aptStatus === "in-progress" || aptStatus === "in progress") && apt.date <= today;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome, Dr. {user?.name?.split(' ')[1] || user?.name?.split(' ')[0]}. Here's your schedule overview.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/doctor/today")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Appointments</CardTitle>
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view →</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/doctor/patients")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients</CardTitle>
            <Users className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uniquePatients}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view →</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/profile")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Specialization</CardTitle>
            <Stethoscope className="h-5 w-5 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{user?.specialization || "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to edit →</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/profile")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consultation Fee</CardTitle>
            <IndianRupee className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{user?.consultationFee || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to edit →</p>
          </CardContent>
        </Card>
      </div>

      {/* Appointments */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedAppointments.length === 0 && <p className="text-sm text-muted-foreground">No appointments.</p>}
          {sortedAppointments.slice(0, visibleCount).map((apt) => {
            const rx = getPrescriptionByAppointment(apt._id);
            const isToday = apt.date === today;
            const aptStatus = apt.status.toLowerCase();
            return (
              <div key={apt._id} className={`rounded-lg bg-muted/50 p-4 space-y-3 ${isToday ? "ring-1 ring-primary/20" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {apt.patientName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{apt.patientName}</p>
                      <p className="text-xs text-muted-foreground">Age: {apt.patientAge || "—"} • {apt.patientMedicalHistory || "No history"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <CalendarDays className="h-3 w-3" />{apt.date} {isToday && <span className="text-primary font-semibold">(Today)</span>}
                        <Clock className="h-3 w-3 ml-1" />{apt.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${statusColor(apt.status)}`}>{apt.status}</span>
                    <span className={`text-[11px] ${rx ? "text-secondary font-semibold" : "text-muted-foreground"}`}>
                      Rx: {rx ? "Given" : "Not Given"}
                    </span>
                  </div>
                </div>

                {(aptStatus === "booked" || aptStatus === "pending") && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => acceptAppointment(apt._id)} className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Accept
                    </Button>
                    {rejectId === apt._id ? (
                      <div className="flex gap-2 items-end flex-1">
                        <Input
                          placeholder="Reason for rejection (patient will be refunded)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="text-sm"
                        />
                        <Button size="sm" variant="destructive" onClick={() => handleReject(apt._id)}>Send</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRejectId(apt._id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    )}
                  </div>
                )}

                {canJoinVideo(apt) && (aptStatus === "accepted" || aptStatus === "confirmed") && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleStartConsultation(apt._id)} className="gap-1">
                      <Video className="h-3 w-3" /> Start Consultation
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMarkCompleted(apt._id)}>Mark Completed</Button>
                  </div>
                )}

                {(aptStatus === "in progress" || aptStatus === "in-progress") && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/video/${apt._id}`)} className="gap-1">
                      <Video className="h-3 w-3" /> Rejoin Video
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMarkCompleted(apt._id)}>Mark Completed</Button>
                  </div>
                )}

                {aptStatus === "completed" && !rx && (
                  <Button size="sm" variant="outline" onClick={() => setRxAppointmentId(apt._id)}>
                    <FileText className="mr-1 h-3 w-3" /> Add Prescription
                  </Button>
                )}

                <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(`/prescription/${apt._id}`)}>
                  {rx ? "View Prescription" : "View Rx"}
                </Button>

                {aptStatus === "cancelled" && apt.cancelReason && (
                  <p className="text-xs text-destructive">Reason: {apt.cancelReason}</p>
                )}
              </div>
            );
          })}
          {sortedAppointments.length > visibleCount && (
            <Button variant="ghost" className="w-full" onClick={() => setVisibleCount((c) => c + 10)}>
              Show More ({sortedAppointments.length - visibleCount} remaining)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Prescription Form */}
      {rxAppointmentId && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Write Prescription</CardTitle>
            <p className="text-sm text-muted-foreground">
              For: {myAppointments.find((a) => a._id === rxAppointmentId)?.patientName}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Medicine Name" value={rxForm.medicineName} onChange={(e) => setRxForm((p) => ({ ...p, medicineName: e.target.value }))} />
            <Input placeholder="Dosage (e.g. 10mg)" value={rxForm.dosage} onChange={(e) => setRxForm((p) => ({ ...p, dosage: e.target.value }))} />
            <Input placeholder="Duration (e.g. 7 days)" value={rxForm.duration} onChange={(e) => setRxForm((p) => ({ ...p, duration: e.target.value }))} />
            <Textarea placeholder="Instructions" value={rxForm.instructions} onChange={(e) => setRxForm((p) => ({ ...p, instructions: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSavePrescription} disabled={!rxForm.medicineName}>Save Prescription</Button>
              <Button size="sm" variant="ghost" onClick={() => setRxAppointmentId(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DoctorDashboard;
