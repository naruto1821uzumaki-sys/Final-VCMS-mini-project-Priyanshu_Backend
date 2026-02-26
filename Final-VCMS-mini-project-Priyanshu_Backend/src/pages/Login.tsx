import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow">
              <Activity className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your MediConnect account</p>
        </div>

        <Card className="shadow-xl bg-white rounded-xl overflow-hidden">
          <form onSubmit={handleSubmit} noValidate>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-foreground">Sign In</CardTitle>
              <CardDescription className="text-muted-foreground">Enter your credentials to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Submit Error */}
              {errors.submit && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{errors.submit}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                <Input 
                  id="email" 
                  name="email"
                  type="email" 
                  placeholder="example@gmail.com" 
                  value={email} 
                  onChange={handleEmailChange} 
                  onBlur={handleBlur}
                  className={`border-secondary focus:border-primary focus:ring-primary ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={handlePasswordChange} 
                    onBlur={handleBlur}
                    className={`border-secondary focus:border-primary focus:ring-primary ${errors.password ? "border-destructive" : ""}`}
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && <p className="text-xs text-destructive font-medium">{errors.password}</p>}
              </div>

              <div className="rounded-lg bg-primary/10 p-3 space-y-1.5 border border-primary/20">
                <p className="text-xs font-semibold text-primary">Demo Credentials</p>
                <div className="grid gap-1 text-xs text-muted-foreground">
                  <p><span className="font-medium">Admin:</span> admin@gmail.com / 12345</p>
                  <p><span className="font-medium">Doctor:</span> alice.doctor@vcms.com / doctor123</p>
                  <p><span className="font-medium">Patient:</span> john@patient.com / patient123</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3 pt-4">
              <Button type="submit" className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
              {/* Registration link intentionally hidden on the Sign In page */}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;

