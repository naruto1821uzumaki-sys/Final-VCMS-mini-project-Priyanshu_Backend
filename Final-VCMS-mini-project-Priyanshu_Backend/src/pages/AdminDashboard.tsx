import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Stethoscope, UserCheck, CalendarDays, CheckCircle, XCircle, FileText, Clock, AlertCircle, TrendingUp, MessageSquare, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch data with proper error handling and retry logic
      let attempts = 0;
      const maxRetries = 2;

      const makeRequest = async (url: string): Promise<any> => {
        try {
          return await api.get(url);
        } catch (error: any) {
          if (error.response?.status === 429 && attempts < maxRetries) {
            // Rate limited - retry with exponential backoff
            attempts++;
            const backoffTime = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s...
            console.warn(`Rate limited on ${url}, retrying in ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            return makeRequest(url);
          }
          return { data: { users: [], appointments: [], prescriptions: [], contacts: [] } };
        }
      };

      const [usersRes, appointmentsRes, prescriptionsRes] = await Promise.all([
        makeRequest('/users'),
        makeRequest('/appointments'),
        makeRequest('/prescriptions'),
      ]);

      const users = usersRes.data?.users || [];
      const appointments = appointmentsRes.data?.appointments || [];
      const prescriptions = prescriptionsRes.data?.prescriptions || [];
      const contacts = []; // Contacts endpoint may not exist

      // Calculate stats
      const doctors = users.filter((u: any) => u.role === 'doctor');
      const patients = users.filter((u: any) => u.role === 'patient');
      
      const completed = appointments.filter((a: any) => a.status === 'Completed' || a.status === 'completed');
      const cancelled = appointments.filter((a: any) => a.status === 'Cancelled' || a.status === 'cancelled');
      const inProgress = appointments.filter((a: any) => a.status === 'In Progress' || a.status === 'in progress');

      // Prepare chart data
      const appointmentChartData = [
        { name: 'Completed', value: completed.length, fill: '#10b981' },
        { name: 'Cancelled', value: cancelled.length, fill: '#ef4444' },
        { name: 'In Progress', value: inProgress.length, fill: '#f59e0b' },
        { name: 'Booked', value: appointments.filter((a: any) => a.status === 'Booked').length, fill: '#3b82f6' },
      ].filter(d => d.value > 0);

      const userChartData = [
        { name: 'Doctors', value: doctors.length, fill: '#10b981' },
        { name: 'Patients', value: patients.length, fill: '#3b82f6' },
      ].filter(d => d.value > 0);

      const today = new Date().toISOString().split('T')[0];
      const todayAppts = appointments.filter((a: any) => a.date === today && a.status !== 'Cancelled').slice(0, 5);

      setStats({
        totalUsers: users.length,
        totalDoctors: doctors.length,
        totalPatients: patients.length,
        totalAppointments: appointments.length,
        completedAppointments: completed.length,
        cancelledAppointments: cancelled.length,
        inProgressAppointments: inProgress.length,
        totalPrescriptions: prescriptions.length,
        pendingDoctors: doctors.filter((d: any) => d.status === 'pending').length,
        pendingPatients: patients.filter((p: any) => p.status === 'pending').length,
        totalContacts: Array.isArray(contacts) ? contacts.length : 0,
        openContacts: Array.isArray(contacts) ? contacts.filter((c: any) => c.status === 'open' || c.status === 'Open').length : 0,
      });

      setAppointmentData(appointmentChartData);
      setUserData(userChartData);
      setTodayAppointments(todayAppts);
      setRecentContacts(Array.isArray(contacts) ? contacts.slice(0, 3) : []);
      setRetryCount(0);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      
      if (retryCount < 2) {
        toast({
          title: "Loading Dashboard",
          description: "Retrying to fetch data...",
        });
        setTimeout(() => {
          setRetryCount(retryCount + 1);
          fetchDashboardData();
        }, 2000);
      } else {
        toast({
          title: "Notice",
          description: "Using cached or partial dashboard data. Some endpoints may be temporarily unavailable.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

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
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Welcome back, <span className="font-semibold">{user?.name?.split(" ")[0]}</span>. System overview and management.
        </p>
      </div>

      {/* Top 4 Main Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">All registered users</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="text-center">
                <div className="text-xl font-semibold text-green-600">{stats.totalDoctors}</div>
                <p className="text-xs text-muted-foreground">Doctors</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-purple-600">{stats.totalPatients}</div>
                <p className="text-xs text-muted-foreground">Patients</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => navigate("/admin/users")}
            >
              <Eye className="h-3 w-3 mr-1" /> View Details
            </Button>
          </CardContent>
        </Card>

        {/* Total Appointments Card */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Appointments</CardTitle>
              <CalendarDays className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-bold text-indigo-600">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">Total appointments</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t">
              <div>
                <div className="font-semibold text-green-600">{stats.completedAppointments}</div>
                <p className="text-muted-foreground">Completed</p>
              </div>
              <div>
                <div className="font-semibold text-red-600">{stats.cancelledAppointments}</div>
                <p className="text-muted-foreground">Cancelled</p>
              </div>
              <div>
                <div className="font-semibold text-amber-600">{stats.inProgressAppointments}</div>
                <p className="text-muted-foreground">In Progress</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => navigate("/admin/appointments")}
            >
              <Eye className="h-3 w-3 mr-1" /> View Details
            </Button>
          </CardContent>
        </Card>

        {/* Approvals Card */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50/50 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Approvals</CardTitle>
                <p className="text-xs text-muted-foreground/70 mt-1">New doctor & patient registrations</p>
              </div>
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(stats.pendingDoctors + stats.pendingPatients) === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground font-medium">No pending approvals</p>
                <p className="text-xs text-muted-foreground/70">All registrations are approved</p>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-3xl font-bold text-orange-600">{stats.pendingDoctors + stats.pendingPatients}</div>
                  <p className="text-xs text-muted-foreground mt-1">Pending requests</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t">
                  <div className="bg-blue-50/50 rounded p-2">
                    <div className="font-semibold text-blue-600">{stats.pendingDoctors}</div>
                    <p className="text-muted-foreground">Doctors</p>
                  </div>
                  <div className="bg-purple-50/50 rounded p-2">
                    <div className="font-semibold text-purple-600">{stats.pendingPatients}</div>
                    <p className="text-muted-foreground">Patients</p>
                  </div>
                </div>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => navigate("/admin/approvals")}
            >
              <Eye className="h-3 w-3 mr-1" /> {(stats.pendingDoctors + stats.pendingPatients) === 0 ? "View All" : "Review Now"}
            </Button>
          </CardContent>
        </Card>

        {/* Contact Us Card */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
              <MessageSquare className="h-5 w-5 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-bold text-cyan-600">{stats.totalContacts}</div>
              <p className="text-xs text-muted-foreground mt-1">Total contact messages</p>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Open</span>
                <span className="font-semibold text-red-600">{stats.openContacts}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ width: `${stats.totalContacts > 0 ? (stats.openContacts / stats.totalContacts) * 100 : 0}%` }}
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => navigate("/admin/contacts")}
            >
              <Eye className="h-3 w-3 mr-1" /> View Messages
            </Button>
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
                        onClick={() => navigate(`/prescription/${apt.id}`)}
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
    </div>
  );
};

export default AdminDashboard;
