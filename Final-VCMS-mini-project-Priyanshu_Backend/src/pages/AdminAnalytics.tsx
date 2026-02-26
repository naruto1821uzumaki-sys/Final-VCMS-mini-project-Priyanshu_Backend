import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Stethoscope,
  RefreshCw,
} from "lucide-react";
import api from "@/services/api";

interface AppointmentStats {
  total: number;
  statusDistribution: {
    completed: number;
    cancelled: number;
    pending: number;
    inProgress: number;
  };
  cancelledByDoctor: number;
  cancelledByPatient: number;
  monthlyTrends: Record<string, number>;
  completionRate: number;
}

interface DoctorAnalytics {
  doctorId: string;
  doctorName: string;
  specialization: string;
  appointmentCount: number;
  completedCount: number;
  cancellationRate: number;
}

interface DoctorDemandData {
  topDoctors: DoctorAnalytics[];
  highDemandThreshold: number;
  highDemandDoctors: DoctorAnalytics[];
}

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

export default function AdminAnalytics() {
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStats | null>(null);
  const [doctorDemand, setDoctorDemand] = useState<DoctorDemandData | null>(null);
  const [userStats, setUserStats] = useState<{ totalDoctors: number; totalPatients: number; pendingDoctors: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const safeGet = async (url: string) => { try { return await api.get(url); } catch { return { data: {} }; } };
      const [appointmentsRes, doctorRes, statsRes] = await Promise.all([
        safeGet("/appointments/analytics/dashboard"),
        safeGet("/appointments/analytics/demand"),
        safeGet("/admin/dashboard-stats"),
      ]);

      if (appointmentsRes.data?.success) {
        setAppointmentStats(appointmentsRes.data.data);
      }
      if (doctorRes.data?.success) {
        setDoctorDemand(doctorRes.data.data);
      }
      const s = statsRes.data?.stats || statsRes.data || {};
      if (s.totalDoctors !== undefined || s.totalPatients !== undefined) {
        setUserStats({ totalDoctors: s.totalDoctors ?? 0, totalPatients: s.totalPatients ?? 0, pendingDoctors: s.pendingDoctors ?? 0 });
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Prepare data for charts
  const statusData = appointmentStats
    ? [
        { name: "Completed", value: appointmentStats.statusDistribution.completed },
        { name: "Cancelled", value: appointmentStats.statusDistribution.cancelled },
        { name: "Pending", value: appointmentStats.statusDistribution.pending },
        { name: "In Progress", value: appointmentStats.statusDistribution.inProgress },
      ].filter((d) => d.value > 0)
    : [];

  const cancelationData = appointmentStats
    ? [
        { name: "By Doctor", value: appointmentStats.cancelledByDoctor },
        { name: "By Patient", value: appointmentStats.cancelledByPatient },
      ]
    : [];
  // Only show cancellation chart if there are any cancelled appointments
  const hasCancellations = (appointmentStats?.statusDistribution.cancelled ?? 0) > 0;

  const userDistributionData = userStats
    ? [
        { name: "Doctors", value: userStats.totalDoctors, fill: "#10b981" },
        { name: "Patients", value: userStats.totalPatients, fill: "#3b82f6" },
        { name: "Pending Dr.", value: userStats.pendingDoctors, fill: "#f59e0b" },
      ].filter((d) => d.value > 0)
    : [];

  const doctorDemandData = doctorDemand?.topDoctors || [];

  const monthlyData = appointmentStats
    ? Object.entries(appointmentStats.monthlyTrends).map(([month, count]) => ({
        month,
        appointments: count,
      }))
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><TrendingUp className="h-6 w-6" /> Analytics Dashboard</h1>
            <p className="mt-1 text-violet-100 text-sm">System-wide analytics and performance metrics</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={fetchAnalyticsData}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Appointments</p>
              <p className="text-4xl font-bold text-blue-600">
                {appointmentStats?.total || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Completion Rate</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-4xl font-bold text-green-600">
                  {appointmentStats?.completionRate || 0}%
                </p>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Cancellations</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-4xl font-bold text-red-600">
                  {appointmentStats?.statusDistribution.cancelled || 0}
                </p>
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">High Demand Doctors</p>
              <p className="text-4xl font-bold text-purple-600">
                {doctorDemand?.highDemandDoctors?.length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={90}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <TrendingUp className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No appointment data yet</p>
                <p className="text-xs">Data will appear once appointments are created</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> User Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={userDistributionData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Users">
                    {userDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Users className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No user data yet</p>
                <p className="text-xs">Data will appear once users register</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancellation Source</CardTitle>
          </CardHeader>
          <CardContent>
            {hasCancellations ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cancelationData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number, name: string) => [value, name === "value" ? "Cancellations" : name]} />
                  <Bar dataKey="value" name="Cancellations" radius={[8, 8, 0, 0]}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#f97316" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <TrendingDown className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No cancellations yet</p>
                <p className="text-xs">Cancellation breakdown will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics summary card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total Appointments", value: appointmentStats?.total ?? 0, color: "text-primary" },
              { label: "Completion Rate", value: `${appointmentStats?.completionRate ?? 0}%`, color: "text-green-600" },
              { label: "Total Cancellations", value: appointmentStats?.statusDistribution.cancelled ?? 0, color: "text-red-600" },
              { label: "In Progress", value: appointmentStats?.statusDistribution.inProgress ?? 0, color: "text-amber-600" },
              { label: "Total Doctors", value: userStats?.totalDoctors ?? 0, color: "text-secondary" },
              { label: "Total Patients", value: userStats?.totalPatients ?? 0, color: "text-blue-600" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Appointment Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="appointments"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                  name="Total Appointments"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Doctor Demand Table */}
      {doctorDemandData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Doctor Demand Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Doctor Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Specialization</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Appointments</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Completed</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Cancellation Rate</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorDemandData.map((doctor) => (
                    <tr key={doctor.doctorId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{doctor.doctorName}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {doctor.specialization}
                      </td>
                      <td className="py-3 px-4 font-bold">{doctor.appointmentCount}</td>
                      <td className="py-3 px-4 text-green-600 font-semibold">
                        {doctor.completedCount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            doctor.cancellationRate > 20
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {doctor.cancellationRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {doctor.appointmentCount >
                        (doctorDemand?.highDemandThreshold || 10) ? (
                          <div className="flex items-center gap-1 text-blue-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-semibold">High Demand</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
