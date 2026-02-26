import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, X, Stethoscope, Calendar as CalendarIcon, Clock, CheckCircle, ChevronRight,
  Pill, Brain, Heart, Bone, Activity, Eye, Zap, Headphones, SquareCheckBig
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  from: "bot" | "user";
  text: string;
  buttons?: { label: string; value: string; disabled?: boolean }[];
  component?: "calendar" | "timeSlots";
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SPECIALIZATIONS = [
  { label: "🏥 General Medicine", value: "General Medicine", icon: Stethoscope },
  { label: "❤️ Cardiology", value: "Cardiology", icon: Heart },
  { label: "🧠 Neurology", value: "Neurology", icon: Brain },
  { label: "🦴 Orthopedics", value: "Orthopedics", icon: Bone },
  { label: "👶 Pediatrics", value: "Pediatrics", icon: Activity },
  { label: "🩺 Dermatology", value: "Dermatology", icon: SquareCheckBig },
  { label: "🫀 Gastroenterology", value: "Gastroenterology", icon: Pill },
  { label: "👁️ Ophthalmology", value: "Ophthalmology", icon: Eye },
  { label: "🔊 Psychiatry", value: "Psychiatry", icon: Brain },
  { label: "⚡ Neurosurgery", value: "Neurosurgery", icon: Zap },
  { label: "👂 ENT", value: "ENT", icon: Headphones },
  { label: "🏥 Urology", value: "Urology", icon: Stethoscope },
];

const SYMPTOMS = [
  { label: "🤒 Fever", value: "fever", specs: ["General Medicine", "Pediatrics"] },
  { label: "🤕 Headache", value: "headache", specs: ["General Medicine", "Neurology"] },
  { label: "💔 Chest Pain", value: "chest_pain", specs: ["Cardiology", "General Medicine"] },
  { label: "🦵 Joint Pain", value: "joint_pain", specs: ["Orthopedics", "General Medicine"] },
  { label: "🤧 Cough", value: "cough", specs: ["General Medicine"] },
  { label: "🦷 Dental Issues", value: "dental", specs: ["General Medicine"] },
  { label: "👁️ Eye Issues", value: "eye_issues", specs: ["Ophthalmology"] },
  { label: "💊 Skin Issues", value: "skin_issues", specs: ["Dermatology"] },
];

type Step = "welcome" | "bookingMode" | "symptom" | "specialization" | "doctors" | "date" | "time" | "confirm" | "done";

