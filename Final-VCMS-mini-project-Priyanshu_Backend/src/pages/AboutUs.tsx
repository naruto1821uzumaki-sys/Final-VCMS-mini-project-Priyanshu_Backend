import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Heart, Users, Zap, Shield, Activity, CheckCircle, Star, Code2 } from "lucide-react";

const AboutUs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === "admin") navigate("/admin", { replace: true });
  }, [user, navigate]);

  const values = [
    {
      icon: Heart,
      title: "Patient-First",
      desc: "Every decision we make is centred around improving patient outcomes and experiences.",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      desc: "Your health data is encrypted, private, and never sold to third parties.",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Zap,
      title: "Speed & Reliability",
      desc: "Real-time video, instant prescriptions, and lightning-fast appointment booking.",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: Users,
      title: "Verified Professionals",
      desc: "All doctors are manually verified before joining the MediConnect platform.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  const stats = [
    { value: "500+", label: "Verified Doctors" },
    { value: "10k+", label: "Happy Patients" },
    { value: "50k+", label: "Consultations" },
    { value: "99.9%", label: "Uptime" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 py-24 px-4">
        <div className="container mx-auto max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-medium">
            <Activity className="h-3.5 w-3.5" />
            About MediConnect
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Healthcare reimagined for the{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">digital age</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mx-auto">
            MediConnect is a full-stack virtual clinic platform built to connect patients with verified doctors through secure video consultations, digital prescriptions, and AI-powered report analysis.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate-50 border-b border-slate-200 py-12 px-4">
        <div className="container mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-extrabold text-slate-900">{value}</p>
              <p className="text-slate-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl grid md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center">
              <Heart className="h-6 w-6 text-rose-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Our Mission</h2>
            <p className="text-slate-500 leading-relaxed">
              To make quality healthcare accessible to everyone — anytime, anywhere. We bridge the gap between patients and healthcare providers using the best of modern technology, so no one has to delay getting the care they need.
            </p>
          </div>
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Our Vision</h2>
            <p className="text-slate-500 leading-relaxed">
              A world where every patient receives timely, personalized medical care from verified professionals — without geographical or financial barriers. We're building the future of healthcare, one consultation at a time.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14 space-y-3">
            <p className="text-primary font-semibold text-sm tracking-widest uppercase">What We Stand For</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className={`h-12 w-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto">
            <Code2 className="h-7 w-7 text-violet-600" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Built with Modern Tech</h2>
          <p className="text-slate-500 leading-relaxed max-w-2xl mx-auto">
            MediConnect is built on a MERN stack (MongoDB, Express, React, Node.js) with real-time features via Socket.io, peer-to-peer video via WebRTC, AI-powered analysis, and enterprise-grade security.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {["React 18", "Node.js", "MongoDB", "Socket.io", "WebRTC", "Tailwind CSS", "TypeScript", "JWT Auth"].map((tech) => (
              <span key={tech} className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold border border-slate-200">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary via-blue-600 to-violet-700">
        <div className="container mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Ready to get started?</h2>
          <p className="text-white/80 text-lg">Join thousands of patients and doctors on MediConnect today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-8 font-bold gap-2" onClick={() => navigate("/register")}>
              Create Account <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold border-white/30 text-white hover:bg-white/10" onClick={() => navigate("/contact-us")}>
              Contact Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
