import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Check, Clock, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Stage: "request" | "verify" | "reset" | "success"
  const [stage, setStage] = useState<"request" | "verify" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [devOtp, setDevOtp] = useState<string>("");

  // Start OTP timer
  const startOtpTimer = () => {
    setOtpTimer(60);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Validation functions
  const validateEmail = (email: string) => {
    if (!email) return false;
    const trimmed = email.trim();
    const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicRegex.test(trimmed)) return false;
    const parts = trimmed.split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1].toLowerCase();
    // Only allow Gmail addresses for this project
    return domain === 'gmail.com';
  };

  const validatePassword = (value: string) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(value);
  };

  // Step 1: Request Email OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setDevOtp("");

    if (!validateEmail(email)) {
      setErrors({ email: "Valid Gmail address is required" });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/send-email-otp", { email });

      if (response.data.success) {
        if (response.data.otp) {
          setDevOtp(response.data.otp);
        }
        toast({
          title: "OTP Sent Successfully",
          description: `OTP has been sent to ${email}`,
        });
        setStage("verify");
        startOtpTimer();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to send OTP";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setErrors({ general: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!otp || otp.length !== 6) {
      setErrors({ otp: "OTP must be 6 digits" });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/verify-email-otp", { email, code: otp });

      if (response.data.success) {
        toast({
          title: "OTP Verified",
          description: "Now you can reset your password",
        });
        setStage("reset");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to verify OTP";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setErrors({ otp: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password with Email OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!newPassword || !confirmPassword) {
      setErrors({ password: "Both password fields are required" });
      return;
    }

    if (!validatePassword(newPassword)) {
      setErrors({
        password: "Password must be 8+ chars with uppercase, number, special char",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/reset-password-email", {
        email,
        code: otp,
        newPassword,
        confirmPassword,
      });

      if (response.data.success) {
        setStage("success");
        toast({
          title: "Success",
          description: "Password reset successfully",
        });

        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to reset password";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setErrors({ general: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setOtp("");
    await handleRequestOtp({
      preventDefault: () => {},
    } as React.FormEvent);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reset Password</h1>
          <p className="text-muted-foreground">Recover your account securely</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between px-2 my-6">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm transition-all ${
              stage === "request" || ["verify", "reset", "success"].includes(stage)
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {["verify", "reset", "success"].includes(stage) ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <div className={`flex-1 h-1 mx-2 rounded transition-all ${
            ["verify", "reset", "success"].includes(stage) ? "bg-primary" : "bg-secondary"
          }`} />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm transition-all ${
              stage === "verify" || ["reset", "success"].includes(stage)
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {["reset", "success"].includes(stage) ? <Check className="h-4 w-4" /> : "2"}
          </div>
          <div className={`flex-1 h-1 mx-2 rounded transition-all ${
            ["reset", "success"].includes(stage) ? "bg-primary" : "bg-secondary"
          }`} />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm transition-all ${
              stage === "reset" || stage === "success"
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {stage === "success" ? <Check className="h-4 w-4" /> : "3"}
          </div>
        </div>

        {/* Success Screen */}
        {stage === "success" && (
          <Card className="shadow-xl bg-white rounded-xl overflow-hidden border-green-200">
            <CardContent className="pt-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-600">Password Reset Successful!</h2>
              <p className="text-muted-foreground">
                Your password has been reset successfully. Redirecting to login page...
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request OTP Stage */}
        {stage === "request" && (
          <Card className="shadow-xl bg-white rounded-xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Reset Password</CardTitle>
              <CardDescription>We'll send an OTP to verify your email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-semibold">
                    Email Address *
                  </Label>
                  <div className="relative">
                    <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) delete errors.email;
                      }}
                      className={`pl-10 border-2 ${
                        errors.email ? "border-destructive" : "border-secondary focus:border-primary"
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
                  <p className="text-xs text-muted-foreground mt-1">OTP will be sent to your email</p>
                </div>

                {errors.general && (
                  <Alert className="bg-destructive/10 border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">{errors.general}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-md transition-all"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Verify OTP Stage */}
        {stage === "verify" && (
          <Card className="shadow-xl bg-white rounded-xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Verify OTP</CardTitle>
              <CardDescription>Enter the 6-digit OTP sent to your email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-foreground font-semibold">
                    OTP Code *
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(cleaned);
                        if (errors.otp) delete errors.otp;
                      }}
                      maxLength={6}
                      className={`pl-10 text-center text-lg tracking-widest border-2 font-mono ${
                        errors.otp ? "border-destructive" : "border-secondary focus:border-primary"
                      }`}
                    />
                  </div>
                  {errors.otp && <p className="text-xs text-destructive font-medium">{errors.otp}</p>}
                </div>

                {otpTimer > 0 ? (
                  <p className="text-xs text-muted-foreground text-center">
                    Resend OTP in {otpTimer}s
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-primary font-semibold hover:bg-primary/10"
                    onClick={handleResendOtp}
                  >
                    Resend OTP
                  </Button>
                )}

                {errors.general && (
                  <Alert className="bg-destructive/10 border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">{errors.general}</AlertDescription>
                  </Alert>
                )}

                {devOtp && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Development Mode:</strong> Your OTP code is <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded text-base">{devOtp}</span>
                      <br />
                      <span className="text-xs text-blue-700 mt-1 inline-block">Real email has been sent to {email}</span>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-md transition-all"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reset Password Stage */}
        {stage === "reset" && (
          <Card className="shadow-xl bg-white rounded-xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Set New Password</CardTitle>
              <CardDescription>Create a strong password for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-foreground font-semibold">
                    New Password *
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.password) delete errors.password;
                    }}
                    className={`border-2 ${
                      errors.password ? "border-destructive" : "border-secondary focus:border-primary"
                    }`}
                  />
                  {errors.password && <p className="text-xs text-destructive font-medium">{errors.password}</p>}
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters with 1 uppercase, 1 number, 1 special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground font-semibold">
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) delete errors.confirmPassword;
                    }}
                    className={`border-2 ${
                      errors.confirmPassword
                        ? "border-destructive"
                        : "border-secondary focus:border-primary"
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive font-medium">{errors.confirmPassword}</p>
                  )}
                </div>

                {errors.general && (
                  <Alert className="bg-destructive/10 border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">{errors.general}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-md transition-all"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Footer Links */}
        {stage !== "success" && (
          <div className="text-center space-y-3">
            <Button
              variant="ghost"
              className="w-full text-primary font-semibold hover:bg-primary/10 gap-2"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
            <p className="text-xs text-muted-foreground">
              Need immediate help?{" "}
              <a href="mailto:support@mediconnect.com" className="text-primary hover:underline font-semibold">
                Contact Support
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
