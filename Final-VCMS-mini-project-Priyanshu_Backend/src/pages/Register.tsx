  import { useState } from "react";
  import { Link, useNavigate } from "react-router-dom";
  import { useAuth, UserRole } from "@/contexts/AuthContext";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Activity, ArrowRight, Stethoscope, User, AlertCircle, CheckCircle } from "lucide-react";
  import { useToast } from "@/hooks/use-toast";
  import { Alert, AlertDescription } from "@/components/ui/alert";
  import { Textarea } from "@/components/ui/textarea";

  const Register = () => {
    const [role, setRole] = useState<UserRole>("patient");
    const [formData, setFormData] = useState({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      specialization: "",
      experience: "", // years of practice for doctors
      dateOfBirth: "",
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { register } = useAuth();
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

    const validatePhone = (phone: string) => {
      const cleanPhone = phone.replace(/\D/g, '');
      return cleanPhone.length === 10;
    };

    const validatePassword = (password: string) => {
      const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      return regex.test(password);
    };

    const validateDOB = (dob: string) => {
      if (!dob) return false;
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 18;
      }
      return age >= 18;
    };

    const validateForm = () => {
      const newErrors: Record<string, string> = {};

      // Name validation: allow letters, digits, spaces and _ - . ' characters
      // Require at least one alphabetic letter to avoid purely numeric names
      const nameAllowedRegex = /^[A-Za-z0-9 _\-.'À-ÖØ-öø-ÿ]+$/;
      const hasLetterRegex = /[A-Za-z]/;

      if (!formData.firstName || formData.firstName.trim() === "") {
        newErrors.firstName = "First name is required";
      } else {
        const v = formData.firstName.trim();
        if (!nameAllowedRegex.test(v)) newErrors.firstName = "First name contains invalid characters";
        else if (!hasLetterRegex.test(v)) newErrors.firstName = "First name must include at least one letter";
      }

      if (!formData.lastName || formData.lastName.trim() === "") {
        newErrors.lastName = "Last name is required";
      } else {
        const v = formData.lastName.trim();
        if (!nameAllowedRegex.test(v)) newErrors.lastName = "Last name contains invalid characters";
        else if (!hasLetterRegex.test(v)) newErrors.lastName = "Last name must include at least one letter";
      }

      // username removed: generated server-side from name or email

      if (!formData.email || !validateEmail(formData.email)) {
        newErrors.email = "Valid Gmail address is required (example@gmail.com)";
      }

      if (!formData.phone || !validatePhone(formData.phone)) {
        newErrors.phone = "Phone must be 10 digits";
      }

      if (!formData.password || !validatePassword(formData.password)) {
        newErrors.password = "Password must be 8+ chars with uppercase, number, and special char";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      if (role === "patient") {
        if (!formData.dateOfBirth || !validateDOB(formData.dateOfBirth)) {
          newErrors.dateOfBirth = "You must be at least 18 years old";
        }
      }
      if (role === "doctor") {
        const exp = parseInt(formData.experience);
        if (isNaN(exp) || exp < 0) {
          newErrors.experience = "Enter a valid number of years";
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    };

    const validateField = (name: string, value: string) => {
      const newErrors: Record<string, string> = { ...errors };
      const setError = (k: string, msg: string) => { newErrors[k] = msg; };
      const clearError = (k: string) => { delete newErrors[k]; };

      switch (name) {
        case "firstName": {
          const nameAllowedRegex = /^[A-Za-z0-9 _\-.'À-ÖØ-öø-ÿ]+$/;
          const hasLetterRegex = /[A-Za-z]/;
          if (!value || value.trim() === "") setError("firstName", "First name is required");
          else if (!nameAllowedRegex.test(value)) setError("firstName", "First name contains invalid characters");
          else if (!hasLetterRegex.test(value)) setError("firstName", "First name must include at least one letter");
          else clearError("firstName");
          break;
        }
        case "lastName": {
          const nameAllowedRegex = /^[A-Za-z0-9 _\-.'À-ÖØ-öø-ÿ]+$/;
          const hasLetterRegex = /[A-Za-z]/;
          if (!value || value.trim() === "") setError("lastName", "Last name is required");
          else if (!nameAllowedRegex.test(value)) setError("lastName", "Last name contains invalid characters");
          else if (!hasLetterRegex.test(value)) setError("lastName", "Last name must include at least one letter");
          else clearError("lastName");
          // Cross-field: if last name entered but first name missing
          if (value && (!formData.firstName || formData.firstName.trim() === "")) {
            setError("firstName", "Please enter first name before last name");
          }
          break;
        }
        // username removed - validation not needed here
        case "email":
          if (!validateEmail(value)) setError("email", "Valid Gmail address is required (example@gmail.com)");
          else clearError("email");
          break;
        case "phone":
          if (!validatePhone(value)) setError("phone", "Phone must be 10 digits");
          else clearError("phone");
          break;
        case "password":
          if (!validatePassword(value)) setError("password", "Password must be 8+ chars with uppercase, number, and special char");
          else clearError("password");
          // also check confirm match
          if (formData.confirmPassword && value !== formData.confirmPassword) setError("confirmPassword", "Passwords do not match");
          else if (formData.confirmPassword && value === formData.confirmPassword) clearError("confirmPassword");
          break;
        case "confirmPassword":
          if (value !== formData.password) setError("confirmPassword", "Passwords do not match");
          else clearError("confirmPassword");
          break;
        case "dateOfBirth":
          if (role === "patient") {
            if (!validateDOB(value)) setError("dateOfBirth", "You must be at least 18 years old");
            else clearError("dateOfBirth");
          }
          break;
        case "experience":
          if (role === "doctor") {
            const num = parseInt(value);
            if (isNaN(num) || num < 0) setError("experience", "Enter a valid number of years");
            else clearError("experience");
          }
          break;
        default:
          break;
      }

      setErrors(newErrors);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      validateField(name, value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors above",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role,
        ...(role === "doctor" && {
          specialization: formData.specialization,
          experience: parseInt(formData.experience) || 0,
        }),
        ...(role === "patient" && {
          dateOfBirth: formData.dateOfBirth,
        }),
      });

      if (result.success) {
        toast({
          title: "Registration Submitted",
          description: "Your registration is pending admin approval. Please check back later.",
        });
        navigate("/login");
      } else {
        toast({
          title: "Registration failed",
          description: result.message,
          variant: "destructive",
        });
      }

      setLoading(false);
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-secondary/5 to-primary/5">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow">
                <Activity className="h-7 w-7" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Account</h1>
            <p className="text-muted-foreground">Join MediConnect as a patient or doctor</p>
          </div>

          <Card className="shadow-xl bg-white rounded-xl overflow-hidden">
            <form onSubmit={handleSubmit} noValidate>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Registration</CardTitle>
                <CardDescription className="text-muted-foreground">Select your role and fill in your details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Role Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      role === "patient"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-secondary hover:border-secondary/80"
                    }`}
                  >
                    <User className={`h-6 w-6 ${role === "patient" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold ${role === "patient" ? "text-primary" : "text-muted-foreground"}`}>
                      Patient
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("doctor")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      role === "doctor"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-secondary hover:border-secondary/80"
                    }`}
                  >
                    <Stethoscope className={`h-6 w-6 ${role === "doctor" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold ${role === "doctor" ? "text-primary" : "text-muted-foreground"}`}>
                      Doctor
                    </span>
                  </button>
                </div>

                {/* Approval Notice for Both Roles */}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Your registration will be reviewed by an admin. You'll receive an approval/rejection notification via email.
                    {role === "doctor" && " Once approved, you can login and update your profile."}
                    {role === "patient" && " Once approved, you can login and book appointments."}
                  </AlertDescription>
                </Alert>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleChange} 
                      onBlur={handleBlur}
                      className={errors.firstName ? "border-destructive" : ""}
                    />
                    {errors.firstName && <p className="text-xs text-destructive font-medium">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleChange} 
                      onBlur={handleBlur}
                      className={errors.lastName ? "border-destructive" : ""}
                    />
                    {errors.lastName && <p className="text-xs text-destructive font-medium">{errors.lastName}</p>}
                  </div>
                </div>

                {/* Username removed: generated automatically from name or email */}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="example@gmail.com"
                    value={formData.email} 
                    onChange={handleChange} 
                    onBlur={handleBlur}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (10 digits)</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    placeholder="9876543210"
                    value={formData.phone} 
                    onChange={handleChange} 
                    onBlur={handleBlur}
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && <p className="text-xs text-destructive font-medium">{errors.phone}</p>}
                </div>

                {/* Doctor-specific fields */}
                {role === "doctor" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization *</Label>
                      <Input 
                        id="specialization" 
                        name="specialization" 
                        value={formData.specialization} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        className={errors.specialization ? "border-destructive" : ""}
                      />
                      {errors.specialization && <p className="text-xs text-destructive font-medium">{errors.specialization}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Experience (years) *</Label>
                      <Input 
                        id="experience" 
                        name="experience" 
                        type="number" 
                        min="0"
                        value={formData.experience} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        className={errors.experience ? "border-destructive" : ""}
                      />
                      {errors.experience && <p className="text-xs text-destructive font-medium">{errors.experience}</p>}
                    </div>
                  </>
                )}
                {/* Patient-specific fields */}
                {role === "patient" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input 
                        id="dateOfBirth" 
                        name="dateOfBirth" 
                        type="date" 
                        value={formData.dateOfBirth} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        className={errors.dateOfBirth ? "border-destructive" : ""}
                      />
                      {errors.dateOfBirth && <p className="text-xs text-destructive font-medium">{errors.dateOfBirth}</p>}
                    </div>
                    {/* Medical history will be provided later in the patient's dashboard */}
                  </>
                )}

                {/* Password */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        name="password" 
                        type="password" 
                        placeholder="Aa1@xxxx"
                        value={formData.password} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        className={errors.password ? "border-destructive" : ""}
                      />
                      {errors.password && <p className="text-xs text-destructive font-medium">{errors.password}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        type="password" 
                        placeholder="Aa1@xxxx"
                        value={formData.confirmPassword} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        className={errors.confirmPassword ? "border-destructive" : ""}
                      />
                      {errors.confirmPassword && <p className="text-xs text-destructive font-medium">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  {/* Password Requirements */}
                  {formData.password && (
                    <div className="text-xs space-y-1 p-2 bg-muted rounded-md">
                      <p className={validatePassword(formData.password) ? "text-green-600 flex items-center gap-1" : "text-muted-foreground flex items-center gap-1"}>
                        {validatePassword(formData.password) ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        8+ chars, 1 uppercase, 1 number, 1 special (@$!%*?&)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3 pt-4">
                <Button type="submit" className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
                {/* Sign In link intentionally hidden on the Register page */}
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  };

  export default Register;
