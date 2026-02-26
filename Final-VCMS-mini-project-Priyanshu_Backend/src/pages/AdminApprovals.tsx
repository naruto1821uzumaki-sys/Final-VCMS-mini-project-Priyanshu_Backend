import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Calendar, Mail, Phone, Award, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface DoctorApproval {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: number;
  qualifications: string[];
  licenseNumber: string;
  createdAt: string;
}

interface PatientApproval {
  _id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  createdAt: string;
}

const AdminApprovals = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [approvalTab, setApprovalTab] = useState<"doctors" | "patients">("doctors");
  const [pendingDoctors, setPendingDoctors] = useState<DoctorApproval[]>([]);
  const [pendingPatients, setPendingPatients] = useState<PatientApproval[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [rejectingDoctor, setRejectingDoctor] = useState<DoctorApproval | null>(null);
  const [rejectingPatient, setRejectingPatient] = useState<PatientApproval | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const [doctorsRes, patientsRes] = await Promise.all([
        api.get('/admin/doctors/pending-list').catch(() => ({ data: { doctors: [] } })),
        api.get('/admin/patients/pending').catch(() => ({ data: { patients: [] } })),
      ]);
      const doctors = doctorsRes.data?.doctors?.filter((d: any) => d.approvalStatus === 'pending') || [];
      const patients = patientsRes.data?.patients?.filter((p: any) => p.approvalStatus === 'pending') || [];
      setPendingDoctors(doctors);
      setPendingPatients(patients);
    } catch (err) {
      console.error("Error fetching pending users:", err);
      toast({
        title: "Error",
        description: "Failed to fetch pending approvals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDoctor = async (doctorId: string) => {
    setApprovalLoading(true);
    try {
      const res = await api.post(`/admin/doctors/${doctorId}/approve`);
      if (res.data?.success) {
        toast({ title: "Success", description: "Doctor has been approved and notified." });
        setPendingDoctors(pendingDoctors.filter((d) => d._id !== doctorId));
      } else {
        toast({ title: "Error", description: res.data?.message || "Approval failed", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Error approving doctor",
        description: err.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectDoctor = async () => {
    if (!rejectingDoctor || !rejectReason.trim()) return;

    setApprovalLoading(true);
    try {
      const res = await api.post(`/admin/doctors/${rejectingDoctor._id}/reject`, { reason: rejectReason });
      if (res.data?.success) {
        toast({ title: "Success", description: "Doctor has been notified of rejection." });
        setPendingDoctors(pendingDoctors.filter((d) => d._id !== rejectingDoctor._id));
        setRejectingDoctor(null);
        setRejectReason("");
      } else {
        toast({ title: "Error", description: res.data?.message || "Rejection failed", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Error rejecting doctor",
        description: err.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleApprovePatient = async (patientId: string) => {
    setApprovalLoading(true);
    try {
      const res = await api.post(`/admin/patients/${patientId}/approve`);
      if (res.data?.success) {
        toast({ title: "Success", description: "Patient has been approved and notified." });
        setPendingPatients(pendingPatients.filter((p) => p._id !== patientId));
      } else {
        toast({ title: "Error", description: res.data?.message || "Approval failed", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Error approving patient",
        description: err.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectPatient = async () => {
    if (!rejectingPatient || !rejectReason.trim()) return;

    setApprovalLoading(true);
    try {
      const res = await api.post(`/admin/patients/${rejectingPatient._id}/reject`, { reason: rejectReason });
      if (res.data?.success) {
        toast({ title: "Success", description: "Patient has been notified of rejection." });
        setPendingPatients(pendingPatients.filter((p) => p._id !== rejectingPatient._id));
        setRejectingPatient(null);
        setRejectReason("");
      } else {
        toast({ title: "Error", description: res.data?.message || "Rejection failed", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Error rejecting patient",
        description: err.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manage Approvals</h1>
            <p className="mt-1 text-orange-100 text-sm">Review and approve new doctor and patient registrations</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => fetchPendingUsers()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pending Doctors</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">{pendingDoctors.length}</p>
              </div>
              <Award className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pending Patients</p>
                <p className="text-4xl font-bold text-purple-600 mt-2">{pendingPatients.length}</p>
              </div>
              <FileText className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setApprovalTab("doctors")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            approvalTab === "doctors"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          👨‍⚕️ New Doctors ({pendingDoctors.length})
        </button>
        <button
          onClick={() => setApprovalTab("patients")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            approvalTab === "patients"
              ? "bg-purple-600 text-white shadow-lg"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          👤 New Patients ({pendingPatients.length})
        </button>
      </div>

      {/* Doctors Approvals */}
      {approvalTab === "doctors" && (
        <div className="space-y-4">
          {pendingDoctors.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="py-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full flex-shrink-0">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">All doctor registrations reviewed</p>
                    <p className="text-sm text-muted-foreground mt-0.5">New applications will appear here when submitted.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingDoctors.map((doctor) => (
              <Card key={doctor._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{doctor.name}</h3>
                        <Badge className="mt-2 bg-blue-100 text-blue-800">{doctor.specialization}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {doctor.email}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {doctor.phone}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Award className="w-4 h-4" />
                          {doctor.experience} years experience
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <FileText className="w-4 h-4" />
                          License: {doctor.licenseNumber}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          Applied: {new Date(doctor.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {doctor.qualifications && doctor.qualifications.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-semibold text-slate-600 mb-2">Qualifications:</p>
                          <div className="flex flex-wrap gap-1">
                            {doctor.qualifications.map((q, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {q}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        onClick={() => handleApproveDoctor(doctor._id)}
                        disabled={approvalLoading}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Approve Doctor
                      </Button>

                      <Button
                        size="lg"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => setRejectingDoctor(doctor)}
                        disabled={approvalLoading}
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Patients Approvals */}
      {approvalTab === "patients" && (
        <div className="space-y-4">
          {pendingPatients.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="py-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full flex-shrink-0">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">All patient registrations reviewed</p>
                    <p className="text-sm text-muted-foreground mt-0.5">New applications will appear here when submitted.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingPatients.map((patient) => (
              <Card key={patient._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{patient.name}</h3>
                        <Badge className="mt-2 bg-purple-100 text-purple-800">{patient.gender}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {patient.email}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {patient.phone}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Award className="w-4 h-4" />
                          Age: {patient.age}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          Applied: {new Date(patient.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        onClick={() => handleApprovePatient(patient._id)}
                        disabled={approvalLoading}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Approve Patient
                      </Button>

                      <Button
                        size="lg"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => setRejectingPatient(patient)}
                        disabled={approvalLoading}
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Rejection Dialog - Doctor */}
      {rejectingDoctor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="border-b">
              <CardTitle>Reject Doctor Registration</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Provide a reason for rejecting <strong>{rejectingDoctor.name}</strong>'s registration:
              </p>
              <Textarea
                placeholder="Reason for rejection (e.g., incomplete qualifications, invalid license...)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-24"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectingDoctor(null);
                    setRejectReason("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleRejectDoctor}
                  disabled={approvalLoading || !rejectReason.trim()}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rejection Dialog - Patient */}
      {rejectingPatient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="border-b">
              <CardTitle>Reject Patient Registration</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Provide a reason for rejecting <strong>{rejectingPatient.name}</strong>'s registration:
              </p>
              <Textarea
                placeholder="Reason for rejection (e.g., invalid information, suspicious activity...)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-24"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectingPatient(null);
                    setRejectReason("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleRejectPatient}
                  disabled={approvalLoading || !rejectReason.trim()}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
