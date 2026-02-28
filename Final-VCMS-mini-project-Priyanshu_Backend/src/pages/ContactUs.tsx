import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Phone, MapPin, Send, Clock, CheckCircle, MessageSquare, HeadphonesIcon } from "lucide-react";
import api from "@/services/api";
import { useNavigate } from "react-router-dom";

const ContactUs = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Admins don't need this public-facing contact form
  useEffect(() => {
    if (user?.role === "admin") navigate("/admin", { replace: true });
  }, [user, navigate]);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    problemType: "",
    subject: "",
    description: "",
    priority: "medium",
  });

  const problemTypes = [
    { value: "technical-issue", label: "🔧 Technical Issue" },
    { value: "payment-issue", label: "💳 Payment Issue" },
    { value: "account-issue", label: "👤 Account Issue" },
    { value: "appointment-issue", label: "📅 Appointment Issue" },
    { value: "medical-concern", label: "⚕️ Medical Concern" },
    { value: "feedback", label: "💬 Feedback" },
    { value: "other", label: "❓ Other" },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to submit a contact request.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const subject = formData.subject.trim();
    const description = formData.description.trim();

    if (!formData.problemType || !subject || !description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (subject.length < 5 || subject.length > 100) {
      toast({
        title: "Invalid Subject",
        description: "Subject must be between 5 and 100 characters.",
        variant: "destructive",
      });
      return;
    }

    if (description.length < 10 || description.length > 2000) {
      toast({
        title: "Invalid Description",
        description: "Description must be between 10 and 2000 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/contact/submit", {
        ...formData,
        subject,
        description,
      });

      if (res.data?.success) {
        toast({
          title: "Success!",
          description: res.data.message,
        });
        setSubmitted(true);
        setFormData({
          problemType: "",
          subject: "",
          description: "",
          priority: "medium",
        });

        // Reset form after 3 seconds
        setTimeout(() => {
          setSubmitted(false);
        }, 3000);
      }
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.response?.data?.message || "Failed to submit contact form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 rounded-full px-4 py-1.5 mb-6">
            <HeadphonesIcon className="h-4 w-4 text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">Support Center</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">How can we help?</h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Send us a message and our support team will get back to you within 24–48 hours.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left sidebar — info cards */}
          <div className="space-y-4">
            {[
              { icon: Mail,  label: "Email Us",       value: "support@mediconnect.com",  color: "text-blue-600",   bg: "bg-blue-50" },
              { icon: Phone, label: "Call Us",        value: "+91 (800) MEDIC HELP",     color: "text-green-600",  bg: "bg-green-50" },
              { icon: MapPin,label: "Our Location",   value: "India",                    color: "text-violet-600", bg: "bg-violet-50" },
              { icon: Clock, label: "Response Time",  value: "24–48 hours",              color: "text-amber-600",  bg: "bg-amber-50" },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className="text-slate-800 font-medium text-sm mt-0.5">{value}</p>
                </div>
              </div>
            ))}

            {/* FAQ hint */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
              <MessageSquare className="h-7 w-7 text-blue-200 mb-3" />
              <h3 className="font-bold mb-1">Common Questions</h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                Issues with login, appointments, or prescriptions are typically resolved within 2 hours.
              </p>
            </div>
          </div>

          {/* Right – form card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-md p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Message Sent!</h2>
                <p className="text-slate-500 max-w-sm">
                  Thank you for reaching out. Our support team will review your request and respond within 24–48 hours.
                </p>
              </div>
            ) : !isAuthenticated ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                  <Mail className="h-10 w-10 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Login Required</h2>
                <p className="text-slate-500 mb-6">Please login to your account to submit a support request.</p>
                <button
                  onClick={() => navigate("/login")}
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Submit a Support Request</h2>
                  <p className="text-slate-500 text-sm">All fields marked * are required.</p>
                </div>

                {/* User identity banner */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{user?.name}</p>
                    <p className="text-slate-500 text-xs">{user?.email} · <span className="capitalize">{user?.role}</span></p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Problem Type */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Problem Type <span className="text-red-500">*</span></label>
                      <Select value={formData.problemType} onValueChange={(v) => handleSelectChange("problemType", v)}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
                          <SelectValue placeholder="Select problem type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {problemTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Priority</label>
                      <Select value={formData.priority} onValueChange={(v) => handleSelectChange("priority", v)}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            { value: "low",    label: "🟢 Low" },
                            { value: "medium", label: "🟡 Medium" },
                            { value: "high",   label: "🟠 High" },
                            { value: "urgent", label: "🔴 Urgent" },
                          ].map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Subject <span className="text-red-500">*</span></label>
                    <Input
                      name="subject"
                      placeholder="Brief subject of your issue..."
                      value={formData.subject}
                      onChange={handleInputChange}
                      maxLength={100}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-400">{formData.subject.length}/100</p>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Description <span className="text-red-500">*</span></label>
                    <Textarea
                      name="description"
                      placeholder="Please provide detailed information about your issue..."
                      value={formData.description}
                      onChange={handleInputChange}
                      maxLength={2000}
                      rows={6}
                      className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 resize-none"
                    />
                    <p className="text-xs text-slate-400">{formData.description.length}/2000</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-70"
                  >
                    {loading ? (
                      <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Submit Request</>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