const Chatbot = () => {
  const { user } = useAuth();
  const { bookAppointment, isSlotBooked } = useClinic();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>("welcome");
  const [usedMsgIdx, setUsedMsgIdx] = useState<Set<number>>(new Set());
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("");
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/public/doctors', { params: { limit: 500 } });
        if (res.data?.doctors) {
          setDoctors(res.data.doctors);
        }
      } catch (err) {
        console.error("Error fetching doctors:", err);
      }
    };
    if (open) fetchDoctors();
  }, [open]);

  // Start chat
  useEffect(() => {
    if (open && messages.length === 0) {
      const userName = user?.name || "there";
      addMessage("bot", `Hi ${userName}! 👋 I'm your MediConnect assistant. How can I help you book an appointment?`);
      addMessage("bot", "Choose your booking method:", [
        { label: "🩺 By Symptoms", value: "symptom_mode" },
        { label: "👨‍⚕️ By Specialization", value: "spec_mode" }
      ]);
      setStep("bookingMode");
    }
  }, [open]);

  const addMessage = (from: "bot" | "user", text: string, buttons?: Message["buttons"], component?: Message["component"]) => {
    setMessages((prev) => [...prev, { from, text, buttons, component }]);
  };

  // Generate time slots
  const generateTimeSlots = (startTime: string, endTime: string): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      slots.push(timeStr);
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }
    
    return slots;
  };

  const handleButtonClick = async (value: string, label: string, msgIdx: number) => {
    setUsedMsgIdx(prev => new Set(prev).add(msgIdx));
    addMessage("user", label);

    switch (step) {
      case "bookingMode": {
        if (value === "symptom_mode") {
          addMessage("bot", "What symptoms are you experiencing?", SYMPTOMS);
          setStep("symptom");
        } else {
          const specButtons = SPECIALIZATIONS.map(s => ({
            label: s.label,
            value: s.value
          }));
          addMessage("bot", "Select a specialization:", specButtons);
          setStep("specialization");
        }
        break;
      }

      case "symptom": {
        const symptom = SYMPTOMS.find(s => s.value === value);
        if (symptom) {
          const relatedSpecNames = symptom.specs;
          const availableSpecs = SPECIALIZATIONS.filter(s => relatedSpecNames.includes(s.value));
          if (availableSpecs.length === 0) {
            addMessage("bot", "No specializations match. Try another symptom?", SYMPTOMS);
            break;
          }
          const specButtons = availableSpecs.map(s => ({ label: s.label, value: s.value }));
          addMessage("bot", `For **${label}**, choose a specialization:`, specButtons);
          setStep("specialization");
        }
        break;
      }

      case "specialization": {
        setSelectedSpec(value);
        const matched = doctors.filter(d => d.specialization === value && d.approvalStatus === 'approved');
        setFilteredDoctors(matched);
        
        if (matched.length === 0) {
          const specButtons = SPECIALIZATIONS.map(s => ({
            label: s.label,
            value: s.value
          }));
          addMessage("bot", "No doctors available for this specialization. Try another?", specButtons);
        } else {
          const doctorButtons = matched.slice(0, 15).map(d => ({
            label: `Dr. ${d.name} - ₹${d.consultationFee || 500}`,
            value: d._id
          }));
          addMessage("bot", `Found ${matched.length} doctor(s). Select one:`, doctorButtons);
          setStep("doctors");
        }
        break;
      }

      case "doctors": {
        const doctor = doctors.find(d => d._id === value);
        if (doctor) {
          setSelectedDoctor(doctor);
          addMessage("bot", `Great! You selected Dr. ${doctor.name} (${doctor.specialization}). \n\nFee: ₹${doctor.consultationFee || 500}\nLocation: ${doctor.location || 'N/A'}`);
          addMessage("bot", "Now, please select a date:", [], "calendar");
          setStep("date");
        }
        break;
      }

      case "time": {
        setSelectedTime(value);
        if (!selectedDoctor || !selectedDate) return;

        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const slotTaken = isSlotBooked(selectedDoctor._id, dateStr, value);
        
        if (slotTaken) {
          toast({
            title: "Slot Unavailable",
            description: "This time is already booked. Please choose another slot.",
            variant: "destructive",
          });
          return;
        }

        addMessage("bot", 
          `📋 *Booking Summary*\n\n` +
          `👨‍⚕️ Doctor: Dr. ${selectedDoctor.name}\n` +
          `🏥 Specialization: ${selectedDoctor.specialization}\n` +
          `📅 Date: ${format(selectedDate, "PPP")}\n` +
          `⏰ Time: ${value}\n` +
          `💰 Fee: ₹${selectedDoctor.consultationFee || 500}\n\n` +
          `Confirm booking?`,
          [
            { label: "✅ Confirm Booking", value: "confirm" },
            { label: "❌ Cancel", value: "cancel" }
          ]
        );
        setStep("confirm");
        break;
      }

      case "confirm": {
        if (value === "confirm") {
          if (!user || !selectedDoctor || !selectedDate || !selectedTime) return;

          setIsBooking(true);
          const dateStr = format(selectedDate, "yyyy-MM-dd");

          try {
            const result = await bookAppointment({
              patientId: user._id,
              patientName: user.name || user.email,
              patientAge: user.age || 25,
              patientMedicalHistory: user.medicalHistory || "",
              doctorId: selectedDoctor._id,
              doctorName: `Dr. ${selectedDoctor.name}`,
              specialization: selectedDoctor.specialization || "",
              location: selectedDoctor.location || "",
              date: dateStr,
              time: selectedTime,
              consultationFee: selectedDoctor.consultationFee || 500,
            });

            if (result.success) {
              addMessage("bot", "✅ *Appointment Booked Successfully!*\n\nYour appointment has been scheduled. The doctor will confirm shortly. Check your dashboard for details.");
              toast({
                title: "Success!",
                description: "Appointment booked successfully.",
              });
            } else {
              addMessage("bot", `❌ Booking failed: ${result.message}. Please try again.`);
            }
          } catch (error) {
            console.error("Booking error:", error);
            addMessage("bot", "❌ An error occurred. Please try booking from the dashboard.");
          } finally {
            setIsBooking(false);
          }

          addMessage("bot", "Would you like to book another appointment?", [
            { label: "Book Another", value: "restart" },
            { label: "Close", value: "close" }
          ]);
          setStep("done");
        } else {
          addMessage("bot", "Booking cancelled. Would you like to start over?", [
            { label: "Start Over", value: "restart" },
            { label: "Close", value: "close" }
          ]);
          setStep("done");
        }
        break;
      }

      case "done": {
        if (value === "restart") {
          resetChat();
        } else {
          setOpen(false);
        }
        break;
      }
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !selectedDoctor) return;
    
    setSelectedDate(date);
    addMessage("user", format(date, "PPP"));

    const dayName = DAYS[date.getDay()];
    const dayAvail = selectedDoctor.availability?.find((av: any) => av.day === dayName);

    if (!dayAvail) {
      addMessage("bot", "Doctor is not available on this day. Please select another date.", [], "calendar");
      return;
    }

    let timeSlots: string[] = [];
    if (dayAvail.slots && Array.isArray(dayAvail.slots)) {
      timeSlots = dayAvail.slots;
    } else if (dayAvail.startTime && dayAvail.endTime) {
      timeSlots = generateTimeSlots(dayAvail.startTime, dayAvail.endTime);
    }

    if (timeSlots.length === 0) {
      addMessage("bot", "No time slots available for this day. Please select another date.", [], "calendar");
      return;
    }

    const timeButtons = timeSlots.map(slot => ({
      label: slot,
      value: slot
    }));

    addMessage("bot", "Available time slots. Select one:", timeButtons);
    setStep("time");
  };

  const isDayAvailable = (date: Date) => {
    if (!selectedDoctor) return false;
    const dayName = DAYS[date.getDay()];
    return selectedDoctor.availability?.some((av: any) => av.day === dayName) || false;
  };

  const resetChat = () => {
    setMessages([]);
    setStep("welcome");
    setSelectedDoctor(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setSelectedSpec("");
    setFilteredDoctors([]);
    setUsedMsgIdx(new Set());
    
    const userName = user?.name || "there";
    addMessage("bot", `Hi ${userName}! 👋 I'm your MediConnect assistant. How can I help you book an appointment?`);
    addMessage("bot", "Choose your booking method:", [
      { label: "🩺 By Symptoms", value: "symptom_mode" },
      { label: "👨‍⚕️ By Specialization", value: "spec_mode" }
    ]);
    setStep("bookingMode");
  };

  if (user?.role !== "patient") return null;

  return (
    <>
      {/* Floating button - Modern design */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl hover:shadow-3xl transition-all hover:scale-125 hover:rotate-12 group"
        >
          <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Stethoscope className="h-6 w-6 relative z-10" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">!</span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96">
          <Card className="border-none shadow-2xl flex flex-col bg-gradient-to-b from-white to-secondary/10" style={{ height: "35rem" }}>
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-3 rounded-t-lg shadow-md">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold text-sm">Quick Booking</span>
                  <p className="text-xs opacity-90">Powered by MediConnect</p>
                </div>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-primary-foreground hover:bg-white/20" 
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-secondary/5">
              {messages.map((msg, i) => (
                <div key={i} className="space-y-2">
                  {/* Message bubble */}
                  <div className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      msg.from === "user" 
                        ? "bg-primary text-primary-foreground rounded-br-none" 
                        : "bg-white text-foreground border border-border rounded-bl-none"
                    }`}>
                      <div className="whitespace-pre-line">{msg.text}</div>
                    </div>
                  </div>

                  {/* Calendar component */}
                  {msg.component === "calendar" && msg.from === "bot" && step === "date" && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-border rounded-lg p-3 shadow-md">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => date < new Date() || !isDayAvailable(date)}
                          className="rounded-md"
                        />
                      </div>
                    </div>
                  )}

                  {/* Button options */}
                  {msg.buttons && msg.from === "bot" && (
                    <div className="flex flex-wrap gap-2 pl-1">
                      {msg.buttons.map((btn) => (
                        <Button
                          key={btn.value}
                          size="sm"
                          variant="outline"
                          onClick={() => !usedMsgIdx.has(i) && handleButtonClick(btn.value, btn.label, i)}
                          disabled={btn.disabled || isBooking || usedMsgIdx.has(i)}
                          className={`rounded-full text-xs transition-all ${
                            usedMsgIdx.has(i)
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-primary hover:text-primary-foreground"
                          }`}
                        >
                          {btn.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isBooking && (
                <div className="flex justify-center">
                  <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                    Booking appointment...
                  </div>
                </div>
              )}
              
              <div ref={bottomRef} />
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t bg-muted/30 rounded-b-lg flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Select options above</p>
              {step !== "welcome" && step !== "bookingMode" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 px-2 flex-shrink-0"
                  onClick={resetChat}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Start Over
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default Chatbot;
