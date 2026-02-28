import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Heart, Users, Zap, Shield } from "lucide-react";

const AboutUs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Admins don't need this public page
  useEffect(() => {
    if (user?.role === "admin") navigate("/admin", { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/5 to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          About <span className="text-primary">MediConnect</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Revolutionizing healthcare by connecting patients with trusted medical professionals through innovative technology
        </p>
      </div>

      {/* Mission & Vision */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-6 w-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To make quality healthcare accessible to everyone, anytime, anywhere. We believe that technology should bridge the gap between patients and healthcare providers, making medical consultation convenient, affordable, and reliable.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To create a world where every person has access to quality healthcare through innovative digital solutions. We envision a healthcare system that is patient-centric, efficient, and powered by the latest technology.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-10">Why Choose MediConnect?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: "Expert Doctors", description: "Access to verified and experienced medical professionals" },
              { icon: Shield, title: "Secure & Private", description: "Your health data is encrypted and protected" },
              { icon: Zap, title: "Fast Consultation", description: "Quick appointment booking and instant video consultations" },
              { icon: Heart, title: "Patient Care", description: "Comprehensive healthcare solutions tailored to your needs" },
            ].map((feature, idx) => (
              <Card key={idx} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 text-center">
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team */}
        <Card className="border-0 shadow-lg mb-12">
          <CardHeader>
            <CardTitle className="text-center">Our Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center">
              MediConnect is built by a passionate team of healthcare professionals, software engineers, and designers dedicated to transforming the healthcare experience. With combined experience of over 50+ years in healthcare and technology, we're committed to delivering excellence.
            </p>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => navigate("/contact-us")}
          >
            Get in Touch
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
