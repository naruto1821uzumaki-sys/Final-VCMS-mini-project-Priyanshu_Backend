import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ArrowLeft, AlertCircle } from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
}

interface Prescription {
  _id: string;
  appointmentId: any;
  patientId: any;
  doctorId: any;
  medications: Medication[];
  diagnosis: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  followUpDate?: string;
  status: string;
  issuedAt: string;
  validUntil?: string;
  createdAt: string;
}

const ViewPrescription = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrescription();
  }, [id]);

  const fetchPrescription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data = null;

      // Try multiple endpoints
      try {
        const res = await api.get(`/prescriptions/${id}`);
        if (res.data?.success) {
          data = res.data.data;
        }
      } catch (err1: any) {
        // Try as appointment ID
        try {
          const res = await api.get(`/prescriptions/appointment/${id}`);
          if (res.data?.success) {
            data = res.data.data;
          }
        } catch (err2) {
          console.log("Prescription not found");
        }
      }

      if (!data) {
        setError("Prescription not found. It may not have been created yet.");
        setLoading(false);
        return;
      }

      setPrescription(data);
      
      // Mark as viewed
      try {
        await api.post(`/prescriptions/${data._id}/view`);
      } catch (err) {
        console.log("Could not mark as viewed");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load prescription");
      toast({
        title: "Error",
        description: "Failed to load prescription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading prescription...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold text-slate-700">{error || "Prescription not available"}</p>
            <p className="text-sm text-muted-foreground mt-2">The prescription may not have been created yet.</p>
            <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Prescription</h1>
            <p className="text-muted-foreground mt-2">Medical Prescription Details</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-200 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{prescription.diagnosis || "Prescription"}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Issued: {new Date(prescription.issuedAt || prescription.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Badge className="text-white capitalize">{prescription.status}</Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase">Patient</p>
                <p className="text-lg font-semibold text-slate-900">{prescription.patientId?.name || "Unknown"}</p>
                {prescription.patientId?.email && <p className="text-sm text-slate-600">{prescription.patientId.email}</p>}
              </div>
              <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase">Doctor</p>
                <p className="text-lg font-semibold text-slate-900">Dr. {prescription.doctorId?.name || "Unknown"}</p>
                {prescription.doctorId?.specialization && <p className="text-sm text-slate-600">{prescription.doctorId.specialization}</p>}
              </div>
            </div>

            {prescription.clinicalNotes && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Clinical Notes</p>
                <p className="text-slate-900 bg-slate-50 p-3 rounded">{prescription.clinicalNotes}</p>
              </div>
            )}

            {prescription.medications && prescription.medications.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 uppercase">Medications</p>
                {prescription.medications.map((med, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-4">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-600 font-medium">Medication</p>
                        <p className="text-slate-900 font-semibold">{med.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-medium">Dosage</p>
                        <p className="text-slate-900">{med.dosage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-medium">Frequency</p>
                        <p className="text-slate-900">{med.frequency}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 font-medium">Duration</p>
                        <p className="text-slate-900">{med.duration}</p>
                      </div>
                    </div>
                    {med.instructions && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-slate-600 font-medium mb-1">Instructions</p>
                        <p className="text-sm text-slate-900">{med.instructions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {prescription.treatmentPlan && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Treatment Plan</p>
                <p className="text-slate-900 bg-slate-50 p-3 rounded">{prescription.treatmentPlan}</p>
              </div>
            )}

            {prescription.followUpDate && (
              <div className="border-t pt-4">
                <div className="bg-green-50 rounded p-4">
                  <p className="text-xs text-slate-600 font-medium mb-1">Follow-up Recommended</p>
                  <p className="text-lg font-semibold text-green-700">{new Date(prescription.followUpDate).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewPrescription;
