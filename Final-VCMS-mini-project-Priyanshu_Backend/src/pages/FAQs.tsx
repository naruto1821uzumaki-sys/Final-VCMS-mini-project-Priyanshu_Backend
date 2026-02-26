import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQs = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I book an appointment with a doctor?",
      answer:
        "You can book an appointment by visiting the Doctors page, selecting a doctor based on specialization and availability, choosing your preferred time slot, and confirming the booking. The doctor will receive your appointment request and confirm it.",
    },
    {
      question: "Is my medical information safe and secure?",
      answer:
        "Yes, we take security very seriously. All medical data is encrypted using industry-standard security protocols. Your information is protected by HIPAA-compliant systems and is never shared without your consent.",
    },
    {
      question: "Can I reschedule or cancel my appointment?",
      answer:
        "Yes, you can reschedule or cancel appointments from your dashboard. We recommend canceling at least 24 hours before your appointment to avoid any cancellation fees.",
    },
    {
      question: "How do video consultations work?",
      answer:
        "Video consultations are conducted through our secure video platform. Once your appointment time arrives, you'll receive a link to join the consultation. Ensure you have a stable internet connection and a camera/microphone.",
    },
    {
      question: "What if I miss my appointment?",
      answer:
        "If you miss an appointment, it will be marked as no-show. We recommend setting reminders for your appointment times. Repeated no-shows may affect your account status.",
    },
    {
      question: "How do I get my medical prescriptions?",
      answer:
        "After a consultation, your doctor will provide prescriptions through the platform. You can view, download, and print your prescriptions from your Medical Prescriptions section. You can also send them directly to your pharmacy.",
    },
    {
      question: "What specializations of doctors are available?",
      answer:
        "We have doctors from various specializations including Cardiology, General Medicine, Dermatology, Orthopedics, Pediatrics, Neurology, Psychiatry, and many more. You can filter doctors by specialization on our Doctors page.",
    },
    {
      question: "How are doctors verified on MediConnect?",
      answer:
        "All doctors on our platform are verified medical professionals with valid licenses and credentials. We conduct thorough background checks and verification before onboarding any healthcare provider.",
    },
    {
      question: "What should I do if I have a technical issue during consultation?",
      answer:
        "If you experience technical issues, you can contact our support team through the Contact Us page. If internet connectivity is the issue, please check your connection and try reconnecting. We recommend testing your connection before the consultation.",
    },
    {
      question: "How can I provide feedback or report an issue?",
      answer:
        "We'd love to hear from you! You can use the Contact Us page to submit feedback, report issues, or request features. Our support team will review your inquiry and respond promptly.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/5 to-primary/5">
      {/* Header */}
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex justify-center mb-4">
          <HelpCircle className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about MediConnect services
        </p>
      </div>

      {/* FAQs */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card
              key={index}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-left text-base flex-1">{faq.question}</CardTitle>
                  <button className="ml-4 flex-shrink-0">
                    {openIndex === index ? (
                      <ChevronUp className="h-5 w-5 text-primary" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </CardHeader>
              {openIndex === index && (
                <CardContent className="pt-0">
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Still Have Questions */}
        <Card className="border-0 shadow-lg mt-12 bg-primary/5">
          <CardContent className="pt-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Can't find the answer you're looking for? Our support team is here to help. Get in touch with us!
            </p>
            <Button onClick={() => navigate("/contact-us")} size="lg">
              Contact support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQs;
