import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle, AlertCircle, Clock } from "lucide-react";

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
        updates.specialization = form.specialization;
        updates.experience = form.experience ? parseInt(form.experience) : undefined;
        updates.consultationFee = form.consultationFee ? parseInt(form.consultationFee) : undefined;
        updates.location = form.location;
        updates.availability = form.availability;
        updates.symptoms = form.symptoms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
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

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>

      {/* Profile Card */}
      <Card className="border-0 shadow-md">
        <CardHeader className="items-center">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {user.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="mt-3">{user.name}</CardTitle>
          <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
          {user.approvalStatus && user.role === "doctor" && (
            <p className={`text-xs font-semibold mt-1 ${user.approvalStatus === "approved" ? "text-green-600" : "text-yellow-600"}`}>
              {user.approvalStatus === "approved" ? "✓ Approved" : "⏳ Pending Approval"}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              disabled={!editing}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Email <span className="text-xs text-muted-foreground">(cannot be changed)</span>
            </Label>
            <Input disabled value={user.email} />
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              disabled={!editing}
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="10-digit phone number"
            />
          </div>

          {/* Patient-Specific Fields */}
          {user.role === "patient" && (
            <>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  disabled={!editing}
                  type="number"
                  min="18"
                  value={form.age}
                  onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Medical History</Label>
                <Textarea
                  disabled={!editing}
                  value={form.medicalHistory}
                  onChange={(e) => setForm((p) => ({ ...p, medicalHistory: e.target.value }))}
                  placeholder="Your medical history..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Doctor-Specific Fields */}
          {user.role === "doctor" && (
            <>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Select
                  disabled={!editing}
                  value={form.specialization}
                  onValueChange={(val) => setForm((p) => ({ ...p, specialization: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Experience (Years)</Label>
                  <Input
                    disabled={!editing}
                    type="number"
                    min="0"
                    max="99"
                    value={form.experience}
                    onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                    placeholder="Years of experience"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Consultation Fee (₹)</Label>
                  <Input
                    disabled={!editing}
                    type="number"
                    min="0"
                    value={form.consultationFee}
                    onChange={(e) => setForm((p) => ({ ...p, consultationFee: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  disabled={!editing}
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Clinic location"
                />
              </div>

              {/* Available Time Slots */}
              <div className="space-y-3">
                <Label>Available Time Slots</Label>
                {editing && (
                  <div className="p-3 bg-muted rounded-md space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={timeSlotDay.toString()} onValueChange={(val) => setTimeSlotDay(parseInt(val))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day, i) => (
                            <SelectItem key={day} value={i.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="Start" />
                      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="End" />
                    </div>
                    <Button size="sm" onClick={addTimeSlot} className="w-full">
                      Add Slot
                    </Button>
                  </div>
                )}
                {form.availability.length > 0 && (
                  <div className="space-y-2">
                    {form.availability.map((slot: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-muted rounded-md">
                        <span className="text-sm">
                          {slot.day}: {slot.startTime} - {slot.endTime}
                        </span>
                        {editing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTimeSlot(i)}
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Symptoms You Treat</Label>
                <Textarea
                  disabled={!editing}
                  value={form.symptoms}
                  onChange={(e) => setForm((p) => ({ ...p, symptoms: e.target.value }))}
                  placeholder="e.g. chest pain, fever, headache (comma separated)"
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Save/Edit Buttons */}
          <div className="flex gap-3 pt-2">
            {editing ? (
              <>
                <Button onClick={handleSave}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Change Password (OTP Required)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordChange ? (
            <Button variant="outline" onClick={() => setShowPasswordChange(true)}>
              Change Password
            </Button>
          ) : passwordState === "initial" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We'll send an OTP to your registered phone number for verification.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleSendOtp}>Send OTP</Button>
                <Button variant="ghost" onClick={() => setShowPasswordChange(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : passwordState === "otp-sent" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter the OTP sent to your phone.</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>OTP</Label>
                  <Input
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                  />
                </div>
                {otpTimer > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
                  </div>
                )}
              </div>
              <Button onClick={handleVerifyOtp} disabled={otpValue.length !== 6}>
                Verify OTP
              </Button>
              {otpTimer === 0 && (
                <Button variant="link" size="sm" onClick={handleSendOtp} className="w-full">
                  Resend OTP
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                OTP Verified
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="min 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>
              {otpTimer > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Complete in: {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={passwordLoading || otpTimer === 0}>
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordState("initial");
                    setOtpValue("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setOtpTimer(0);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Warnings */}
      {user.adminWarnings && user.adminWarnings.length > 0 && (
        <Card className="border-0 shadow-md border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertCircle className="h-5 w-5" />
              System Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.adminWarnings.map((warning: any, i: number) => (
              <p key={i} className="text-sm text-muted-foreground">
                • {warning.message || warning} (
                {warning.giverRef && <span className="text-xs">by admin</span>})
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;
