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
  ClipboardList, ScanLine, Pill, ChevronRight, Sparkles, X, type LucideIcon
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
    const config: Record<string, { bg: string; text: string; dot: string; icon: LucideIcon }> = {
      "Booked":      { bg: "bg-amber-50 border border-amber-200",    text: "text-amber-700",  dot: "bg-amber-400",  icon: AlertCircle },
      "Accepted":    { bg: "bg-emerald-50 border border-emerald-200",text: "text-emerald-700",dot: "bg-emerald-500",icon: CheckCircle },
      "In Progress": { bg: "bg-blue-50 border border-blue-200",      text: "text-blue-700",   dot: "bg-blue-500",   icon: Activity },
      "Completed":   { bg: "bg-slate-50 border border-slate-200",    text: "text-slate-600",  dot: "bg-slate-400",  icon: CheckCircle },
      "Cancelled":   { bg: "bg-red-50 border border-red-200",        text: "text-red-600",    dot: "bg-red-400",    icon: XCircle },
    };
    const c = config[status] || config["Booked"];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot} flex-shrink-0`} />
        {status}
      </span>
    );
  };

  // Avatar color palette for doctors
  const AVATAR_COLORS = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-sky-600",
  ];
  const getDoctorAvatarColor = (name: string) => {
    const idx = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
    return AVATAR_COLORS[idx];
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-6 space-y-6">

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 shadow-xl">
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-blue-400/80 uppercase tracking-widest mb-1">Patient Portal</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Hello, {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">Book appointments, view records and manage your health.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigate("/patient/appointments")}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            >
              <CalendarDays className="h-4 w-4" /> My Appointments
            </button>
          </div>
        </div>
        {/* Stats ribbon */}
        <div className="border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
          {[
            { label: "Upcoming",     value: upcomingAppointments.length,                                                              color: "text-blue-300",    icon: CalendarDays },
            { label: "Completed",    value: pastAppointments.length,                                                                  color: "text-emerald-300", icon: CheckCircle  },
            { label: "Prescriptions",value: myAppointments.filter((a) => getPrescriptionByAppointment(a._id)).length,                color: "text-violet-300",  icon: FileText     },
            { label: "Doctors",      value: doctors.length,                                                                           color: "text-amber-300",   icon: Stethoscope  },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3">
              <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
              <div>
                <p className={`text-lg font-black leading-none ${color}`}>{value}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Access Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: ClipboardList, title: "Medical History",    desc: "View & manage past records",    path: "/patient/medical-history", bg: "bg-blue-600"    },
          { icon: ScanLine,      title: "AI Report Analyzer", desc: "Upload a report · get AI insights", path: "/patient/ai-analyzer",  bg: "bg-violet-600"  },
          { icon: Pill,          title: "My Prescriptions",   desc: "Prescriptions with AI summaries",  path: "/patient/prescriptions", bg: "bg-emerald-600" },
        ].map(({ icon: Icon, title, desc, path, bg }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`${bg} hover:opacity-90 rounded-2xl px-4 py-4 text-white flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-lg text-left`}
          >
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-sm leading-tight block">{title}</span>
              <span className="text-white/70 text-xs">{desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Find Doctors ─────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">

        {/* Section Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Search className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-sm leading-none">Find Doctors</h2>
              <p className="text-slate-500 text-xs mt-0.5">Search by symptom, name, specialization or location</p>
            </div>
          </div>
          {(filterName || filterSpec || filterLocation || selectedSymptoms.length > 0) && (
            <button
              onClick={clearFilters}
              className="text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl border border-red-200 transition-all flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">

          {/* Symptom Pills */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              Quick select by symptom
            </p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_CARDS.map((card) => {
                const active = selectedSymptoms.includes(card.name);
                return (
                  <button
                    key={card.name}
                    onClick={() => handleSymptomClick(card.name)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                      active
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                        : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50"
                    }`}
                  >
                    <span className="text-base leading-none">{card.icon}</span>
                    <span>{card.name}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white/80 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Doctor Name */}
            <div className="relative group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                Doctor Name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  placeholder="Search by name..."
                  value={filterName}
                  onChange={(e) => { setFilterName(e.target.value); setShowNameSuggestions(e.target.value.length > 0); }}
                  onFocus={() => setShowNameSuggestions(filterName.length > 0)}
                  className="w-full h-10 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-auto">
                  {nameSuggestions.map((name) => (
                    <button key={name} className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm text-slate-700 transition-colors" onClick={() => { setFilterName(name); setShowNameSuggestions(false); }}>
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  placeholder="City or area..."
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                Specialization
              </label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={filterSpec}
                  onChange={(e) => setFilterSpec(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 text-sm text-slate-800 rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                >
                  <option value="*">All Specializations</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▾</span>
              </div>
            </div>
          </div>

          {/* Results bar */}
          <div className="flex items-center justify-between">
            {selectedSymptoms.length === 0 && !filterName.trim() && !filterSpec && !filterLocation.trim() ? (
              <p className="text-sm font-medium text-slate-500">Select a symptom or use filters to discover doctors</p>
            ) : (
              <p className="text-sm text-slate-500">
                {loadingDoctors ? (
                  <span className="flex items-center gap-2"><span className="h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block" />Searching...</span>
                ) : (
                  <><span className="text-indigo-600 font-bold text-base">{filteredDoctors.length}</span> doctor{filteredDoctors.length !== 1 ? "s" : ""} found</>
                )}
              </p>
            )}
            <div className="flex gap-0.5 bg-slate-100 border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode("card")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${viewMode === "card" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Doctors — Card View */}
          {viewMode === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingDoctors ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-slate-200" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                        <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded-lg w-2/3" />
                      <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                    </div>
                    <div className="h-9 bg-slate-200 rounded-xl" />
                  </div>
                ))
              ) : selectedSymptoms.length === 0 && !filterName.trim() && !filterSpec && !filterLocation.trim() ? (
                <div className="col-span-full">
                  <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl bg-gradient-to-b from-indigo-50/60 to-slate-50 border border-dashed border-indigo-200">
                    <div className="relative mb-6">
                      <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-300/40">
                        <Stethoscope className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1.5">Find Your Doctor</h3>
                    <p className="text-sm text-slate-500 text-center max-w-xs mb-6 leading-relaxed">
                      Pick a symptom below or use the search filters to discover available doctors.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SYMPTOM_CARDS.slice(0, 5).map((s) => (
                        <button
                          key={s.name}
                          onClick={() => handleSymptomClick(s.name)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
                        >
                          <span>{s.icon}</span><span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="col-span-full">
                  <div className="flex flex-col items-center justify-center py-14 px-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Search className="h-7 w-7 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-700 mb-1">No doctors found</h3>
                    <p className="text-sm text-slate-500 text-center mb-4">Try different symptoms or adjust your filters.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl">Clear all filters</Button>
                  </div>
                </div>
              ) : (
                filteredDoctors.map((doc) => {
                  const avatarGradient = getDoctorAvatarColor(doc.name || "");
                  const initials = (doc.name || "?").slice(0, 2).toUpperCase();
                  return (
                    <div key={doc._id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:shadow-slate-200/80 hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col">
                      {/* Card top accent */}
                      <div className={`h-1 w-full bg-gradient-to-r ${avatarGradient}`} />
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                            <span className="text-white font-bold text-lg">{initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 truncate">Dr. {doc.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mt-1">{doc.specialization}</span>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-slate-500 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-3 w-3 text-slate-400" />
                            </div>
                            <span className="truncate">{formatLocation(doc.location)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                              <Activity className="h-3 w-3 text-slate-400" />
                            </div>
                            <span>{doc.experience || 5} yrs experience</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xs text-slate-400 mr-0.5">₹</span>
                            <span className="font-black text-xl text-slate-800">{doc.consultationFee || 500}</span>
                            <span className="text-xs text-slate-400 ml-0.5">/visit</span>
                          </div>
                          <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-200 px-4" onClick={() => openBooking(doc)}>
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Doctors — Table View */}
          {viewMode === "table" && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-bold text-slate-600">Doctor</TableHead>
                    <TableHead className="font-bold text-slate-600">Specialization</TableHead>
                    <TableHead className="font-bold text-slate-600">Location</TableHead>
                    <TableHead className="font-bold text-slate-600">Experience</TableHead>
                    <TableHead className="font-bold text-slate-600">Fee</TableHead>
                    <TableHead className="text-right font-bold text-slate-600">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDoctors ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading doctors...</TableCell>
                    </TableRow>
                  ) : filteredDoctors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">No doctors found. Try adjusting your filters.</TableCell>
                    </TableRow>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <TableRow key={doc._id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-semibold text-slate-800">Dr. {doc.name}</TableCell>
                        <TableCell>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{doc.specialization}</span>
                        </TableCell>
                        <TableCell className="text-slate-600">{formatLocation(doc.location)}</TableCell>
                        <TableCell className="text-slate-600">{doc.experience || 5} yrs</TableCell>
                        <TableCell className="font-bold text-slate-800">₹{doc.consultationFee || 500}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => openBooking(doc)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">Book</Button>
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

      {/* ── My Appointments ──────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {/* Section Header */}
        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-sm leading-none">My Appointments</h2>
            <p className="text-slate-500 text-xs mt-0.5">Track and manage all your appointments</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
            {[
              { key: "upcoming",  label: "Upcoming",  count: upcomingAppointments.length,  activeClass: "bg-white text-indigo-600 shadow-sm" },
              { key: "past",      label: "Completed", count: pastAppointments.length,       activeClass: "bg-white text-emerald-600 shadow-sm" },
              { key: "cancelled", label: "Cancelled", count: cancelledAppointments.length,  activeClass: "bg-white text-red-500 shadow-sm" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAppointmentTab(tab.key as typeof appointmentTab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  appointmentTab === tab.key ? tab.activeClass : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  appointmentTab === tab.key ? "bg-slate-100 text-slate-600" : "bg-slate-200/70 text-slate-500"
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Appointments List */}
          <div className="space-y-3">

            {/* Empty states */}
            {appointmentTab === "upcoming" && upcomingAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl bg-gradient-to-b from-indigo-50/50 to-slate-50 border border-dashed border-indigo-200">
                <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                  <CalendarDays className="h-7 w-7 text-indigo-400" />
                </div>
                <p className="font-semibold text-slate-700">No upcoming appointments</p>
                <p className="text-sm text-slate-500 mt-1">Use "Find Doctors" above to book one.</p>
              </div>
            )}
            {appointmentTab === "past" && pastAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <CheckCircle className="h-7 w-7 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-600">No completed appointments yet</p>
              </div>
            )}
            {appointmentTab === "cancelled" && cancelledAppointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <XCircle className="h-7 w-7 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-600">No cancelled appointments</p>
              </div>
            )}

            {/* Upcoming */}
            {appointmentTab === "upcoming" && upcomingAppointments.map((apt) => {
              const isInProgress = apt.status === "In Progress";
              const borderColor = isInProgress ? "border-l-blue-500" : apt.status === "Accepted" ? "border-l-emerald-500" : "border-l-amber-400";
              return (
                <div key={apt._id} className={`flex items-center gap-4 p-4 rounded-2xl border border-slate-200 border-l-4 ${borderColor} bg-white hover:shadow-md hover:shadow-slate-100 transition-all duration-200`}>
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
                    <Stethoscope className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800">{apt.doctorName}</h3>
                      {getStatusBadge(apt.status)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{apt.specialization}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <CalendarIcon className="h-3 w-3" />{apt.date}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3 w-3" />{apt.time}
                      </span>
                      {apt.location && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <MapPin className="h-3 w-3" />{formatLocation(apt.location)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {(apt.status === "Accepted" || apt.status === "In Progress") && (
                      <Button size="sm" className="rounded-xl text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 font-semibold" onClick={() => navigate(`/video/${apt._id}`)}>
                        <Video className="h-3.5 w-3.5" /> Join Video
                      </Button>
                    )}
                    {(apt.status === "Booked" || apt.status === "Accepted") && (
                      <Button size="sm" variant="outline" className="rounded-xl text-xs border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 font-medium" onClick={() => handleCancelAppointment(apt._id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Completed */}
            {appointmentTab === "past" && pastAppointments.map((apt: any) => (
              <div key={apt._id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 border-l-4 border-l-teal-500 bg-white hover:shadow-md hover:shadow-slate-100 transition-all duration-200">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-200">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800">{apt.doctorName}</h3>
                    {getStatusBadge(apt.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{apt.specialization}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <CalendarIcon className="h-3 w-3" />{apt.date}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock className="h-3 w-3" />{apt.time}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="flex-shrink-0 rounded-xl text-xs border-slate-200 hover:bg-slate-50 font-medium gap-1.5"
                  onClick={() => navigate(`/prescriptions/appointment/${apt._id}`)}
                >
                  <FileText className="h-3.5 w-3.5" /> Prescription
                </Button>
              </div>
            ))}

            {/* Cancelled */}
            {appointmentTab === "cancelled" && cancelledAppointments.map((apt) => (
              <div key={apt._id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 border-l-4 border-l-red-400 bg-red-50/30 opacity-80">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center flex-shrink-0 opacity-80">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-700">{apt.doctorName}</h3>
                    {getStatusBadge(apt.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{apt.specialization}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <CalendarIcon className="h-3 w-3" />{apt.date}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock className="h-3 w-3" />{apt.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Booking Modal ────────────────────────────────────────────── */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-lg rounded-3xl border border-slate-200 shadow-2xl shadow-slate-300/40 p-0 overflow-hidden">
          {/* Modal header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
            <DialogTitle className="text-white font-bold text-lg">Book Appointment</DialogTitle>
            <DialogDescription className="text-white/70 text-sm mt-0.5">
              {selectedDoctor ? `Scheduling with Dr. ${selectedDoctor.name}` : "Select your preferred date and time"}
            </DialogDescription>
          </div>

          {selectedDoctor && (
            <div className="p-6 space-y-5">
              {/* Doctor info strip */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${getDoctorAvatarColor(selectedDoctor.name || "")} flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <span className="text-white font-bold text-lg">{(selectedDoctor.name || "?").slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800">Dr. {selectedDoctor.name}</h3>
                  <p className="text-sm text-slate-500">{selectedDoctor.specialization}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{formatLocation(selectedDoctor.location)}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <IndianRupee className="h-3 w-3" />₹{selectedDoctor.consultationFee || 500}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date picker */}
                <div>
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl border-2 border-slate-200 hover:border-indigo-400 h-10">
                        <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                        {bookDate ? format(bookDate, "PPP") : <span className="text-slate-400">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border border-slate-200 shadow-xl">
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

                {/* Time picker */}
                <div>
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Select Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={bookTime}
                      onChange={(e) => setBookTime(e.target.value)}
                      disabled={!bookDate}
                      className="w-full h-10 pl-9 pr-3 text-sm text-slate-800 rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                    >
                      <option value="">Choose time...</option>
                      {availableTimeSlots.map((slot: string) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {bookDate && availableTimeSlots.length === 0 && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">No slots available on this day. Please try another date.</p>
              )}
            </div>
          )}

          <DialogFooter className="px-6 pb-6 pt-0 gap-2">
            <Button variant="outline" onClick={() => setShowBookingModal(false)} className="rounded-xl border-slate-200 flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBooking}
              disabled={!bookDate || !bookTime}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-200 flex-1"
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
