import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Clock, FileText, Activity, IndianRupee, Stethoscope, MapPin, Search, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import api from "@/services/api";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SYMPTOM_CARDS = [
  { name: "Fever", icon: "🤒", keywords: ["fever", "cold", "cough"] },
  { name: "Headache", icon: "🤕", keywords: ["headache"] },
  { name: "Chest Pain", icon: "💔", keywords: ["chest pain", "heart palpitations"] },
  { name: "Skin Rash", icon: "🩹", keywords: ["skin rash", "eczema"] },
  { name: "Joint Pain", icon: "🦴", keywords: ["joint pain", "knee pain"] },
  { name: "Back Pain", icon: "🔙", keywords: ["back pain"] },
  { name: "Stomach Pain", icon: "🤢", keywords: ["stomach pain"] },
  { name: "Acne", icon: "😣", keywords: ["acne"] },
  { name: "Hair Loss", icon: "💇", keywords: ["hair loss"] },
  { name: "High BP", icon: "❤️‍🩹", keywords: ["high blood pressure", "shortness of breath"] },
];

// Map symptoms to doctor specializations
const SYMPTOM_TO_SPECIALIZATION: Record<string, string[]> = {
  "fever": ["General Medicine", "Infectious Disease"],
  "headache": ["Neurology", "General Medicine"],
  "chest pain": ["Cardiology"],
  "skin rash": ["Dermatology"],
  "joint pain": ["Orthopedics", "Rheumatology"],
  "back pain": ["Orthopedics", "Physiotherapy"],
  "stomach pain": ["Gastroenterology", "General Medicine"],
  "acne": ["Dermatology"],
  "hair loss": ["Dermatology"],
  "high blood pressure": ["Cardiology"],
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const { appointments, bookAppointment, getPrescriptionByAppointment, isSlotBooked } = useClinic();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [doctors, setDoctors] = useState<any[]>([]);
  const myAppointments = appointments.filter((a) => a.patientId === user?._id);
  const upcomingCount = myAppointments.filter((a) => a.status === "Booked" || a.status === "Accepted").length;

  // Symptom filter
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);

  // Search state
  const [filterSpec, setFilterSpec] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterName, setFilterName] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Booking state
  const [bookingDoctor, setBookingDoctor] = useState<string | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [openCalendarDoctor, setOpenCalendarDoctor] = useState<string | null>(null);

  // Fetch doctors from API
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/users/doctors', { params: { limit: 100 } });
        if (res.data?.doctors) {
          setDoctors(res.data.doctors);
        }
      } catch (err) {
        console.error("Error fetching doctors:", err);
      }
    };
    fetchDoctors();
  }, []);

  const specializations = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization).filter(Boolean));
    return Array.from(specs) as string[];
  }, [doctors]);

  const nameSuggestions = useMemo(() => {
    if (!filterName.trim()) return [];
    const lower = filterName.toLowerCase();
    return doctors
      .filter((d) => d.name.toLowerCase().startsWith(lower) || d.name.toLowerCase().includes(lower))
      .map((d) => `Dr. ${d.name}`)
      .slice(0, 5);
  }, [doctors, filterName]);

  // Filter doctors by symptom match or search filters
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Symptom card filter - use specialization matching
      if (selectedSymptom) {
        const requiredSpecializations = SYMPTOM_TO_SPECIALIZATION[selectedSymptom.toLowerCase()] || [];
        const hasMatch = requiredSpecializations.some((spec) =>
          doc.specialization?.toLowerCase().includes(spec.toLowerCase())
        );
        if (!hasMatch) return false;
      }
      if (filterSpec && doc.specialization !== filterSpec) return false;
      if (filterLocation && !doc.location?.toLowerCase().includes(filterLocation.toLowerCase())) return false;
      if (filterName) {
        const name = doc.name.toLowerCase();
        if (!name.includes(filterName.toLowerCase().replace("dr. ", ""))) return false;
      }
      return true;
    });
  }, [doctors, filterSpec, filterLocation, filterName, selectedSymptom]);

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDay();
  };

  const getDayNameStr = (dateStr: string) => {
    const d = new Date(dateStr);
    return DAYS[d.getDay()];
  };

  // Generate individual hour slots from a time range (e.g., "09:00", "10:00", "11:00" from "09:00-17:00")
  const generateTimeSlots = (startTime: string, endTime: string): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
      slots.push(timeStr);
      
      // Increment by 1 hour
      currentHour += 1;
      if (currentHour >= endHour && currentMin !== 0) break;
    }

    return slots;
  };

  const isDayAvailable = (doc: typeof doctors[0], dateStr: string) => {
    if (!dateStr || !doc.availability) return false;
    const dayName = getDayNameStr(dateStr);
    return doc.availability.some((a: any) => a.day === dayName);
  };

  const handleBook = async () => {
    const doc = doctors.find((d) => d._id === bookingDoctor);
    if (!doc || !user || !bookDate || !bookTime) return;

    // Extract just the hour from bookTime (e.g., "09:00" from "09:00-10:00" range)
    const selectedTime = typeof bookTime === 'string' ? bookTime.split('-')[0] : bookTime;
    
    if (isSlotBooked(doc._id, bookDate, selectedTime)) {
      toast({ title: "Slot already booked", description: "Please select another slot.", variant: "destructive" });
      return;
    }
    
    try {
      const result = await bookAppointment({
        patientId: user._id,
        patientName: user.name,
        patientAge: user.age || 0,
        patientMedicalHistory: user.medicalHistory,
        doctorId: doc._id,
        doctorName: `Dr. ${doc.name}`,
        specialization: doc.specialization || "",
        location: doc.location,
        date: bookDate,
        time: selectedTime,
        consultationFee: doc.consultationFee,
      });
      
      if (result.success) {
        toast({ title: "Appointment booked successfully!", description: result.message });
        setBookingDoctor(null);
        setBookDate("");
        setBookTime("");
      } else {
        toast({
          title: "Booking failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error booking appointment",
        description: err.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Booked": return "text-primary";
      case "Accepted": return "text-secondary";
      case "In Progress": return "text-warning";
      case "Completed": return "text-secondary";
      case "Cancelled": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const canJoinVideo = (apt: typeof myAppointments[0]) => {
    return apt.status === "Accepted" && apt.date <= today;
  };

  const getDisplayAge = () => {
    console.log("User object:", user);
    if (user?.age && user.age > 0) return user.age;
    if (user?.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(user.dateOfBirth);
      const calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const finalAge = monthDiff < 0 ? calculatedAge - 1 : calculatedAge;
      console.log("Calculated age:", finalAge);
      return finalAge;
    }
    console.log("No age or dateOfBirth found");
    return "—";
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patient Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome, {user?.name?.split(' ')[0]}. Manage your health journey here.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/patient/appointments")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Appointments</CardTitle>
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view all →</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/profile")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Age</CardTitle>
            <Activity className="h-5 w-5 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getDisplayAge()}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to edit →</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/patient/history")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Medical History</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{user?.medicalHistory || "None recorded"}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view records →</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      {myAppointments.filter((a) => a.date === today && a.status !== "Cancelled").length > 0 && (
        <Card className="border-0 shadow-md ring-1 ring-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myAppointments.filter((a) => a.date === today && a.status !== "Cancelled").map((apt) => {
              const rx = getPrescriptionByAppointment(apt.id);
              return (
                <div key={apt.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="font-medium text-sm">{apt.doctorName}</p>
                    <p className="text-xs text-muted-foreground">{apt.specialization} • {apt.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${statusColor(apt.status)}`}>{apt.status}</span>
                    {canJoinVideo(apt) && (
                      <Button size="sm" onClick={() => navigate(`/video/${apt.id}`)} className="gap-1 h-7 text-xs">
                        <Video className="h-3 w-3" /> Join
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/prescription/${apt.id}`)}>
                      {rx ? "View Rx" : "Rx"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Symptom Cards */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Find Doctor by Symptom</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {SYMPTOM_CARDS.map((symptom) => (
            <button
              key={symptom.name}
              onClick={() => {
                setSelectedSymptom(selectedSymptom === symptom.name ? null : symptom.name);
                setFilterSpec("");
                setFilterName("");
                setFilterLocation("");
              }}
              className={`rounded-xl border p-4 text-center transition-all hover:shadow-md ${
                selectedSymptom === symptom.name
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <span className="text-2xl block mb-1">{symptom.icon}</span>
              <span className="text-xs font-medium">{symptom.name}</span>
            </button>
          ))}
        </div>
        {selectedSymptom && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Showing doctors for: <span className="font-semibold text-foreground">{selectedSymptom}</span></span>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSelectedSymptom(null)}>Clear</Button>
          </div>
        )}
      </div>

      {/* Search Doctors */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Search Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={filterSpec}
              onChange={(e) => { setFilterSpec(e.target.value); setSelectedSymptom(null); }}
            >
              <option value="">All Specializations</option>
              {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input placeholder="Location" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
            <div className="relative">
              <Input
                placeholder="Doctor Name"
                value={filterName}
                onChange={(e) => { setFilterName(e.target.value); setShowNameSuggestions(true); }}
                onFocus={() => setShowNameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
              />
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full rounded-md border bg-card shadow-lg">
                  {nameSuggestions.map((name) => (
                    <button
                      key={name}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      onMouseDown={() => { setFilterName(name); setShowNameSuggestions(false); }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Doctors */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Available Doctors ({filteredDoctors.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDoctors.map((doc) => (
            <Card key={doc._id} className="border-0 shadow-md">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-bold">
                    {doc.name.split(' ')[0][0]}{doc.name.split(' ')[1]?.[0] || ''}
                  </div>
                  <div>
                    <p className="font-medium">Dr. {doc.name || doc.specialization || 'Unknown'}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Stethoscope className="h-3 w-3" /> {doc.specialization}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {doc.location || "N/A"}</span>
                  <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> <span className="font-semibold text-foreground">₹{doc.consultationFee}</span></span>
                </div>

                {/* Available Days */}
                <div className="text-xs">
                  <p className="font-medium text-foreground mb-1">Available Days:</p>
                  <div className="flex flex-wrap gap-1">
                    {DAYS.map((day) => {
                      const isAvailable = doc.availability?.some((a: any) => a.day === day);
                      return (
                        <span key={day} className={`rounded-full px-2 py-0.5 text-[11px] ${
                          isAvailable
                            ? "bg-accent text-accent-foreground"
                            : "bg-destructive/10 text-destructive line-through"
                        }`}>
                          {day.slice(0, 3)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Available Time Slots */}
                {doc.availability && doc.availability.length > 0 && (
                  <div className="text-xs">
                    <p className="font-medium text-foreground mb-1">Time Slots:</p>
                    <div className="flex flex-wrap gap-1">
                      {doc.availability.map((slot: any) => (
                        <span key={`${slot.day}-${slot.startTime}`} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
                          {slot.startTime}-{slot.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {bookingDoctor === doc._id ? (
                  <div className="space-y-2 pt-2 border-t">
                    {/* Calendar-based date picker */}
                    <Popover open={openCalendarDoctor === doc._id} onOpenChange={(open) => {
                      if (open) {
                        setOpenCalendarDoctor(doc._id);
                      } else {
                        setOpenCalendarDoctor(null);
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <button
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
                        >
                          {bookDate ? bookDate : <span className="text-muted-foreground">Select date...</span>}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={bookDate ? new Date(bookDate + "T00:00:00") : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const formatted = date.toISOString().split("T")[0];
                              // Only allow selection if doctor is available that day
                              if (isDayAvailable(doc, formatted)) {
                                setBookDate(formatted);
                                setBookTime("");
                              } else {
                                toast({
                                  title: "Doctor not available",
                                  description: `Dr. ${doc.name} is not available on ${getDayNameStr(formatted)}`,
                                  variant: "destructive",
                                });
                              }
                            }
                            setOpenCalendarDoctor(null);
                          }}
                          disabled={(date) => {
                            // Disable past dates
                            if (date < new Date()) return true;
                            // Disable dates where doctor is not available
                            const dateStr = date.toISOString().split("T")[0];
                            return !isDayAvailable(doc, dateStr);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {bookDate && !isDayAvailable(doc, bookDate) && (
                      <p className="text-xs text-destructive">Doctor is not available on {getDayNameStr(bookDate)}.</p>
                    )}
                    {bookDate && isDayAvailable(doc, bookDate) && doc.availability && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Select a time slot:</p>
                        <div className="flex flex-wrap gap-1">
                          {doc.availability
                            .filter((slot: any) => slot.day === getDayNameStr(bookDate))
                            .flatMap((slot: any) => generateTimeSlots(slot.startTime, slot.endTime))
                            .map((timeSlot: string) => {
                              const booked = isSlotBooked(doc._id, bookDate, timeSlot);
                              return (
                                <button
                                  key={timeSlot}
                                  disabled={booked}
                                  onClick={() => setBookTime(timeSlot)}
                                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                                    booked
                                      ? "bg-destructive/10 text-destructive border-destructive/30 cursor-not-allowed line-through"
                                      : bookTime === timeSlot
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted text-foreground border-border hover:bg-accent cursor-pointer hover:border-primary/30"
                                  }`}
                                >
                                  {timeSlot} {booked && "(Booked)"}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleBook} disabled={!bookDate || !bookTime || !isDayAvailable(doc, bookDate)}>Confirm Booking</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setBookingDoctor(null); setBookDate(""); setBookTime(""); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => setBookingDoctor(doc._id)}>Book Appointment</Button>
                )}
              </CardContent>
            </Card>
          ))}
          {filteredDoctors.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No doctors match your search criteria.</p>
          )}
        </div>
      </div>

      {/* Recent Appointments Preview */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Appointments</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/patient/appointments")}>View All</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {myAppointments.length === 0 && <p className="text-sm text-muted-foreground">No appointments yet.</p>}
          {myAppointments.slice(0, 5).map((apt) => {
            const rx = getPrescriptionByAppointment(apt.id);
            return (
              <div key={apt.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="font-medium">{apt.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{apt.specialization} • {apt.location}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <CalendarDays className="h-3 w-3" />{apt.date}
                    <Clock className="h-3 w-3 ml-1" />{apt.time}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-semibold ${statusColor(apt.status)}`}>{apt.status}</span>
                  <span className={`text-[11px] ${rx ? "text-secondary font-semibold" : "text-muted-foreground"}`}>
                    Rx: {rx ? "Given" : "Not Given"}
                  </span>
                  {canJoinVideo(apt) && (
                    <Button size="sm" onClick={() => navigate(`/video/${apt.id}`)} className="gap-1">
                      <Video className="h-3 w-3" /> Join Video
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate(`/prescription/${apt.id}`)}>
                    {rx ? "View Prescription" : "View Rx"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientDashboard;
