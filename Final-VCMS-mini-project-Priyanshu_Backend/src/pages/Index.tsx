import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Activity, ArrowRight, Shield, Video, Brain, Stethoscope,
  CalendarDays, FileText, Star, CheckCircle, Users, Clock,
  Zap, Heart, Lock, ChevronRight,
} from "lucide-react";

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 mx-auto flex items-center justify-center animate-pulse">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <p className="text-slate-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { value: "500+", label: "Registered Doctors" },
    { value: "10k+", label: "Patients Served" },
    { value: "50k+", label: "Consultations Done" },
    { value: "4.9★", label: "Average Rating" },
  ];

  const features = [
    {
      icon: Shield,
      title: "Bank-Grade Security",
      desc: "End-to-end encrypted data with role-based access control for patients, doctors, and admins.",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: CalendarDays,
      title: "Smart Appointments",
      desc: "Book, reschedule, or cancel appointments in seconds. Real-time availability every time.",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      icon: Video,
      title: "Video Consultations",
      desc: "WebRTC-powered peer-to-peer video calls. No downloads, no plugins — just open and connect.",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      icon: FileText,
      title: "Digital Prescriptions",
      desc: "Doctors issue prescriptions instantly during the call. Patients access them on any device.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Brain,
      title: "AI Report Analyzer",
      desc: "Upload medical reports and get AI-powered summaries in plain language — no medical jargon.",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: Stethoscope,
      title: "Find Specialists",
      desc: "Browse verified doctors by specialization, location, and availability. Book in one tap.",
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
  ];

  const steps = [
    { step: "01", title: "Create Your Account", desc: "Sign up as a patient or doctor in under 2 minutes." },
    { step: "02", title: "Find a Doctor", desc: "Browse specialists by symptom, specialization, or location." },
    { step: "03", title: "Book & Consult", desc: "Pick a slot and connect via video consultation." },
    { step: "04", title: "Get Your Prescription", desc: "Receive a digital prescription and AI-powered health summary." },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - text */}
            <div className="text-white space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-medium">
                <Zap className="h-3.5 w-3.5" />
                India's Modern Virtual Clinic
              </div>
              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight">
                Healthcare{" "}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                  Reimagined
                </span>{" "}
                for 2025
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-lg">
                Connect with verified doctors via video consultation, get digital prescriptions, upload medical reports for AI analysis — all from your browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white border-0 h-14 px-8 text-base font-semibold shadow-xl shadow-blue-500/25 gap-2"
                  asChild
                >
                  <Link to="/register">
                    Get Started Free <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-base font-semibold border-white/20 text-white hover:bg-white/10 gap-2"
                  asChild
                >
                  <Link to="/login">Sign In <ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Free to join · No credit card required
              </div>
            </div>

            {/* Right side - hero cards */}
            <div className="hidden lg:flex items-center justify-center relative">
              <div className="relative w-full max-w-sm space-y-4">
                {/* Patient card */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold">P</div>
                    <div>
                      <p className="text-white font-semibold text-sm">Dr. Rajesh Kumar</p>
                      <p className="text-slate-400 text-xs">Cardiologist · Available Now</p>
                    </div>
                    <div className="ml-auto h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs h-8">Book ₹500</Button>
                    <Button size="sm" variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10 text-xs h-8"><Video className="h-3 w-3 mr-1" /> Video</Button>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  ✓ Verified Doctor
                </div>
                {/* Prescription preview */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-2xl ml-8">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-violet-300" />
                    <p className="text-white text-sm font-semibold">Digital Prescription</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-white/20 rounded-full w-full" />
                    <div className="h-2 bg-white/20 rounded-full w-3/4" />
                    <div className="h-2 bg-white/15 rounded-full w-1/2" />
                  </div>
                  <p className="text-violet-300 text-xs mt-3">AI Summary available →</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-10">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-extrabold text-white">{value}</p>
                <p className="text-slate-400 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-16 space-y-4">
            <p className="text-primary font-semibold text-sm tracking-widest uppercase">Why MediConnect</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Everything for modern healthcare
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              One platform for patients, doctors, and administrators — built for speed, security, and simplicity.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                <div className={`h-12 w-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="text-slate-900 font-bold text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-16 space-y-4">
            <p className="text-primary font-semibold text-sm tracking-widest uppercase">Simple Process</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">How it works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-5xl font-black text-slate-100 mb-3 select-none">{step}</div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gradient-to-br from-primary via-blue-600 to-violet-700">
        <div className="container mx-auto px-4 text-center space-y-8 max-w-2xl">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Your health, on your terms
          </h2>
          <p className="text-white/80 text-lg">
            Join thousands of patients and doctors who trust MediConnect for seamless virtual healthcare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 h-14 px-8 font-bold text-base shadow-xl gap-2" asChild>
              <Link to="/register">Get Started Free <ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 font-semibold text-base border-white/30 text-white hover:bg-white/10" asChild>
              <Link to="/guest-booking">Browse as Guest</Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-white/70 text-sm">
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Secured & Private</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> No Credit Card</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Free to Join</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 text-slate-400 py-10">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <Activity className="h-5 w-5 text-blue-400" />
            MediConnect
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
          <p className="text-xs text-slate-600">© 2025 MediConnect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
