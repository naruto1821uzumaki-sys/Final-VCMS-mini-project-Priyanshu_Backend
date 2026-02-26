import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { FileText, Download, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  refills: number;
  sideEffects: string[];
}

interface Prescription {
  _id: string;
  appointmentId: any;
  medicalHistoryId: any;
  patientId: any;
  doctorId: any;
  medications: Medication[];
  diagnosis: string;
  clinicalNotes: string;
  treatmentPlan: string;
  followUpDate: string;
  followUpRecommendations: string;
  status: "draft" | "issued" | "viewed" | "picked_up" | "cancelled";
  issuedAt: string;
  viewedAt: string;
  pickedUpAt: string;
  cancelledAt: string;
  cancelledReason: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

const PatientPrescriptions = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (user?._id) {
      fetchPrescriptions();
    }
  }, [user?._id, statusFilter]);

  // Socket listener for real-time prescription updates
  useEffect(() => {
    if (!socket || !user?._id) return;

    const handlePrescriptionIssued = (data: any) => {
      if (data.patientId === user._id) {
        setPrescriptions((prev) => [data, ...prev]);
        toast({ title: "New prescription", description: "Doctor has issued a new prescription." });
      }
    };

    socket.on("prescription:issued", handlePrescriptionIssued);
    return () => socket.off("prescription:issued", handlePrescriptionIssued);
  }, [socket, user?._id, toast]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      let url = `/api/prescriptions/patient/${user?._id}`;
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }
      const response = await api.get(url);
      if (response.data?.success) {
        setPrescriptions(response.data.prescriptions || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load prescriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPrescription = async (prescription: Prescription) => {
    if (prescription.status === "issued" && !prescription.viewedAt) {
      try {
        await api.post(`/api/prescriptions/${prescription._id}/view`);
        toast({ title: "Success", description: "Prescription marked as viewed" });
        fetchPrescriptions();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.response?.data?.message || "Failed to mark as viewed",
          variant: "destructive",
        });
      }
    }
    setSelectedPrescription(prescription);
  };

  const handlePickupPrescription = async (prescriptionId: string) => {
    try {
      const response = await api.post(`/api/prescriptions/${prescriptionId}/pickup`, {});
      if (response.data?.success) {
        toast({ title: "Success", description: "Prescription marked as picked up" });
        fetchPrescriptions();
        setSelectedPrescription(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to mark as picked up",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "issued":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "viewed":
        return <FileText className="h-4 w-4 text-yellow-500" />;
      case "picked_up":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "issued":
        return "bg-blue-100 text-blue-800";
      case "viewed":
        return "bg-yellow-100 text-yellow-800";
      case "picked_up":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Prescriptions</h1>
        <p className="text-muted-foreground">View and manage your prescriptions</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "issued", "viewed", "picked_up", "cancelled"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className="capitalize"
          >
            {status === "picked_up" ? "Picked Up" : status}
          </Button>
        ))}
      </div>

      {/* Prescriptions Grid */}
      {prescriptions.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No prescriptions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prescriptions.map((rx) => (
            <Card key={rx._id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Diagnosis: {rx.diagnosis}</h3>
                        <p className="text-sm text-muted-foreground">
                          Dr. {rx.doctorId?.name || "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Issued</p>
                        <p className="font-medium">
                          {rx.issuedAt
                            ? new Date(rx.issuedAt).toLocaleDateString()
                            : "Not issued"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valid Until</p>
                        <p
                          className={`font-medium ${
                            isExpired(rx.validUntil) ? "text-destructive" : ""
                          }`}
                        >
                          {new Date(rx.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Medications</p>
                        <p className="font-medium">{rx.medications.length} item(s)</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(rx.status)}
                          <span className="capitalize">{rx.status}</span>
                        </div>
                      </div>
                    </div>

                    {rx.medications.length > 0 && (
                      <div className="mt-4 text-sm">
                        <p className="text-xs text-muted-foreground mb-2">Medications:</p>
                        <div className="flex flex-wrap gap-2">
                          {rx.medications.map((med, idx) => (
                            <Badge key={idx} variant="secondary">
                              {med.name} {med.dosage}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleViewPrescription(rx)}
                      className="whitespace-nowrap"
                    >
                      View Details
                    </Button>
                    {rx.status === "issued" && !rx.pickedUpAt && !isExpired(rx.validUntil) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePickupPrescription(rx._id)}
                        className="whitespace-nowrap"
                      >
                        Mark Picked Up
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.print()}
                      className="whitespace-nowrap"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="border-0 shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Prescription Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPrescription(null)}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status and Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Doctor</p>
                  <p className="font-medium">{selectedPrescription.doctorId?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedPrescription.status)}>
                    {selectedPrescription.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Issued</p>
                  <p className="font-medium">
                    {selectedPrescription.issuedAt
                      ? new Date(selectedPrescription.issuedAt).toLocaleDateString()
                      : "Not issued"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valid Until</p>
                  <p className="font-medium">
                    {new Date(selectedPrescription.validUntil).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
                <p className="font-medium">{selectedPrescription.diagnosis}</p>
              </div>

              {/* Clinical Notes */}
              {selectedPrescription.clinicalNotes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Clinical Notes</p>
                  <p className="text-sm">{selectedPrescription.clinicalNotes}</p>
                </div>
              )}

              {/* Medications */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Medications</p>
                <div className="space-y-3">
                  {selectedPrescription.medications.map((med, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="font-medium">{med.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dosage</p>
                          <p className="font-medium">{med.dosage}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Frequency</p>
                          <p className="font-medium">{med.frequency}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-medium">{med.duration}</p>
                        </div>
                      </div>
                      {med.instructions && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Instructions</p>
                          <p className="text-sm">{med.instructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up */}
              {selectedPrescription.followUpDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Follow-up Date</p>
                  <p className="font-medium">
                    {new Date(selectedPrescription.followUpDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedPrescription.status === "issued" &&
                  !selectedPrescription.pickedUpAt &&
                  !isExpired(selectedPrescription.validUntil) && (
                    <Button onClick={() => handlePickupPrescription(selectedPrescription._id)}>
                      Mark Picked Up
                    </Button>
                  )}
                <Button
                  variant="outline"
                  onClick={() => {
                    window.print();
                    setSelectedPrescription(null);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Print/Download
                </Button>
                <Button variant="outline" onClick={() => setSelectedPrescription(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PatientPrescriptions;
