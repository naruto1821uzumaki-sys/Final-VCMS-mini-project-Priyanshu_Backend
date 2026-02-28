import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email || !validateEmail(email)) {
      newErrors.email = "Valid Gmail address is required (example@gmail.com)";
    }

    if (!password || password.length < 1) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (name: string, value: string) => {
    const newErrors: Record<string, string> = { ...errors };
    const setError = (k: string, msg: string) => { newErrors[k] = msg; };
    const clearError = (k: string) => { delete newErrors[k]; };

    if (name === "email") {
      if (!validateEmail(value)) setError("email", "Valid Gmail address is required (example@gmail.com)");
      else clearError("email");
    }

    if (name === "password") {
      if (!value || value.length < 1) setError("password", "Password is required");
      else clearError("password");
    }

    setErrors(newErrors);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (errors.password) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const result = await login(email.trim().toLowerCase(), password);

    if (result.success) {
      const role = result.user?.role;
      toast({ title: "Success", description: "Login successful!" });
      
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "doctor") {
        navigate("/doctor");
      } else if (role === "patient") {
        navigate("/patient");
      } else {
        navigate("/");
      }
    } else {
      setErrors({ submit: result.message });
    }
    
    setLoading(false);
  };


  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-12 text-white">
        <div className="flex items-center gap-2.5">
          <Activity className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-lg tracking-tight">MediConnect</span>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium">
              Virtual Clinic Platform
            </div>
            <h2 className="text-4xl font-extrabold leading-tight">
              Healthcare that comes{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">to you.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Connect with verified doctors, get prescriptions, and analyze your medical reports — all from your browser.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Active Doctors", value: "500+" },
              { label: "Consultations", value: "50k+" },
              { label: "Patients Served", value: "10k+" },
              { label: "Rating", value: "4.9 ★" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-xs">© 2026 MediConnect · Your health, secured.</p>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-bold text-slate-900">MediConnect</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {errors.submit && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleBlur}
                className={`h-11 rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 ${errors.email ? "border-red-400 focus:border-red-400" : ""}`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handleBlur}
                  className={`h-11 rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 pr-10 ${errors.password ? "border-red-400" : ""}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Demo credentials */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Demo Credentials</p>
              <div className="space-y-1 text-xs text-slate-600">
                <p><span className="font-semibold text-slate-800">Admin:</span> admin@gmail.com / 12345</p>
                <p><span className="font-semibold text-slate-800">Doctor:</span> alice.doctor@vcms.com / doctor123</p>
                <p><span className="font-semibold text-slate-800">Patient:</span> john@patient.com / patient123</p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white font-semibold text-base shadow-lg shadow-primary/20 gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</span>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;
