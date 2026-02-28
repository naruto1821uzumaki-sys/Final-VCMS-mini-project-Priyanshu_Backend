import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Mail, Phone, MapPin, Send } from "lucide-react";
import api from "@/services/api";
import { useNavigate } from "react-router-dom";

export function ContactUs() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Admins don't need this public contact form
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
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/5 to-primary/5">
      {/* Header */}
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Contact Us</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Have a question or need support? We're here to help!
        </p>
      </div>

      {/* Contact Info & Form */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Contact Info Cards */}
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 text-center">
              <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Email</h3>
              <p className="text-muted-foreground text-sm">support@mediconnect.com</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 text-center">
              <Phone className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Phone</h3>
              <p className="text-muted-foreground text-sm">+91 (800) MEDIC HELP</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 text-center">
              <MapPin className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Address</h3>
              <p className="text-muted-foreground text-sm">India</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="border-0 shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <p className="text-green-800 font-semibold mb-2">✓ Thank you for reaching out!</p>
                <p className="text-green-700 text-sm">
                  Your message has been received. Our support team will review it shortly and get back to you.
                </p>
              </div>
            ) : !isAuthenticated ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-blue-800 font-semibold mb-4">Login Required</p>
                <p className="text-blue-700 text-sm mb-4">
                  Please log in to your account to submit a contact request.
                </p>
                <Button onClick={() => navigate("/login")}>Go to Login</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Info Display */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">Name:</span> {user?.name}
                  </p>
                  <p>
                    <span className="font-semibold">Email:</span> {user?.email}
                  </p>
                  <p>
                    <span className="font-semibold">Role:</span> {user?.role?.toUpperCase()}
                  </p>
                </div>

                {/* Problem Type */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Problem Type <span className="text-destructive">*</span>
                  </label>
                  <Select value={formData.problemType} onValueChange={(value) => handleSelectChange("problemType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select problem type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {problemTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Priority</label>
                  <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Subject <span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="subject"
                    placeholder="Brief subject of your issue..."
                    value={formData.subject}
                    onChange={handleInputChange}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">{formData.subject.length}/100 characters</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Description <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    name="description"
                    placeholder="Please provide detailed information about your issue..."
                    value={formData.description}
                    onChange={handleInputChange}
                    maxLength={2000}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/2000 characters
                  </p>
                </div>

                {/* Submit Button */}
                <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                  <Send className="h-4 w-4" />
                  {loading ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Average Response Time */}
        <div className="text-center mt-8 text-muted-foreground">
          <p className="text-sm">⏱️ Average response time: 24-48 hours</p>
        </div>
      </div>
    </div>
  );
}

export default ContactUs;
