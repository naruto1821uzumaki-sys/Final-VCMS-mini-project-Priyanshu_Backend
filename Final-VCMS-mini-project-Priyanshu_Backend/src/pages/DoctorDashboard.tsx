import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Clock, Users, IndianRupee, Stethoscope, FileText,
  Video, CheckCircle, XCircle, TrendingUp, Activity,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

const DoctorDashboard = () => {
  const { user } = useAuth();
  const { appointments, acceptAppointment, rejectAppointment, updateAppointmentStatus, addPrescription, fetchAppointments, getPrescriptionByAppointment } = useClinic();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const myAppointments = appointments.filter((a) => a.doctorId === user?._id || a.doctorId === user?.id);

  const pendingAppointments = myAppointments.filter((a) => a.status === "Booked");
  const todayAppointments = myAppointments.filter((a) => a.date === today && !["Cancelled", "Completed"].includes(a.status));
  const upcomingAppointments = myAppointments.filter((a) => a.date > today && ["Accepted", "Booked"].includes(a.status));
  const completedAppointments = myAppointments.filter((a) => a.status === "Completed");
  const uniquePatients = new Set(myAppointments.filter((a) => a.status !== "Cancelled").map((a) => a.patientId)).size;
  // Sum consultation fees from individual completed appointments (more accurate than user?.consultationFee)
  const estimatedEarnings = completedAppointments.reduce((sum, a) => sum + (a.consultationFee || (user as any)?.consultationFee || 0), 0);
  const feePerConsult = completedAppointments.length > 0
    ? Math.round(estimatedEarnings / completedAppointments.length)
    : ((user as any)?.consultationFee || 0);

  // Reject state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  // Notification badge
  const [unreadCount, setUnreadCount] = useState(0);
  // Pulse animation for new pending
  const [newPending, setNewPending] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data?.unreadCount ?? 0);
    } catch {/* ignore */}
  }, []);

  useEffect(() => { fetchUnreadCount(); }, [fetchUnreadCount]);

  // Socket: real-time events
  useEffect(() => {
    if (!socket) return;

    const onNewAppointment = (data: any) => {
      if (data.doctorId === user?._id) {
        setNewPending(true);
        setTimeout(() => setNewPending(false), 5000);
        toast({ title: "🔔 New Appointment Request!", description: `From ${data.patientName || "a patient"}` });
        fetchAppointments();
        fetchUnreadCount();
      }
    };

    const onCancelled = (data: any) => {
      if (data.doctorId === user?._id) {
        toast({ title: "Appointment Cancelled", description: data.reason || "Patient cancelled their appointment." });
        fetchAppointments();
      }
    };

    const onWarning = (data: any) => {
      toast({ title: "⚠️ Admin Warning", description: data.message || "You received a warning from admin.", variant: "destructive" });
      fetchUnreadCount();
    };

    socket.on("appointment:created", onNewAppointment);
    socket.on("appointment:booked", onNewAppointment);
    socket.on("appointment:cancelled", onCancelled);
    socket.on("notification:warning", onWarning);
    socket.on("admin:warning", onWarning);

    return () => {
      socket.off("appointment:created", onNewAppointment);
      socket.off("appointment:booked", onNewAppointment);
      socket.off("appointment:cancelled", onCancelled);
      socket.off("notification:warning", onWarning);
      socket.off("admin:warning", onWarning);
    };
  }, [socket, user?._id, fetchAppointments, fetchUnreadCount, toast]);

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { toast({ title: "Please provide a reason", variant: "destructive" }); return; }
    const result = await rejectAppointment(id, rejectReason);
    if (result.success) { toast({ title: "Appointment Rejected" }); setRejectId(null); setRejectReason(""); }
    else toast({ title: "Rejection failed", description: result.message, variant: "destructive" });
  };

  const handleAccept = async (id: string) => {
    const result = await acceptAppointment(id);
    if (result.success) toast({ title: "✅ Appointment Accepted", description: "Patient has been notified." });
    else toast({ title: "Accept failed", description: result.message, variant: "destructive" });
  };

  const handleMarkCompleted = async (aptId: string) => {
    try {
      await updateAppointmentStatus(aptId, "Completed");
      toast({ title: "✅ Marked as Completed", description: "You can now write a prescription." });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleStartConsultation = async (aptId: string) => {
    try {
      await updateAppointmentStatus(aptId, "In Progress");
      navigate(`/video/${aptId}`);
    } catch {
      toast({ title: "Failed to start consultation", variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Booked: "bg-blue-100 text-blue-800",
      Accepted: "bg-green-100 text-green-800",
      "In Progress": "bg-orange-100 text-orange-800",
      Completed: "bg-emerald-100 text-emerald-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Doctor Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="font-semibold text-foreground">Dr. {user?.name}</span> — {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => { fetchAppointments(); fetchUnreadCount(); toast({ title: "Refreshed!" }); }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        {/* ─── Stat Cards ─── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Today */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all"
            onClick={() => navigate("/doctor/today")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <CalendarDays className="h-8 w-8 opacity-80" />
                <span className="text-sm font-medium opacity-80">Today</span>
              </div>
              <div className="text-4xl font-bold">{todayAppointments.length}</div>
              <p className="text-sm mt-1 opacity-80">Appointments scheduled</p>
            </CardContent>
          </Card>

          {/* Pending — pulse when new */}
          <Card
            className={`border-0 shadow-lg bg-gradient-to-br from-orange-400 to-orange-500 text-white cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all ${newPending ? "ring-4 ring-orange-300 animate-pulse" : ""}`}
            onClick={() => document.getElementById("pending-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <AlertCircle className="h-8 w-8 opacity-80" />
                <span className="text-sm font-medium opacity-80">Pending</span>
              </div>
              <div className="text-4xl font-bold">{pendingAppointments.length}</div>
              <p className="text-sm mt-1 opacity-80">Requests awaiting decision</p>
            </CardContent>
          </Card>

          {/* Total Patients */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all"
            onClick={() => navigate("/doctor/patients")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <Users className="h-8 w-8 opacity-80" />
                <span className="text-sm font-medium opacity-80">Patients</span>
              </div>
              <div className="text-4xl font-bold">{uniquePatients}</div>
              <p className="text-sm mt-1 opacity-80">Total unique patients</p>
            </CardContent>
          </Card>

          {/* Estimated Earnings */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all"
            onClick={() => document.getElementById("completed-section")?.scrollIntoView({ behavior: "smooth" })}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <IndianRupee className="h-8 w-8 opacity-80" />
                <span className="text-sm font-medium opacity-80">Earnings</span>
              </div>
              <div className="text-4xl font-bold">₹{estimatedEarnings.toLocaleString("en-IN")}</div>
              {estimatedEarnings === 0 && completedAppointments.length > 0 ? (
                <p className="text-sm mt-1 opacity-90 underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate("/profile"); }}>
                  Set consultation fee in Profile ↗
                </p>
              ) : (
                <p className="text-sm mt-1 opacity-80">{completedAppointments.length} completed × ₹{feePerConsult} each</p>
              )}
            </CardContent>
          </Card>
        </div>


        {/* ─── Pending Requests ─── */}
        <div id="pending-section">
          <Card className={`border-0 shadow-lg ${pendingAppointments.length > 0 ? "ring-2 ring-orange-200" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Pending Requests
                {pendingAppointments.length > 0 && (
                  <Badge className="bg-orange-500 text-white">{pendingAppointments.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending requests. Great job! 🎉</p>
              ) : (
                <div className="space-y-3">
                  {pendingAppointments.map((apt) => (
                    <div key={apt._id} className="rounded-xl border border-orange-100 bg-orange-50/50 dark:bg-orange-900/10 p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white font-bold text-sm">
                            {(apt.patientName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{apt.patientName}</p>
                            <p className="text-xs text-muted-foreground">{apt.symptoms || "General consultation"}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{apt.date}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{apt.time}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 shrink-0">New Request</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => handleAccept(apt._id)}>
                          <CheckCircle className="h-3.5 w-3.5" /> Accept
                        </Button>
                        {rejectId === apt._id ? (
                          <div className="flex gap-2 flex-1 min-w-0">
                            <Input
                              className="text-sm h-8"
                              placeholder="Reason for rejection..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <Button size="sm" variant="destructive" className="h-8 shrink-0" onClick={() => handleReject(apt._id)}>Send</Button>
                            <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => { setRejectId(null); setRejectReason(""); }}>✕</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1" onClick={() => setRejectId(apt._id)}>
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Today's Schedule ─── */}
        <div id="today-section">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Today's Schedule
                <Badge variant="secondary">{todayAppointments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No appointments today. Enjoy your day! ☀️</p>
              ) : (
                <div className="space-y-3">
                  {[...todayAppointments].sort((a, b) => a.time.localeCompare(b.time)).map((apt) => {
                    const s = apt.status;
                    return (
                      <div key={apt._id} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[52px] rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2">
                            <p className="text-xs text-blue-500 font-medium">TIME</p>
                            <p className="font-bold text-sm text-blue-700 dark:text-blue-300">{apt.time}</p>
                          </div>
                          <div>
                            <p className="font-semibold">{apt.patientName}</p>
                            <p className="text-xs text-muted-foreground">{apt.symptoms || "Consultation"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${statusBadge(apt.status)}`}>{apt.status}</span>
                          {s === "Accepted" && (
                            <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleStartConsultation(apt._id)}>
                              <Video className="h-3.5 w-3.5" /> Start Video
                            </Button>
                          )}
                          {s === "In Progress" && (
                            <div className="flex items-center gap-2">
                              <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate(`/video/${apt._id}`)}>
                                <Video className="h-3.5 w-3.5" /> Rejoin Video
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 border-green-400 text-green-700" onClick={() => handleMarkCompleted(apt._id)}>
                                <CheckCircle className="h-3.5 w-3.5" /> Complete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Upcoming Appointments ─── */}
        {upcomingAppointments.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-500" />
                Upcoming Appointments
                <Badge variant="secondary">{upcomingAppointments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingAppointments.slice(0, 5).map((apt) => (
                  <div key={apt._id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">
                        {(apt.patientName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{apt.patientName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />{apt.date}
                          <Clock className="h-3 w-3 ml-1" />{apt.time}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${statusBadge(apt.status)}`}>{apt.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Recent Consultations ─── */}
        <div id="completed-section">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-500" />
                Completed Consultations
                <Badge variant="secondary">{completedAppointments.length} completed</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No completed consultations yet.</p>
              ) : (
                <div className="space-y-2">
                  {[...completedAppointments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((apt) => {
                    const rx = getPrescriptionByAppointment?.(apt._id || apt.id);
                    return (
                      <div key={apt._id} className="flex items-center justify-between rounded-lg border bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{apt.patientName}</p>
                            <p className="text-xs text-muted-foreground">{apt.date} • {apt.time}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {rx && (
                            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground"
                              onClick={() => navigate(`/prescriptions/${rx._id || apt._id}`)}>View Rx</Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => navigate(`/create-prescription/${apt._id}`)}
                          >
                            <FileText className="h-3.5 w-3.5" /> {rx ? "Edit Prescription" : "Write Prescription"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
};

export default DoctorDashboard;