import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, Clock, CalendarDays, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { formatLocation } from "@/utils/formatLocation";

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

const GuestDashboard = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specializationsList, setSpecializationsList] = useState<string[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [filterSpec, setFilterSpec] = useState("none");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterName, setFilterName] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Fetch doctors and specialization list from the public API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doctorsRes, specsRes] = await Promise.all([
          api.get('/public/doctors', { params: { limit: 100 } }),
          api.get('/public/specializations'),
        ]);

        console.debug('GuestDashboard doctorsRes', doctorsRes.data);
        console.debug('GuestDashboard specsRes', specsRes.data);

        if (doctorsRes.data?.doctors) {
          setDoctors(doctorsRes.data.doctors);
        } else {
          console.warn('GuestDashboard: no doctors returned from /public/doctors', doctorsRes.data);
        }

        if (specsRes.data?.specializations) {
          // backend returns objects with { specialization, count }
          const specs = specsRes.data.specializations
            .map((s: any) => s.specialization)
            .filter(Boolean);
          setSpecializationsList(specs);
        } else {
          console.warn('GuestDashboard: failed to load specializations', specsRes.data);
        }
      } catch (err) {
        console.error('Error fetching public data:', err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchData();
  }, []);

  // memoize specialization list; prefer server-provided list if available
  const specializations = useMemo(() => {
    if (specializationsList.length > 0) {
      return specializationsList;
    }
    const specs = new Set(doctors.map((d) => d.specialization).filter(Boolean));
    return Array.from(specs) as string[];
  }, [doctors, specializationsList]);

  const nameSuggestions = useMemo(() => {
    if (!filterName.trim()) return [];
    const lower = filterName.toLowerCase();
    return doctors
      .filter((d) => (d.name || '').toLowerCase().startsWith(lower) || (d.name || '').toLowerCase().includes(lower))
      .map((d) => `Dr. ${d.name || 'Unknown'}`)
      .slice(0, 5);
  }, [doctors, filterName]);

  // use shared utility so other components can reuse the logic
  const locationToString = (loc: any): string => formatLocation(loc);

  const filteredDoctors = useMemo(() => {
    // specialization filtering enabled any time spec is provided and not 'none';
    // 'all' means "do not filter by spec" but it should count as an active filter
    const hasSpecFilter = filterSpec && filterSpec !== 'none' && filterSpec !== 'all';
    const wantsAll = filterSpec === 'all';
    const hasFilters = selectedSymptoms.length > 0 || wantsAll || hasSpecFilter || filterLocation || filterName.trim();
    if (!hasFilters) {
      // nothing selected: show prompt rather than doctors
      return [];
    }

    return doctors.filter((doc) => {
      // If symptoms are selected, doctor must match at least one symptom
      if (selectedSymptoms.length > 0) {
        const matchesSymptom = selectedSymptoms.some((symptom) => {
          const requiredSpecializations = SYMPTOM_TO_SPECIALIZATION[symptom.toLowerCase()] || [];
          return requiredSpecializations.some((spec) =>
            doc.specialization?.toLowerCase().includes(spec.toLowerCase())
          );
        });
        if (!matchesSymptom) return false;
      }
      if (hasSpecFilter && doc.specialization !== filterSpec) return false;
      if (filterLocation) {
        const locStr = locationToString(doc.location).toLowerCase();
        if (!locStr.includes(filterLocation.toLowerCase())) return false;
      }
      if (filterName) {
        const name = doc.name.toLowerCase();
        if (!name.includes(filterName.toLowerCase().replace("dr. ", ""))) return false;
      }
      return true;
    });
  }, [doctors, filterSpec, filterLocation, filterName, selectedSymptoms]);

  const getDayNameStr = (dateStr: string) => {
    const d = new Date(dateStr);
    return DAYS[d.getDay()];
  };

  // determine if any filter criteria are active (used for messaging)
  const hasFilters =
    selectedSymptoms.length > 0 ||
    filterSpec === 'all' ||
    (filterSpec && filterSpec !== 'none' && filterSpec !== 'all') ||
    filterLocation ||
    filterName.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      {/* Page uses global header from Layout; remove duplicate fixed header */}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto mt-16 px-4 md:px-8 pb-8">

        {/* Symptoms Quick Select */}
        <Card className="mb-8 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/20">
            <CardTitle className="text-primary text-xl">🏥 Select Your Symptoms (Multiple allowed)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {SYMPTOM_CARDS.map((symptom) => (
                <button
                  key={symptom.name}
                  onClick={() =>
                    setSelectedSymptoms((prev) =>
                      prev.includes(symptom.name)
                        ? prev.filter((s) => s !== symptom.name)
                        : [...prev, symptom.name]
                    )
                  }
                  className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                    selectedSymptoms.includes(symptom.name)
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-secondary bg-white hover:border-secondary/80 hover:bg-white"
                  }`}
                >
                  <div className="text-3xl mb-2">{symptom.icon}</div>
                  <div className="text-sm font-medium text-foreground">{symptom.name}</div>
                  {selectedSymptoms.includes(symptom.name) && (
                    <div className="text-xs text-primary font-bold mt-2">✓ Selected</div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Doctor Search */}
        <Card className="mb-8 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/20">
            <CardTitle className="text-primary text-xl flex items-center gap-2">
              <Search className="h-5 w-5" /> Search & Filter Doctors
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-foreground font-semibold mb-2 block">Specialization</Label>
                <select
                  value={filterSpec}
                  onChange={(e) => setFilterSpec(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-secondary rounded-lg bg-white hover:bg-secondary/50 focus:border-primary focus:outline-none transition-all"
                >
                  <option value="none">None</option>
                  <option value="all">All Specializations</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-foreground font-semibold mb-2 block">Location</Label>
                <Input
                  placeholder="Search location..."
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="border-2 border-secondary focus:border-primary"
                />
              </div>
              <div>
                <Label className="text-foreground font-semibold mb-2 block">Doctor Name</Label>
                <div className="relative">
                  <Input
                    placeholder="Dr. ..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    onFocus={() => setShowNameSuggestions(true)}
                    className="border-2 border-secondary focus:border-primary"
                  />
                  {showNameSuggestions && nameSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-secondary rounded-lg shadow-lg z-10">
                      {nameSuggestions.map((name) => (
                        <div
                          key={name}
                          onClick={() => {
                            setFilterName(name.replace("Dr. ", ""));
                            setShowNameSuggestions(false);
                          }}
                          className="px-4 py-2.5 hover:bg-white cursor-pointer text-foreground transition-colors font-medium"
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctors List */}
        <div className="grid gap-6">
          {loadingDoctors ? (
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="pt-12 text-center">
                <p className="text-foreground text-lg font-medium">Loading doctors...</p>
              </CardContent>
            </Card>
          ) : filteredDoctors.length === 0 ? (
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="pt-12 text-center">
                <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                {doctors.length === 0 ? (
                  <>
                    <p className="text-foreground text-lg font-medium">No doctors are available right now.</p>
                    <p className="text-muted-foreground text-sm mt-2">
                      The public database may be empty or unreachable. Verify your backend connection and seed data.
                    </p>
                  </>
                ) : !hasFilters ? (
                  <>
                    <p className="text-foreground text-lg font-medium">Select symptoms or apply filters to see doctors.</p>
                    <p className="text-muted-foreground text-sm mt-2">Start by picking a symptom or entering a location/name.</p>
                  </>
                ) : (
                  <>
                    <p className="text-foreground text-lg font-medium">No doctors found matching your criteria.</p>
                    <p className="text-muted-foreground text-sm mt-2">Try adjusting your filters or symptoms.</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredDoctors.map((doc) => {
              return (
                <Card key={doc._id} className="border-primary/20 shadow-md hover:shadow-lg transition-all hover:border-primary/40 overflow-hidden">
                  <CardContent className="py-4 px-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="md:w-1/4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-xl text-primary font-semibold">
                            {doc.name ? doc.name.charAt(0) : "D"}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground">Dr. {doc.name || 'Unknown'}</h3>
                            <p className="text-primary font-medium mt-0.5 text-sm">{doc.specialization}</p>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-medium">
                                {formatLocation(doc.location) || "Location not specified"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Consultation</p>
                          <p className="text-lg font-bold text-primary">₹{doc.consultationFee || "N/A"}</p>
                        </div>

                        <Button
                          onClick={() => navigate("/login")}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-md transition-all"
                        >
                          Book
                        </Button>
                      </div>

                      <div className="md:w-3/4 space-y-3">
                        <div>
                          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-base">
                            <Stethoscope className="h-4 w-4 text-primary" />
                            Specialization
                          </h4>
                          <div className="space-y-2">
                            {doc.specialization && (
                              <div className="inline-block bg-blue-100 text-blue-900 px-3 py-1.5 rounded-md text-sm font-semibold border border-blue-300 hover:bg-blue-50 transition-colors">
                                {doc.specialization}
                              </div>
                            )}
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              {doc.experience && `${doc.experience} years of experience`}{doc.experience && doc.specialization && ' in '}{doc.specialization && `${doc.specialization}`}.
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-base">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            Availability
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {doc.availability && doc.availability.length > 0 ? (
                              // sort by weekday order then start time
                              [...doc.availability]
                                .sort((a: any, b: any) => {
                                  const ai = DAYS.indexOf(a.day);
                                  const bi = DAYS.indexOf(b.day);
                                  if (ai !== bi) return ai - bi;
                                  return a.startTime.localeCompare(b.startTime);
                                })
                                .map((avail: any, idx: number) => (
                                  <div key={idx} className="bg-green-100 px-3 py-2 rounded-md text-sm font-medium text-green-800 border border-green-300 hover:bg-green-200 transition-colors">
                                    📅 <span className="font-semibold">{avail.day}</span>
                                    <span className="text-green-600 mx-1.5">•</span>
                                    <span className="font-mono text-xs">{avail.startTime} - {avail.endTime}</span>
                                  </div>
                                ))
                            ) : (
                              <p className="text-muted-foreground text-sm italic">No availability specified</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-base">
                            <Clock className="h-4 w-4 text-primary" />
                            Consultation Info
                          </h4>
                          <div className="space-y-2">
                            <div className="bg-primary/10 border border-primary/20 rounded-md p-2">
                              <p className="text-xs text-primary font-medium mb-1">ℹ️ Important Note</p>
                              <p className="text-xs text-primary/70 leading-relaxed">
                                Public holidays may affect doctor availability. Verify the slot during booking or call the clinic.
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              Create an account to select your preferred time slot
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 mb-8 border-t border-secondary pt-8">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-foreground">Ready to Get Started?</h3>
            <p className="text-muted-foreground">Create an account to book your appointment with ease</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate("/register")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
              >
                Create Account
              </Button>
              <Button
                onClick={() => navigate("/login")}
                className="bg-white hover:bg-secondary text-primary font-semibold border-2 border-primary px-6"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestDashboard;
