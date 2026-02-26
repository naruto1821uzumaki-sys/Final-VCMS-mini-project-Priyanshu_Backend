import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, X } from "lucide-react";
import api from "@/services/api";

interface Message {
  from: "bot" | "user";
  text: string;
  buttons?: { label: string; value: string }[];
}

const SYMPTOM_OPTIONS = [
  { label: "🤒 Fever / Cold", value: "fever" },
  { label: "🤕 Headache", value: "headache" },
  { label: "💔 Chest Pain", value: "chest pain" },
  { label: "🩹 Skin Rash", value: "skin rash" },
  { label: "🦴 Joint Pain", value: "joint pain" },
  { label: "🔙 Back Pain", value: "back pain" },
  { label: "🤢 Stomach Pain", value: "stomach pain" },
  { label: "😣 Acne", value: "acne" },
  { label: "💇 Hair Loss", value: "hair loss" },
  { label: "❤️‍🩹 High BP", value: "high blood pressure" },
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Step = "greeting" | "symptoms" | "doctors" | "date" | "slots" | "confirm" | "done";

const Chatbot = () => {
  const { user } = useAuth();
  const { bookAppointment, isSlotBooked } = useClinic();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>("greeting");
  const [selectedSymptom, setSelectedSymptom] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [matchedDoctors, setMatchedDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
    
    if (open) {
      fetchDoctors();
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      const firstName = user?.name?.split(' ')[0] || "there";
      setMessages([{
        from: "bot",
        text: `Hi ${firstName}! I'll help you book an appointment. What symptom are you experiencing?`,
        buttons: SYMPTOM_OPTIONS.map((s) => ({ label: s.label, value: s.value })),
      }]);
      setStep("symptoms");
    }
  }, [open, messages.length, user?.name]);

  const addMessage = (from: "bot" | "user", text: string, buttons?: Message["buttons"]) => {
    setMessages((prev) => [...prev, { from, text, buttons }]);
  };

  const handleButtonClick = (value: string, label: string) => {
    switch (step) {
      case "symptoms": {
        addMessage("user", label);
        setSelectedSymptom(value);
        
        // Get specializations for this symptom
        const requiredSpecializations = SYMPTOM_TO_SPECIALIZATION[value.toLowerCase()] || [];
        
        // Filter doctors by specialization
        const matched = doctors.filter((d) =>
          requiredSpecializations.some((spec) => 
            d.specialization?.toLowerCase().includes(spec.toLowerCase())
          )
        );
        
        if (matched.length === 0) {
          addMessage("bot", "Sorry, no doctors found for this symptom. Try another one.", SYMPTOM_OPTIONS.map((s) => ({ label: s.label, value: s.value })));
        } else {
          setMatchedDoctors(matched);
          addMessage("bot", "Here are the available doctors. Select one:",
            matched.map((d) => ({
              label: `Dr. ${d.name} (${d.specialization}) - ₹${d.consultationFee || "500"}`,
              value: d.id,
            }))
          );
          setStep("doctors");
        }
        break;
      }
      case "doctors": {
        addMessage("user", label);
        setSelectedDoctorId(value);
        const doc = doctors.find((d) => d.id === value);
        if (doc) {
          // Generate next 7 days
          const dates: { label: string; value: string }[] = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split("T")[0];
            const dayIndex = d.getDay();
            const isAvailable = doc.availableDays?.includes(dayIndex);
            dates.push({
              label: `${dateStr} (${DAYS[dayIndex].slice(0, 3)})${!isAvailable ? " - Closed" : ""}`,
              value: isAvailable ? dateStr : `closed_${dateStr}`,
            });
          }
          addMessage("bot", `Selected Dr. ${doc.name}. Choose a date:`, dates);
          setStep("date");
        }
        break;
      }
      case "date": {
        if (value.startsWith("closed_")) {
          addMessage("user", label);
          addMessage("bot", "Doctor is not available on this day. Please select another date.");
          return;
        }
        addMessage("user", label);
        setSelectedDate(value);
        const doc = doctors.find((d) => d.id === selectedDoctorId);
        if (doc && doc.availableSlots) {
          const slotButtons = doc.availableSlots.map((slot) => {
            const booked = isSlotBooked(doc.id, value, slot);
            return {
              label: booked ? `${slot} (Booked)` : slot,
              value: booked ? `booked_${slot}` : slot,
            };
          });
          addMessage("bot", "Select a time slot:", slotButtons);
          setStep("slots");
        }
        break;
      }
      case "slots": {
        if (value.startsWith("booked_")) {
          addMessage("user", label);
          addMessage("bot", "This slot is already booked. Please select another.");
          return;
        }
        addMessage("user", label);
        setSelectedTime(value);
        const doc = doctors.find((d) => d.id === selectedDoctorId);
        addMessage("bot",
          `Confirm booking?\n\nDoctor: Dr. ${doc?.name}\nDate: ${selectedDate}\nTime: ${value}\nFee: ₹${doc?.consultationFee}`,
          [
            { label: "✅ Confirm", value: "confirm" },
            { label: "❌ Cancel", value: "cancel" },
          ]
        );
        setStep("confirm");
        break;
      }
      case "confirm": {
        addMessage("user", label);
        if (value === "confirm") {
          const doc = doctors.find((d) => d.id === selectedDoctorId);
          if (doc && user) {
            // Calculate age from dateOfBirth
            let patientAge = user.age || 0;
            if (!patientAge && user.dateOfBirth) {
              const today = new Date();
              const birthDate = new Date(user.dateOfBirth);
              patientAge = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0) patientAge--;
            }
            
            bookAppointment({
              patientId: user.id,
              patientName: `${user.name}`,
              patientAge: patientAge,
              patientMedicalHistory: user.medicalHistory,
              doctorId: doc.id,
              doctorName: `Dr. ${doc.name}`,
              specialization: doc.specialization || "",
              location: doc.location,
              date: selectedDate,
              time: selectedTime,
              consultationFee: doc.consultationFee,
            });
            addMessage("bot", "✅ Appointment booked successfully! Check your dashboard.",
              [{ label: "Book Another", value: "restart" }]
            );
            setStep("done");
          }
        } else {
          addMessage("bot", "Booking cancelled.",
            [{ label: "Start Over", value: "restart" }]
          );
          setStep("done");
        }
        break;
      }
      case "done": {
        setMessages([]);
        setStep("greeting");
        setSelectedSymptom("");
        setSelectedDoctorId("");
        setSelectedDate("");
        setSelectedTime("");
        setMatchedDoctors([]);
        break;
      }
    }
  };

  if (user?.role !== "patient") return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96">
          <Card className="border-0 shadow-xl flex flex-col" style={{ height: "30rem" }}>
            <div className="flex items-center justify-between bg-primary text-primary-foreground px-4 py-3 rounded-t-lg">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-semibold text-sm">MediConnect Assistant</span>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-foreground hover:bg-primary/80" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                      msg.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                  {msg.buttons && msg.from === "bot" && (
                    <div className="flex flex-wrap gap-1 mt-2 ml-1">
                      {msg.buttons.map((btn) => (
                        <button
                          key={btn.value}
                          onClick={() => handleButtonClick(btn.value, btn.label)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            btn.value.startsWith("booked_") || btn.value.startsWith("closed_")
                              ? "bg-destructive/10 text-destructive border-destructive/30 cursor-not-allowed line-through"
                              : "bg-card text-foreground border-border hover:bg-accent hover:border-primary/30 cursor-pointer"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default Chatbot;
