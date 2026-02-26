import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, FileText, Users, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DoctorPatients = () => {
  const { user } = useAuth();
  const { appointments, getPrescriptionByAppointment } = useClinic();
  const navigate = useNavigate();

  const myAppointments = appointments.filter((a) => (a.doctorId === user?._id || a.doctorId === user?.id) && a.status !== "Cancelled");

  // Group by patient
  const patientMap = new Map<string, typeof myAppointments>();
  myAppointments.forEach((apt) => {
    const existing = patientMap.get(apt.patientId) || [];
    existing.push(apt);
    patientMap.set(apt.patientId, existing);
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "Booked": return "bg-primary/10 text-primary";
      case "Accepted": return "bg-secondary/10 text-secondary";
      case "In Progress": return "bg-warning/10 text-warning";
      case "Completed": return "bg-secondary/10 text-secondary";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-secondary p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="h-6 w-6" /> My Patients</h1>
            <p className="mt-1 text-white/70 text-sm">{patientMap.size} patient{patientMap.size !== 1 ? "s" : ""} · {myAppointments.length} total appointment{myAppointments.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <div className="text-2xl font-bold">{patientMap.size}</div>
            <div className="text-xs text-white/70">Unique Patients</div>
          </div>
        </div>
      </div>

      {patientMap.size === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No patients yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Patients will appear here after accepting appointments.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {Array.from(patientMap.entries()).map(([patientId, apts]) => {
          const firstApt = apts[0];
          return (
            <Card key={patientId} className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {firstApt.patientName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <CardTitle className="text-base">{firstApt.patientName}</CardTitle>
                    <p className="text-xs text-muted-foreground">Age: {firstApt.patientAge || "—"} • {firstApt.patientMedicalHistory || "No history"}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {apts.sort((a, b) => b.date.localeCompare(a.date)).map((apt) => {
                  const rx = getPrescriptionByAppointment(apt.id);
                  return (
                    <div key={apt.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarDays className="h-3 w-3" /> {apt.date}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" /> {apt.time}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColor(apt.status)}`}>{apt.status}</span>
                      </div>
                      <div className="flex gap-1">
                        {rx ? (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate(`/prescriptions/${apt.id}`)}>
                            <FileText className="h-3 w-3 mr-1" /> Prescription
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No Rx</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorPatients;
