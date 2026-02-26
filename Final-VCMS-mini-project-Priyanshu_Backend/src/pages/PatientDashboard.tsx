import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CalendarDays, Clock, FileText, Activity, IndianRupee, Stethoscope, 
  MapPin, Search, Video, Grid, List, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle,
  ClipboardList, ScanLine, Pill, ChevronRight, Sparkles, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/services/api";
import { formatLocation } from "@/utils/formatLocation";
import { format } from "date-fns";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SYMPTOM_CARDS = [
  { name: "Fever",        icon: "🤒", keywords: ["fever", "cold", "cough"],                       bg: "bg-amber-50",   activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "Headache",    icon: "🤕", keywords: ["headache"],                                    bg: "bg-violet-50",  activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "Chest Pain",  icon: "💔", keywords: ["chest pain", "heart palpitations"],            bg: "bg-rose-50",    activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "Skin Rash",   icon: "🩹", keywords: ["skin rash", "eczema"],                         bg: "bg-pink-50",    activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "Joint Pain",  icon: "🦴", keywords: ["joint pain", "knee pain"],                   bg: "bg-blue-50",    activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "Back Pain",   icon: "🔙", keywords: ["back pain"],                                   bg: "bg-indigo-50",  activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "Stomach Pain",icon: "🤢", keywords: ["stomach pain"],                                bg: "bg-orange-50",  activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "Acne",        icon: "😣", keywords: ["acne"],                                        bg: "bg-fuchsia-50", activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "Hair Loss",   icon: "💇", keywords: ["hair loss"],                                   bg: "bg-yellow-50",  activeBg: "bg-primary/10",  label: "text-primary" },
  { name: "High BP",     icon: "❤️‍🩹", keywords: ["high blood pressure", "shortness of breath"], bg: "bg-red-50",     activeBg: "bg-primary/10",  label: "text-primary" },
];

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
  const { appointments, bookAppointment, getPrescriptionByAppointment, cancelAppointment, isSlotBooked } = useClinic();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Doctors state
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [specializationsList, setSpecializationsList] = useState<string[]>([]);

  // Filter & search state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [filterSpec, setFilterSpec] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterName, setFilterName] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Booking state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [bookDate, setBookDate] = useState<Date | undefined>();
  const [bookTime, setBookTime] = useState("");

  // Appointments tab
  const [appointmentTab, setAppointmentTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  // My appointments filtered
  const myAppointments = appointments.filter((a) => a.patientId === user?._id);
  const upcomingAppointments = myAppointments.filter((a) => ["Booked", "Accepted", "In Progress"].includes(a.status));
  const pastAppointments = myAppointments.filter((a) => a.status === "Completed");
  const cancelledAppointments = myAppointments.filter((a) => a.status === "Cancelled");

  // Fetch doctors and specializations
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDoctors(true);
      try {
        const [doctorsRes, specsRes] = await Promise.all([
          api.get('/public/doctors', { params: { limit: 500 } }),
          api.get('/public/specializations'),
        ]);

        if (doctorsRes.data?.doctors) {
          setDoctors(doctorsRes.data.doctors);
        }

        if (specsRes.data?.specializations) {
          const specs = specsRes.data.specializations
            .map((s: any) => s.specialization)
            .filter(Boolean);
          setSpecializationsList(specs);
        }
      } catch (err) {
        console.error('Error fetching doctors:', err);
        toast({
          title: "Error",
          description: "Failed to load doctors. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchData();
  }, [toast]);

  // Specializations list from server
  const specializations = useMemo(() => {
    if (specializationsList.length > 0) return specializationsList;
    const specs = new Set(doctors.map((d) => d.specialization).filter(Boolean));
    return Array.from(specs) as string[];
  }, [doctors, specializationsList]);

  // Name autocomplete suggestions
  const nameSuggestions = useMemo(() => {
    if (!filterName.trim()) return [];
    const lower = filterName.toLowerCase();
    return doctors
      .filter((d) => (d.name || '').toLowerCase().includes(lower))
      .map((d) => `Dr. ${d.name}`)
      .slice(0, 5);
  }, [doctors, filterName]);

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    // "*" means user explicitly clicked "All" — show all doctors
    const allSpecsSelected = filterSpec === "*";
    // If no filters at all, show empty prompt
    if (selectedSymptoms.length === 0 && !filterName.trim() && !filterSpec && !filterLocation.trim()) {
      return [];
    }

    return doctors.filter((doc) => {
      // Symptom filter
      if (selectedSymptoms.length > 0) {
        const matchesSymptom = selectedSymptoms.some((symptomName) => {
          const card = SYMPTOM_CARDS.find((c) => c.name === symptomName);
          if (!card) return false;
          const specs = card.keywords.reduce((acc: string[], kw) => {
            const relatedSpecs = SYMPTOM_TO_SPECIALIZATION[kw.toLowerCase()] || [];
            return [...acc, ...relatedSpecs];
          }, []);
          return specs.some((sp) => doc.specialization?.toLowerCase().includes(sp.toLowerCase()));
        });
        if (!matchesSymptom) return false;
      }

      // Name filter
      if (filterName.trim()) {
        const searchName = filterName.replace(/^Dr\.\s*/i, "").trim().toLowerCase();
        if (!doc.name?.toLowerCase().includes(searchName)) return false;
      }

      // Specialization filter — "*" = all, anything else = exact match
      if (filterSpec && !allSpecsSelected) {
        if (doc.specialization !== filterSpec) return false;
      }

      // Location filter
      if (filterLocation.trim()) {
        const loc = doc.location?.toLowerCase() || "";
        if (!loc.includes(filterLocation.toLowerCase())) return false;
      }

      return true;
    });
  }, [doctors, selectedSymptoms, filterName, filterSpec, filterLocation]);

  // Handle symptom card click - toggle symptom
  const handleSymptomClick = (symptom: string) => {
    setSelectedSymptoms((prev) => {
      if (prev.includes(symptom)) {
        return prev.filter((s) => s !== symptom);
      } else {
        return [...prev, symptom];
      }
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedSymptoms([]);
    setFilterName("");
    setFilterSpec("");
    setFilterLocation("");
  };

  // Open booking modal
  const openBooking = (doctor: any) => {
    setSelectedDoctor(doctor);
    setBookDate(undefined);
    setBookTime("");
    setShowBookingModal(true);
  };

  // Check if day is available
  const isDayAvailable = (date: Date) => {
    if (!selectedDoctor) return false;
    const dayName = DAYS[date.getDay()];
    return selectedDoctor.availability?.some((av: any) => av.day === dayName) || false;
  };

  // Generate time slots from start/end time (30-minute intervals)
  const generateTimeSlots = (startTime: string, endTime: string): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      slots.push(timeStr);
      
      // Add 30 minutes
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }
    
    return slots;
  };

  // Get available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDoctor || !bookDate) return [];
    const dayName = DAYS[bookDate.getDay()];
    const dayAvail = selectedDoctor.availability?.find((av: any) => av.day === dayName);
    
    if (!dayAvail) return [];
    
    // If slots array exists (old format), use it
    if (dayAvail.slots && Array.isArray(dayAvail.slots)) {
      return dayAvail.slots;
    }
    
    // Otherwise generate slots from startTime/endTime
    if (dayAvail.startTime && dayAvail.endTime) {
      return generateTimeSlots(dayAvail.startTime, dayAvail.endTime);
    }
    
    return [];
  }, [selectedDoctor, bookDate]);

  // Confirm booking
  const handleConfirmBooking = async () => {
    if (!user || !selectedDoctor || !bookDate || !bookTime) {
      toast({
        title: "Error",
        description: "Please select date and time",
        variant: "destructive",
      });
      return;
    }

    const dateStr = format(bookDate, "yyyy-MM-dd");
    
    // Check if slot is already booked
    const slotTaken = isSlotBooked(selectedDoctor._id, dateStr, bookTime);
    if (slotTaken) {
      toast({
        title: "Slot Unavailable",
        description: "This time slot is already booked. Please choose another.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await bookAppointment({
        patientId: user._id,
        patientName: user.name,
        patientAge: user.age || 25,
        patientMedicalHistory: user.medicalHistory || "",
        doctorId: selectedDoctor._id,
        doctorName: `Dr. ${selectedDoctor.name}`,
        specialization: selectedDoctor.specialization || "",
        location: selectedDoctor.location || "",
        date: dateStr,
        time: bookTime,
        consultationFee: selectedDoctor.consultationFee || 500,
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: "Appointment booked successfully. The doctor will confirm shortly.",
        });
        setShowBookingModal(false);
        setSelectedDoctor(null);
      } else {
        toast({
          title: "Booking Failed",
          description: result.message || "Unable to book appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const result = await cancelAppointment(appointmentId);
      if (result.success) {
        toast({
          title: "Cancelled",
          description: "Appointment cancelled successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to cancel appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = {
      "Booked": { variant: "outline" as const, icon: AlertCircle, color: "text-primary" },
      "Accepted": { variant: "default" as const, icon: CheckCircle, color: "text-secondary" },
      "Completed": { variant: "secondary" as const, icon: CheckCircle, color: "text-gray-600" },
      "Cancelled": { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
    };
    const { variant, icon: Icon, color } = config[status as keyof typeof config] || config["Booked"];
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4 md:p-7 space-y-5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 px-6 py-5 shadow-lg border border-primary/20">
        <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-primary-foreground/90 text-base font-medium mb-1">Welcome back 👋</p>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground leading-tight">
              {user?.name || 'Patient'}
            </h1>
            <p className="text-primary-foreground/70 mt-1.5 text-sm">Manage your health journey from one place.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="bg-orange-400 border-2 border-orange-300 rounded-xl px-4 py-3 text-center min-w-[76px] shadow-md">
              <p className="text-xl font-extrabold text-white">{upcomingAppointments.length}</p>
              <p className="text-white text-xs font-semibold mt-0.5">Upcoming</p>
            </div>
            <div className="bg-emerald-500 border-2 border-emerald-300 rounded-xl px-4 py-3 text-center min-w-[76px] shadow-md">
              <p className="text-xl font-extrabold text-white">{pastAppointments.length}</p>
              <p className="text-emerald-100 text-xs font-semibold mt-0.5">Completed</p>
            </div>
            <div className="bg-sky-500 border-2 border-sky-300 rounded-xl px-4 py-3 text-center min-w-[76px] shadow-md">
              <p className="text-xl font-extrabold text-white">{doctors.length}</p>
              <p className="text-sky-100 text-xs font-semibold mt-0.5">Doctors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: ClipboardList,
            title: "Medical History",
            desc: "View and add your past records",
            cta: "Open Records",
            path: "/patient/medical-history",
            cardBg: "bg-gradient-to-br from-primary/8 via-white to-white",
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
            border: "border-l-4 border-l-primary",
            ctaColor: "text-primary",
          },
          {
            icon: ScanLine,
            title: "AI Report Analyzer",
            desc: "Upload report — get clear AI summary",
            cta: "Analyse a Report",
            path: "/patient/ai-analyzer",
            cardBg: "bg-gradient-to-br from-violet-50 via-white to-white",
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
            border: "border-l-4 border-l-violet-500",
            ctaColor: "text-violet-600",
          },
          {
            icon: Pill,
            title: "My Prescriptions",
            desc: "View prescriptions with AI summaries",
            cta: "View Prescriptions",
            path: "/patient/prescriptions",
            cardBg: "bg-gradient-to-br from-secondary/8 via-white to-white",
            iconBg: "bg-secondary/10",
            iconColor: "text-secondary",
            border: "border-l-4 border-l-secondary",
            ctaColor: "text-secondary",
          },
        ].map((card) => (
          <div
            key={card.path}
            className={`rounded-2xl border border-border ${card.border} ${card.cardBg} shadow-sm cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}
            onClick={() => navigate(card.path)}
          >
            <div className="p-5 flex flex-col gap-3">
              <div className={`h-11 w-11 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${card.ctaColor} group-hover:gap-2 transition-all mt-auto`}>
                {card.cta} <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Find Doctors Section */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-border bg-white">

        {/* Section Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-foreground font-bold text-base leading-none">Find Doctors</h2>
              <p className="text-gray-600 text-sm font-medium mt-0.5">Search by symptom, name, specialization, or location</p>
            </div>
          </div>
          {(filterName || filterSpec || filterLocation || selectedSymptoms.length > 0) && (
            <button
              onClick={clearFilters}
              className="text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 px-4 py-2 rounded-xl border-2 border-red-400 shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              <X className="h-4 w-4" /> Clear Filters
            </button>
          )}
        </div>

        <div className="p-5 space-y-6">

          {/* Symptom Cards */}
          <div>
            <p className="text-xs font-extrabold text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="h-1.5 w-4 bg-primary rounded-full inline-block" />
              Quick find by symptom
            </p>
            <div className="grid grid-cols-5 gap-3">
              {SYMPTOM_CARDS.map((card) => {
                const active = selectedSymptoms.includes(card.name);
                return (
                  <button
                    key={card.name}
                    onClick={() => handleSymptomClick(card.name)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-5 px-2 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                      active
                        ? `${card.activeBg} border-primary shadow-sm -translate-y-0.5`
                        : `${card.bg} border-primary/50 hover:border-primary/80`
                    }`}
                  >
                    <span className="text-2xl leading-none">{card.icon}</span>
                    <span className={`text-[11px] font-bold text-center leading-tight ${
                      active ? card.label : "text-gray-700"
                    }`}>
                      {card.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + Specialization — 3 labeled cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* Doctor Name */}
            <div className="group relative rounded-xl border-2 border-primary/40 bg-white px-4 pt-3 pb-3 hover:border-primary/70 focus-within:border-primary transition-colors shadow-sm">
              <label className="flex items-center gap-1 text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                <Search className="h-3 w-3" /> Doctor Name
              </label>
              <input
                placeholder="Search by name..."
                value={filterName}
                onChange={(e) => { setFilterName(e.target.value); setShowNameSuggestions(e.target.value.length > 0); }}
                onFocus={() => setShowNameSuggestions(filterName.length > 0)}
                className="w-full text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none bg-transparent"
              />
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg max-h-40 overflow-auto">
                  {nameSuggestions.map((name) => (
                    <button key={name} className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onClick={() => { setFilterName(name); setShowNameSuggestions(false); }}>
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="rounded-xl border-2 border-primary/40 bg-white px-4 pt-3 pb-3 hover:border-primary/70 focus-within:border-primary transition-colors shadow-sm">
              <label className="flex items-center gap-1 text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                <MapPin className="h-3 w-3" /> Location
              </label>
              <input
                placeholder="City or area..."
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none bg-transparent"
              />
            </div>

            {/* Specialization */}
            <div className="relative rounded-xl border-2 border-primary/40 bg-white px-4 pt-3 pb-3 hover:border-primary/70 focus-within:border-primary transition-colors shadow-sm">
              <label className="flex items-center gap-1 text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                <Stethoscope className="h-3 w-3" /> Specialization
              </label>
              <select
                value={filterSpec}
                onChange={(e) => setFilterSpec(e.target.value)}
                className="w-full text-sm text-foreground focus:outline-none appearance-none cursor-pointer bg-transparent pr-5"
              >
                <option value="*">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
              <span className="absolute right-3 bottom-2.5 pointer-events-none text-muted-foreground text-xs">▾</span>
            </div>
          </div>

          {/* Results count + view toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            {selectedSymptoms.length === 0 && !filterName.trim() && !filterSpec && !filterLocation.trim() ? (
              <p className="text-base font-bold text-gray-800 tracking-tight">🔍 Select a symptom or filter to find doctors</p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                {loadingDoctors ? "Searching..." : (
                  <span>{filteredDoctors.length > 0 ? <span className="text-primary font-semibold">{filteredDoctors.length}</span> : "0"} doctor{filteredDoctors.length !== 1 ? "s" : ""} found</span>
                )}
              </p>
            )}
            <div className="flex gap-0.5 bg-muted/40 border border-border rounded-xl p-0.5">
              <button
                onClick={() => setViewMode("card")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                  viewMode === "card" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                  viewMode === "table" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Doctors Display - Card View */}
          {viewMode === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingDoctors ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse border border-border shadow-sm">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gray-200" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-9 bg-gray-200 rounded-lg" />
                    </CardContent>
                  </Card>
                ))
              ) : selectedSymptoms.length === 0 && !filterName.trim() && !filterSpec && !filterLocation.trim() ? (
                // Beautiful empty state when no filters
                <div className="col-span-full">
                  <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl bg-accent/30 border border-border">
                    <div className="relative mb-5">
                      <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Stethoscope className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center shadow">
                        <Search className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Find Your Doctor</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs mb-5">
                      Select a symptom above, choose a specialization, or search by name to discover available doctors.
                    </p>
                    <div className="grid grid-cols-4 gap-3 w-full max-w-sm">
                      {SYMPTOM_CARDS.slice(0, 4).map((s) => (
                        <button
                          key={s.name}
                          onClick={() => handleSymptomClick(s.name)}
                          className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 border-border bg-white hover:border-primary/40 hover:bg-accent/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 shadow-sm"
                        >
                          <span className="text-2xl leading-none">{s.icon}</span>
                          <span className="text-xs font-semibold text-primary text-center leading-tight">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="col-span-full">
                  <div className="flex flex-col items-center justify-center py-14 px-6 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-1">No doctors found</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">Try different symptoms or adjust your filters.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button>
                  </div>
                </div>
              ) : (
                filteredDoctors.map((doc) => (
                  <Card key={doc._id} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border border-border shadow-sm overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Stethoscope className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">Dr. {doc.name}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-0.5">{doc.specialization}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{formatLocation(doc.location)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{doc.experience || 5} yrs experience</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-4 w-4 text-secondary" />
                          <span className="font-bold text-base text-gray-900">{doc.consultationFee || 500}</span>
                          <span className="text-xs text-muted-foreground">/visit</span>
                        </div>
                        <Button size="sm" className="rounded-lg" onClick={() => openBooking(doc)}>
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Doctors Display - Table View */}
          {viewMode === "table" && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDoctors ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading doctors...
                      </TableCell>
                    </TableRow>
                  ) : filteredDoctors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No doctors found. Try adjusting your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <TableRow key={doc._id}>
                        <TableCell className="font-medium">Dr. {doc.name}</TableCell>
                        <TableCell>{doc.specialization}</TableCell>
                        <TableCell>{formatLocation(doc.location)}</TableCell>
                        <TableCell>{doc.experience || 5} years</TableCell>
                        <TableCell>₹{doc.consultationFee || 500}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openBooking(doc)}
                          >
                            Book
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* My Appointments Section */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-border bg-white">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-border bg-muted/40">
          <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="h-4 w-4 text-secondary" />
          </div>
          <div className="flex-1">
            <h2 className="text-foreground font-bold text-base leading-none">My Appointments</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Track and manage your appointments</p>
          </div>
        </div>
        <div className="bg-white p-5 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            <button
              onClick={() => setAppointmentTab("upcoming")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                appointmentTab === "upcoming"
                  ? "bg-white shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upcoming <span className="ml-1 text-xs">({upcomingAppointments.length})</span>
            </button>
            <button
              onClick={() => setAppointmentTab("past")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                appointmentTab === "past"
                  ? "bg-white shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed <span className="ml-1 text-xs">({pastAppointments.length})</span>
            </button>
            <button
              onClick={() => setAppointmentTab("cancelled")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                appointmentTab === "cancelled"
                  ? "bg-white shadow-sm text-red-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cancelled <span className="ml-1 text-xs">({cancelledAppointments.length})</span>
            </button>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {/* Empty states */}
            {appointmentTab === "upcoming" && upcomingAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-primary/5 border border-dashed border-primary/30">
                <CalendarDays className="h-10 w-10 text-primary/40 mb-3" />
                <p className="font-medium text-gray-600">No upcoming appointments</p>
                <p className="text-sm text-muted-foreground mt-1">Use "Find Doctors" above to book one.</p>
              </div>
            )}
            {appointmentTab === "past" && pastAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200">
                <CheckCircle className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-600">No completed appointments yet</p>
              </div>
            )}
            {appointmentTab === "cancelled" && cancelledAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-accent/30 border border-dashed border-border">
                <XCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-muted-foreground">No cancelled appointments</p>
              </div>
            )}

            {appointmentTab === "upcoming" && upcomingAppointments.map((apt) => (
              <div key={apt._id} className="flex items-center gap-4 p-4 rounded-xl border bg-white hover:shadow-sm transition-all">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{apt.doctorName}</h3>
                    {getStatusBadge(apt.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{apt.specialization}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                    <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{apt.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{apt.time}</span>
                    {apt.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{formatLocation(apt.location)}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {(apt.status === "Accepted" || apt.status === "In Progress") && (
                    <Button size="sm" className="text-xs gap-1" onClick={() => navigate(`/video/${apt._id}`)}>
                      <Video className="h-3 w-3" /> Join Video
                    </Button>
                  )}
                  {(apt.status === "Booked" || apt.status === "Accepted") && (
                    <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleCancelAppointment(apt._id)}>Cancel</Button>
                  )}
                </div>
              </div>
            ))}

            {appointmentTab === "past" && pastAppointments.map((apt: any) => (
              <div key={apt._id} className="flex items-center gap-4 p-4 rounded-xl border bg-white hover:shadow-sm transition-all">
                <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{apt.doctorName}</h3>
                    {getStatusBadge(apt.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{apt.specialization}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                    <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{apt.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{apt.time}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="flex-shrink-0 text-xs"
                  onClick={async () => {
                    const prescription = await getPrescriptionByAppointment(apt._id);
                    if (prescription) { navigate("/patient/prescriptions"); }
                    else { toast({ title: "No Prescription", description: "Prescription not yet added by doctor" }); }
                  }}
                >
                  <FileText className="h-3.5 w-3.5 mr-1" /> Prescription
                </Button>
              </div>
            ))}

            {appointmentTab === "cancelled" && cancelledAppointments.map((apt) => (
              <div key={apt._id} className="flex items-center gap-4 p-4 rounded-xl border bg-gray-50/50 opacity-70">
                <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-700">{apt.doctorName}</h3>
                    {getStatusBadge(apt.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{apt.specialization}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                    <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{apt.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{apt.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              Book an appointment with {selectedDoctor && `Dr. ${selectedDoctor.name}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoctor && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Dr. {selectedDoctor.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <MapPin className="h-4 w-4" />
                        {formatLocation(selectedDoctor.location)}
                      </div>
                      <p className="text-sm font-semibold mt-1">Fee: ₹{selectedDoctor.consultationFee || 500}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookDate ? format(bookDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={bookDate}
                        onSelect={setBookDate}
                        disabled={(date) => date < new Date() || !isDayAvailable(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Select Time</Label>
                  <select
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                    disabled={!bookDate}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Choose time...</option>
                    {availableTimeSlots.map((slot: string) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {bookDate && availableTimeSlots.length === 0 && (
                <p className="text-sm text-destructive">No slots available on this day</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBooking}
              disabled={!bookDate || !bookTime}
            >
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientDashboard;
