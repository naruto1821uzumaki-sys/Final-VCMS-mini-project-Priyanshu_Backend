import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Stethoscope, UserCheck, CalendarDays, CheckCircle, XCircle, FileText, Clock, AlertCircle, TrendingUp, MessageSquare, Eye, RefreshCw, Bell, Shield, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/useSocket";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from "recharts";

interface AppointmentAnalyticsStats {
  total: number;
  statusDistribution: { completed: number; cancelled: number; pending: number; inProgress: number };
  cancelledByDoctor: number;
  cancelledByPatient: number;
  monthlyTrends: Record<string, number>;
  completionRate: number;
}
interface DoctorDemandEntry {
  doctorId: string;
  doctorName: string;
  specialization: string;
  appointmentCount: number;
  completedCount: number;
  cancellationRate: number;
}
interface DoctorDemandData {
  topDoctors: DoctorDemandEntry[];
  highDemandThreshold: number;
  highDemandDoctors: DoctorDemandEntry[];
}

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  inProgressAppointments: number;
  totalPrescriptions: number;
  pendingDoctors: number;
  pendingPatients: number;
  totalContacts: number;
  openContacts: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { socket } = useSocket();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    inProgressAppointments: 0,
    totalPrescriptions: 0,
    pendingDoctors: 0,
    pendingPatients: 0,
    totalContacts: 0,
    openContacts: 0,
  });
  const [appointmentData, setAppointmentData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [analyticsStats, setAnalyticsStats] = useState<AppointmentAnalyticsStats | null>(null);
  const [doctorDemand, setDoctorDemand] = useState<DoctorDemandData | null>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Use admin-specific endpoints
      const safeGet = async (url: string) => {
        try { return await api.get(url); }
        catch { return { data: {} }; }
      };

      const [statsRes, appointmentsRes, contactsRes] = await Promise.all([
        safeGet('/admin/dashboard-stats'),
        safeGet('/admin/appointments'),
        safeGet('/contact/'),
      ]);

      const dashStats = statsRes.data?.stats || statsRes.data || {};
      const appointments: any[] = appointmentsRes.data?.appointments || [];
      const contacts: any[] = contactsRes.data?.contacts || contactsRes.data || [];

      // Build chart data from appointments
      const statuses = ["completed", "cancelled", "in-progress", "in progress", "booked", "pending", "accepted"];
      const statusCounts: Record<string, number> = {};
      appointments.forEach((a: any) => {
        const s = (a.status || "").toLowerCase();
        statuses.forEach((st) => { if (s === st) statusCounts[st] = (statusCounts[st] || 0) + 1; });
      });

      const completed = (statusCounts["completed"] || 0);
      const cancelled = (statusCounts["cancelled"] || 0);
      const inProg = (statusCounts["in-progress"] || 0) + (statusCounts["in progress"] || 0);
      const booked = (statusCounts["booked"] || 0) + (statusCounts["pending"] || 0) + (statusCounts["accepted"] || 0);

      const appointmentChartData = [
        { name: "Completed", value: completed, fill: "#10b981" },
        { name: "Cancelled", value: cancelled, fill: "#ef4444" },
        { name: "In Progress", value: inProg, fill: "#f59e0b" },
        { name: "Upcoming", value: booked, fill: "#3b82f6" },
      ].filter((d) => d.value > 0);

      const userChartData = [
        { name: "Doctors", value: dashStats.totalDoctors ?? 0, fill: "#10b981" },
        { name: "Patients", value: dashStats.totalPatients ?? 0, fill: "#3b82f6" },
        { name: "Pending Dr.", value: dashStats.pendingDoctors ?? 0, fill: "#f59e0b" },
      ].filter((d) => d.value > 0);

      const today = new Date().toISOString().split("T")[0];

      // Map DB lowercase status → UI capitalized
      const mapDbStatus = (s: string) => {
        const m: Record<string, string> = { pending: "Booked", confirmed: "Accepted", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected" };
        return m[(s || "").toLowerCase()] || s;
      };

      const todayAppts = appointments
        .filter((a: any) => String(a.date).slice(0, 10) === today && (a.status || "") !== "cancelled")
        .slice(0, 8)
        .map((a: any) => ({
          _id: a._id,
          patientName: a.patientId?.name || a.patientName || "Unknown Patient",
          doctorName: a.doctorId?.name || a.doctorName || "Unknown Doctor",
          specialization: a.doctorId?.specialization || a.specialization || "N/A",
          time: a.time || "—",
          date: a.date,
          status: mapDbStatus(a.status),
        }));

      setStats({
        totalUsers: dashStats.totalUsers ?? 0,
        totalDoctors: dashStats.totalDoctors ?? 0,
        totalPatients: dashStats.totalPatients ?? 0,
        totalAppointments: dashStats.totalAppointments ?? appointments.length,
        completedAppointments: dashStats.completedAppointments ?? completed,
        cancelledAppointments: dashStats.cancelledAppointments ?? cancelled,
        inProgressAppointments: dashStats.inProgressAppointments ?? inProg,
        totalPrescriptions: dashStats.totalPrescriptions ?? 0,
        pendingDoctors: dashStats.pendingDoctors ?? 0,
        pendingPatients: dashStats.pendingPatients ?? 0,
        totalContacts: Array.isArray(contacts) ? contacts.length : 0,
        openContacts: Array.isArray(contacts) ? contacts.filter((c: any) => (c.status || "").toLowerCase() === "open").length : 0,
      });

      setAppointmentData(appointmentChartData);
      setUserData(userChartData);
      setTodayAppointments(todayAppts);
      setRecentContacts(Array.isArray(contacts) ? contacts.slice(0, 3) : []);

      // Fetch analytics in parallel (non-blocking)
      try {
        const [analyticsRes, demandRes] = await Promise.all([
          safeGet('/appointments/analytics/dashboard'),
          safeGet('/appointments/analytics/demand'),
        ]);
        if (analyticsRes.data?.success) setAnalyticsStats(analyticsRes.data.data);
        if (demandRes.data?.success) setDoctorDemand(demandRes.data.data);
      } catch { /* Analytics failure is non-critical */ }

      setRetryCount(0);
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error);
      if (retryCount < 2) {
        toast({ title: "Loading Dashboard", description: "Retrying data fetch..." });
        setTimeout(() => { setRetryCount((c) => c + 1); fetchDashboardData(); }, 2000);
      } else {
        toast({ title: "Notice", description: "Could not load all data. Check backend connection.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount, toast]);

  useEffect(() => { fetchDashboardData(); }, []);

  // Real-time socket: refresh on new registrations / appointments
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchDashboardData();
    socket.on("user:registered", refresh);
    socket.on("appointment:created", refresh);
    socket.on("appointment:booked", refresh);
    socket.on("appointment:cancelled", refresh);
    socket.on("doctor:pending", refresh);
    return () => {
      socket.off("user:registered", refresh);
      socket.off("appointment:created", refresh);
      socket.off("appointment:booked", refresh);
      socket.off("appointment:cancelled", refresh);
      socket.off("doctor:pending", refresh);
    };
  }, [socket, fetchDashboardData]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Control Panel</h1>
            <p className="mt-1 text-blue-100">
              Welcome, <span className="font-semibold text-white">{user?.name || "Admin User"}</span> · {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => fetchDashboardData()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => analyticsRef.current?.scrollIntoView({ behavior: "smooth" })}>
              <TrendingUp className="h-4 w-4" /> Analytics
            </Button>
          </div>
        </div>
      </div>

      {/* Top 4 Main Stat Cards — symmetric colored layout */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

        {/* Total Users */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-primary p-5 text-primary-foreground">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wide">Total Users</p>
                  <p className="text-4xl font-bold mt-1">{stats.totalUsers}</p>
                  <p className="text-xs text-primary-foreground/60 mt-1">All registered users</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/20"><Users className="h-5 w-5" /></div>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-card">
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-foreground">{stats.totalDoctors}</div>
                  <p className="text-muted-foreground">Doctors</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-foreground">{stats.totalPatients}</div>
                  <p className="text-muted-foreground">Patients</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/admin/users")}>
                <Eye className="h-3 w-3 mr-1" /> View Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Total Appointments */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-secondary p-5 text-secondary-foreground">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-secondary-foreground/70 uppercase tracking-wide">Appointments</p>
                  <p className="text-4xl font-bold mt-1">{stats.totalAppointments}</p>
                  <p className="text-xs text-secondary-foreground/60 mt-1">Total appointments</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/20"><CalendarDays className="h-5 w-5" /></div>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-card">
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-green-600">{stats.completedAppointments}</div>
                  <p className="text-muted-foreground">Done</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-red-600">{stats.cancelledAppointments}</div>
                  <p className="text-muted-foreground">Cancelled</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-amber-600">{stats.inProgressAppointments}</div>
                  <p className="text-muted-foreground">Active</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/admin/appointments")}>
                <Eye className="h-3 w-3 mr-1" /> View Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Approvals */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-orange-500 p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Pending Approvals</p>
                  <p className="text-4xl font-bold mt-1">{stats.pendingDoctors + stats.pendingPatients}</p>
                  <p className="text-xs text-white/60 mt-1">
                    {(stats.pendingDoctors + stats.pendingPatients) === 0 ? "No pending registrations" : "Awaiting review"}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/20"><AlertCircle className="h-5 w-5" /></div>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-card">
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-foreground">{stats.pendingDoctors}</div>
                  <p className="text-muted-foreground">Doctors</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-foreground">{stats.pendingPatients}</div>
                  <p className="text-muted-foreground">Patients</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/admin/approvals")}>
                <Eye className="h-3 w-3 mr-1" /> {(stats.pendingDoctors + stats.pendingPatients) > 0 ? "Review Now" : "View Approvals"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-cyan-600 p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Contacts</p>
                  <p className="text-4xl font-bold mt-1">{stats.totalContacts}</p>
                  <p className="text-xs text-white/60 mt-1">Total messages received</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/20"><MessageSquare className="h-5 w-5" /></div>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-card">
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-red-600">{stats.openContacts}</div>
                  <p className="text-muted-foreground">Open</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold text-green-600">{stats.totalContacts - stats.openContacts}</div>
                  <p className="text-muted-foreground">Resolved</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/admin/contacts")}>
                <Eye className="h-3 w-3 mr-1" /> View Messages
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointment Status Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Appointment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={appointmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {appointmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No appointment data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Type Distribution Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">User Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {userData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {userData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No user data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments Section */}
      {todayAppointments.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-blue-600" />
              Today's Appointments ({todayAppointments.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/appointments")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayAppointments.map((apt) => (
                <div key={apt._id} className="flex items-center justify-between rounded-lg bg-muted/40 p-4 hover:bg-muted/60 transition">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {apt.patientName} <span className="text-muted-foreground">→</span> {apt.doctorName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {apt.time} • {apt.specialization}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {apt.status}
                    </Badge>
                    {apt.status === 'Completed' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/prescriptions/${apt._id}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <FileText className="h-4 w-4 mr-1" /> Rx
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Contact Messages */}
      {Array.isArray(recentContacts) && recentContacts.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-cyan-600" />
              Recent Contact Messages ({recentContacts.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/contacts")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentContacts.map((contact) => (
                <div key={contact._id} className="flex items-start justify-between rounded-lg bg-muted/40 p-4 hover:bg-muted/60 transition border border-muted/20">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{contact.userName || contact.userEmail}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{contact.message}</p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {contact.status || 'open'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────── */}
      {/* ANALYTICS QUICK OVERVIEW                  */}
      {/* ─────────────────────────────────────────── */}
      <div ref={analyticsRef} className="scroll-mt-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Analytics Overview
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Key appointment metrics at a glance</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/analytics")} className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Full Analytics
            </Button>
          </CardHeader>
          <CardContent>
            {analyticsStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Appts</p>
                  <p className="text-3xl font-bold text-primary">{analyticsStats.total}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completion</p>
                  <p className="text-3xl font-bold text-green-600">{analyticsStats.completionRate}%</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cancelled</p>
                  <p className="text-3xl font-bold text-red-600">{analyticsStats.statusDistribution.cancelled}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">High Demand</p>
                  <p className="text-3xl font-bold text-purple-600">{doctorDemand?.highDemandDoctors?.length ?? 0}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Analytics require appointment data.</p>
                <Button variant="link" size="sm" onClick={() => navigate("/admin/analytics")} className="mt-1 text-primary">
                  Open Analytics →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
