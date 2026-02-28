import { useState, useEffect, useCallback } from "react";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, AlertCircle, CheckCircle2, XCircle, Bell, RefreshCw, CalendarDays } from "lucide-react";
import api from "@/services/api";

const AdminAppointments = () => {
  const { cancelAppointment } = useClinic();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [warningDialog, setWarningDialog] = useState({
    open: false,
    doctorId: null as string | null,
    doctorName: "",
    reason: "",
    message: "",
    loading: false,
  });

  // Fetch appointments from API
  // Map DB lowercase status to UI capitalized status
  const mapDbStatus = (s: string): string => {
    const map: Record<string, string> = {
      pending: 'Booked',
      confirmed: 'Accepted',
      'in-progress': 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return map[s] || s;
  };

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/appointments?limit=200');
      if (res.data?.success) {
        const appointmentsData = (res.data.appointments || []).map((apt: any) => ({
          _id: apt._id,
          id: apt._id,
          patientName: apt.patientId?.name || 'Unknown Patient',
          patientId: apt.patientId?._id || apt.patientId || '',
          doctorId: apt.doctorId?._id || apt.doctorId || '',
          doctorName: apt.doctorId?.name || 'Unknown Doctor',
          specialization: apt.doctorId?.specialization || 'N/A',
          date: apt.date || new Date().toISOString().split('T')[0],
          time: apt.time || '00:00',
          status: mapDbStatus(apt.status || 'pending'),
          reason: apt.cancellationReason || '',
          prescriptionGiven: apt.prescriptionGiven || false,
          prescription: apt.prescriptionId,
        }));
        setAppointments(appointmentsData);
      } else {
        console.warn("Unexpected response format");
        setAppointments([]);
      }
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filtered = appointments
    .filter((a) => statusFilter === "all" || a.status === statusFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  // Calculate statistics
  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === "Completed").length,
    cancelled: appointments.filter(a => a.status === "Cancelled").length,
    pending: appointments.filter(a => a.status === "Booked").length,
    accepted: appointments.filter(a => a.status === "Accepted").length,
    inProgress: appointments.filter(a => a.status === "In Progress").length,
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "Cancelled": return <XCircle className="w-4 h-4 text-red-600" />;
      case "In Progress": return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const handleSendWarningToDoctor = async () => {
    if (!warningDialog.doctorId || !warningDialog.reason) {
      toast({
        title: "Required",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setWarningDialog(prev => ({ ...prev, loading: true }));
      
      const response = await api.post(
        `/appointments/admin/doctor/${warningDialog.doctorId}/warning`,
        {
          reason: warningDialog.reason,
          message: warningDialog.message,
        }
      );

      if (response.data?.success) {
        toast({
          title: "Success",
          description: `Warning sent to ${warningDialog.doctorName}`,
        });
        setWarningDialog({
          open: false,
          doctorId: null,
          doctorName: "",
          reason: "",
          message: "",
          loading: false,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send warning",
        variant: "destructive",
      });
    } finally {
      setWarningDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const filters = ["all", "Booked", "Accepted", "In Progress", "Completed", "Cancelled"];

  return (
    <>
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><CalendarDays className="h-6 w-6" /> All Appointments</h1>
            <p className="mt-1 text-blue-100 text-sm">Manage, track, and monitor all appointments in the system</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => fetchAppointments()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="border-0 shadow-md border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md border-l-4 border-l-red-500 bg-gradient-to-br from-red-50/50 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md border-l-4 border-l-sky-500 bg-gradient-to-br from-sky-50/50 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-sky-600">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Accepted</p>
              <p className="text-2xl font-bold text-purple-600">{stats.accepted}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === f 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "All" : f}
            {f !== "all" && (
              <span className="ml-2 text-xs">
                ({appointments.filter(a => a.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="hidden sm:table-cell">Specialization</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Reason (if cancelled)</TableHead>
                  <TableHead>Prescription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((apt) => {
                  // Use the prescription field populated directly from DB (not ClinicContext which is user-scoped)
                  const rx = apt.prescription;
                  const rxId = rx ? (typeof rx === 'object' && rx !== null ? (rx as any)._id : rx) : null;
                  return (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">{apt.patientName}</TableCell>
                      <TableCell>{apt.doctorName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{apt.specialization}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="text-xs text-muted-foreground">{apt.date}</div>
                        <div className="text-xs font-medium">{apt.time}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColor(apt.status)}`}>{apt.status}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-xs">
                        {apt.status === "Cancelled" && apt.cancelReason ? apt.cancelReason : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${rxId ? "text-green-600" : "text-orange-500"}`}>
                          {rxId ? "✓ Given" : "✗ Not Given"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(apt.status === "Booked" || apt.status === "Accepted") && (
                            <Button size="sm" variant="outline" className="text-destructive text-xs h-7" onClick={() => {
                              cancelAppointment(apt.id, "Cancelled by admin");
                              toast({ title: "Appointment cancelled" });
                            }}>
                              Cancel
                            </Button>
                          )}
                          {apt.status === "Cancelled" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-warning text-xs h-7 border-yellow-500 hover:bg-yellow-50"
                              onClick={() => setWarningDialog({
                                ...warningDialog,
                                doctorId: apt.doctorId,
                                doctorName: apt.doctorName,
                                open: true
                              })}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Warn
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate(rxId ? `/prescriptions/${rxId}` : `/prescriptions/appointment/${apt.id}`)}>
                            Rx
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No appointments found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Warning Dialog */}
    <Dialog open={warningDialog.open} onOpenChange={(openState) => setWarningDialog({ ...warningDialog, open: openState })}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Send Warning to Doctor
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800">
            You are about to send a formal warning to <strong>{warningDialog.doctorName}</strong> regarding high cancellation rate.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Warning Reason *</label>
            <select 
              className="w-full px-3 py-2 rounded-md border border-input text-sm"
              value={warningDialog.reason}
              onChange={(e) => setWarningDialog({ ...warningDialog, reason: e.target.value })}
            >
              <option value="">Select a reason...</option>
              <option value="high-cancellation">High Cancellation Rate</option>
              <option value="no-show">Frequent No-shows</option>
              <option value="poor-ratings">Poor Patient Ratings</option>
              <option value="violation">Policy Violation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Message</label>
            <Textarea 
              placeholder="Enter any additional message for the doctor..."
              value={warningDialog.message}
              onChange={(e) => setWarningDialog({ ...warningDialog, message: e.target.value })}
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setWarningDialog({ ...warningDialog, open: false })}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={() => handleSendWarningToDoctor()}
            disabled={!warningDialog.reason || warningDialog.loading}
          >
            {warningDialog.loading ? "Sending..." : "Send Warning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminAppointments;
