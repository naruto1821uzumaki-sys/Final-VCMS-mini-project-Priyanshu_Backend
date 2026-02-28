import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle, AlertCircle, Clock, User, Stethoscope, Calendar, Lock, Edit3, Save, X, BadgeCheck } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Medicine",
  "General Surgery",
  "Gynecology & Obstetrics",
  "Hematology",
  "Nephrology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Otolaryngology (ENT)",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Rheumatology",
  "Urology",
];

const DOCTOR_SYMPTOM_OPTIONS = [
  "Fever",
  "Cough",
  "Headache",
  "Chest Pain",
  "Breathing Difficulty",
  "Stomach Pain",
  "Skin Rash",
  "Joint Pain",
  "Back Pain",
  "Anxiety/Stress",
  "Sleep Problems",
  "General Weakness",
];

const Profile = () => {
  const { user, updateUser, changePassword, sendOtp, verifyOtp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    age: user?.age?.toString() || "",
    medicalHistory: user?.medicalHistory || "",
    specialization: user?.specialization || "",
    experience: user?.experience?.toString() || "",
    consultationFee: user?.consultationFee?.toString() || "",
    location: user?.location || "",
    availability: user?.availability || [],
    symptoms: user?.symptoms?.join(", ") || "",
  });

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordState, setPasswordState] = useState<"initial" | "otp-sent" | "otp-verified">("initial");
  const [otpValue, setOtpValue] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Time slot management
  const [timeSlotDay, setTimeSlotDay] = useState<number>(0);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedDoctorSymptoms, setSelectedDoctorSymptoms] = useState<string[]>([]);
  const [otherSymptomText, setOtherSymptomText] = useState("");

  useEffect(() => {
    // Update form when user changes
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        age: user.age?.toString() || "",
        medicalHistory: user.medicalHistory || "",
        specialization: user.specialization || "",
        experience: user.experience?.toString() || "",
        consultationFee: user.consultationFee?.toString() || "",
        location: user.location || "",
        availability: user.availability || [],
        symptoms: user.symptoms?.join(", ") || "",
      });

      const userSymptoms = user.symptoms || [];
      const predefined = userSymptoms.filter((symptom) =>
        DOCTOR_SYMPTOM_OPTIONS.some(
          (option) => option.toLowerCase() === String(symptom).toLowerCase()
        )
      );
      const custom = userSymptoms.filter(
        (symptom) =>
          !DOCTOR_SYMPTOM_OPTIONS.some(
            (option) => option.toLowerCase() === String(symptom).toLowerCase()
          )
      );

      setSelectedDoctorSymptoms(predefined.map((s) => String(s)));
      setOtherSymptomText(custom.join(", "));
    }
  }, [user]);

  // OTP timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  if (!user) return null;

  const handleSave = async () => {
    try {
      const updates: Record<string, unknown> = {
        name: form.name,
        phone: form.phone,
      };

      if (user.role === "patient") {
        updates.age = form.age ? parseInt(form.age) : undefined;
        updates.medicalHistory = form.medicalHistory;
      }

      if (user.role === "doctor") {
        const customSymptoms = otherSymptomText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        updates.specialization = form.specialization;
        updates.experience = form.experience ? parseInt(form.experience) : undefined;
        updates.consultationFee = form.consultationFee ? parseInt(form.consultationFee) : undefined;
        updates.location = form.location;
        updates.availability = form.availability;
        updates.symptoms = [...selectedDoctorSymptoms, ...customSymptoms];
      }

      const result = await updateUser(user._id, updates);
      if (result.success) {
        toast({ title: "Profile updated successfully", description: result.message });
        setEditing(false);
      } else {
        toast({
          title: "Update failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error updating profile",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSendOtp = async () => {
    try {
      const result = await sendOtp(user.phone);
      if (result.success) {
        setPasswordState("otp-sent");
        setOtpTimer(600); // 10 minutes
        toast({ title: "OTP sent", description: "Check your phone/email" });
      } else {
        toast({ title: "Failed to send OTP", description: result.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error sending OTP", description: "Please try again", variant: "destructive" });
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const result = await verifyOtp(user.phone, otpValue);
      if (result.success && result.verified) {
        setPasswordState("otp-verified");
        setOtpTimer(300); // 5 minutes to change password
        toast({ title: "OTP verified successfully" });
      } else {
        toast({ title: "Invalid OTP", description: "Please enter the correct OTP", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error verifying OTP", description: "Please try again", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await resetPassword(user.phone, otpValue, newPassword, confirmPassword);
      if (result.success) {
        toast({ title: "Password changed successfully", description: result.message });
        setShowPasswordChange(false);
        setPasswordState("initial");
        setOtpValue("");
        setNewPassword("");
        setConfirmPassword("");
        setOtpTimer(0);
      } else {
        toast({
          title: "Password change failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error changing password",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const addTimeSlot = () => {
    if (!startTime || !endTime) {
      toast({ title: "Please enter both start and end times", variant: "destructive" });
      return;
    }

    const newSlot = { day: DAYS[timeSlotDay], startTime, endTime };
    const updated = [...form.availability, newSlot];
    setForm((prev) => ({ ...prev, availability: updated }));

    setStartTime("");
    setEndTime("");
    setTimeSlotDay(0);
    toast({ title: "Time slot added" });
  };

  const removeTimeSlot = (index: number) => {
    const updated = form.availability.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, availability: updated }));
  };

  const toggleDoctorSymptom = (symptom: string, checked: boolean) => {
    setSelectedDoctorSymptoms((prev) =>
      checked ? [...prev, symptom] : prev.filter((s) => s !== symptom)
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4 md:p-6 space-y-6 max-w-3xl mx-auto pb-12">

      {/* â”€â”€ Hero Header â”€â”€ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-indigo-600 p-6 shadow-xl text-white">
        <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-5">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30 shadow-lg">
            <span className="text-2xl font-black text-white">
              {user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{user.name}</h1>
              {user.role === "doctor" && user.approvalStatus === "approved" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-500/20 text-green-100 border border-green-400/30 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-white/70 text-sm capitalize mt-0.5">{user.role} Account</p>
            <p className="text-white/60 text-xs mt-1">{user.email}</p>
          </div>
          <Button
            size="sm"
            variant={editing ? "outline" : "secondary"}
            className={editing ? "bg-white/10 border-white/30 text-white hover:bg-white/20" : "bg-white text-primary hover:bg-white/90 font-semibold"}
            onClick={() => editing ? setEditing(false) : setEditing(true)}
          >
            {editing ? <><X className="h-3.5 w-3.5 mr-1" /> Cancel</> : <><Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Profile</>}
          </Button>
        </div>
      </div>

      {/* â”€â”€ Basic Info Card â”€â”€ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</Label>
              <Input
                disabled={!editing}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={!editing ? "bg-muted/30" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email <span className="text-[10px] font-normal normal-case text-muted-foreground/70">(cannot be changed)</span></Label>
              <Input disabled value={user.email} className="bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</Label>
              <Input
                disabled={!editing}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="10-digit phone number"
                className={!editing ? "bg-muted/30" : ""}
              />
            </div>
          </div>

          {/* Patient-Specific Fields */}
          {user.role === "patient" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age</Label>
                <Input
                  disabled={!editing}
                  type="number"
                  min="18"
                  value={form.age}
                  onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                  className={!editing ? "bg-muted/30" : ""}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medical History</Label>
                <Textarea
                  disabled={!editing}
                  value={form.medicalHistory}
                  onChange={(e) => setForm((p) => ({ ...p, medicalHistory: e.target.value }))}
                  placeholder="Your medical history..."
                  rows={3}
                  className={!editing ? "bg-muted/30" : ""}
                />
              </div>
            </div>
          )}

          {editing && (
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* â”€â”€ Doctor-Specific Card â”€â”€ */}
      {user.role === "doctor" && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" /> Professional Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specialization</Label>
                <Select
                  disabled={!editing}
                  value={form.specialization}
                  onValueChange={(val) => setForm((p) => ({ ...p, specialization: val }))}
                >
                  <SelectTrigger className={!editing ? "bg-muted/30" : ""}>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location / Clinic</Label>
                <Input
                  disabled={!editing}
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Clinic location"
                  className={!editing ? "bg-muted/30" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experience (Years)</Label>
                <Input
                  disabled={!editing}
                  type="number"
                  min="0"
                  max="99"
                  value={form.experience}
                  onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                  className={!editing ? "bg-muted/30" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consultation Fee (â‚¹)</Label>
                <Input
                  disabled={!editing}
                  type="number"
                  min="0"
                  value={form.consultationFee}
                  onChange={(e) => setForm((p) => ({ ...p, consultationFee: e.target.value }))}
                  className={!editing ? "bg-muted/30" : ""}
                />
              </div>
            </div>

            {/* Available Time Slots */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> Available Time Slots
              </Label>
              {editing && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={timeSlotDay.toString()} onValueChange={(val) => setTimeSlotDay(parseInt(val))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day, i) => <SelectItem key={day} value={i.toString()}>{day}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="Start" />
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="End" />
                  </div>
                  <Button size="sm" onClick={addTimeSlot} className="w-full">Add Slot</Button>
                </div>
              )}
              {form.availability.length > 0 ? (
                <div className="space-y-2">
                  {form.availability.map((slot: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                      <span className="text-sm font-medium text-foreground">{slot.day}: <span className="font-normal text-muted-foreground">{slot.startTime} â€“ {slot.endTime}</span></span>
                      {editing && (
                        <Button size="sm" variant="ghost" onClick={() => removeTimeSlot(i)} className="text-destructive h-7 px-2 text-xs">Remove</Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No time slots set yet.</p>
              )}
            </div>

            {/* Symptoms You Treat */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Symptoms You Treat</Label>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DOCTOR_SYMPTOM_OPTIONS.map((symptom) => (
                    <label key={symptom} className="flex items-center gap-2.5 text-sm cursor-pointer">
                      <Checkbox
                        disabled={!editing}
                        checked={selectedDoctorSymptoms.includes(symptom)}
                        onCheckedChange={(checked) => toggleDoctorSymptom(symptom, Boolean(checked))}
                      />
                      <span className={!editing ? "text-muted-foreground" : ""}>{symptom}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Other (comma separated)</Label>
                  <Input
                    disabled={!editing}
                    value={otherSymptomText}
                    onChange={(e) => setOtherSymptomText(e.target.value)}
                    placeholder="e.g. migraine, sinusitis"
                    className={!editing ? "bg-muted/30" : ""}
                  />
                </div>
              </div>
            </div>

            {editing && (
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* â”€â”€ Change Password Card â”€â”€ */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Security &amp; Password
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {!showPasswordChange ? (
            <Button variant="outline" className="gap-2" onClick={() => setShowPasswordChange(true)}>
              <Lock className="h-4 w-4" /> Change Password
            </Button>
          ) : passwordState === "initial" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">We'll send an OTP to your registered phone for verification.</p>
              <div className="flex gap-2">
                <Button onClick={handleSendOtp} size="sm">Send OTP</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowPasswordChange(false)}>Cancel</Button>
              </div>
            </div>
          ) : passwordState === "otp-sent" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter the OTP sent to your phone.</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label>OTP Code</Label>
                  <Input placeholder="Enter 6-digit OTP" maxLength={6} value={otpValue} onChange={(e) => setOtpValue(e.target.value)} />
                </div>
                {otpTimer > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pb-3">
                    <Clock className="h-3.5 w-3.5" />
                    {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
                  </div>
                )}
              </div>
              <Button onClick={handleVerifyOtp} disabled={otpValue.length !== 6} size="sm">Verify OTP</Button>
              {otpTimer === 0 && (
                <Button variant="link" size="sm" onClick={handleSendOtp}>Resend OTP</Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                <CheckCircle className="h-4 w-4" /> OTP Verified â€” set your new password
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="min 8 chars" />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" />
                </div>
              </div>
              {otpTimer > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Time remaining: {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={passwordLoading || otpTimer === 0} size="sm">
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowPasswordChange(false);
                  setPasswordState("initial");
                  setOtpValue(""); setNewPassword(""); setConfirmPassword(""); setOtpTimer(0);
                }}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* â”€â”€ Admin Warnings â”€â”€ */}
      {user.adminWarnings && user.adminWarnings.length > 0 && (
        <Card className="border-0 shadow-lg border-l-4 border-l-destructive">
          <CardHeader className="pb-3 border-b bg-red-50/40">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" /> System Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-2">
            {user.adminWarnings.map((warning: any, i: number) => (
              <div key={i} className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                â€¢ {warning.message || warning}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;