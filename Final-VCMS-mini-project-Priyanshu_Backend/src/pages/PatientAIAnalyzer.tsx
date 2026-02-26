import { ScanLine, Brain, Upload, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MedicalReportAnalyzer from "@/components/MedicalReportAnalyzer";

const PatientAIAnalyzer = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-4 md:p-6 space-y-5">
      {/* Hero — matches Prescriptions page pattern */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 shadow-lg border border-primary/20">
        <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-primary-foreground/80 text-sm font-medium">AI Tools 🤖</p>
              <span className="text-xs bg-white/20 text-primary-foreground px-2 py-0.5 rounded-full font-semibold">BETA</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">AI Report Analyzer</h1>
            <p className="text-primary-foreground/70 mt-1 text-sm">Upload any medical report — OCR extracts text and AI gives you a clear summary.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-bold text-primary-foreground">PDF</p>
              <p className="text-primary-foreground/70 text-xs mt-0.5">PNG · JPG</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-bold text-primary-foreground">10 MB</p>
              <p className="text-primary-foreground/70 text-xs mt-0.5">Max size</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works — 3 step cards in a row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Upload, step: "1", title: "Upload Report", desc: "PDF, PNG or JPG up to 10 MB", color: "bg-primary/10 text-primary" },
          { icon: ScanLine, step: "2", title: "OCR Extraction", desc: "Text extracted automatically", color: "bg-primary/10 text-primary" },
          { icon: Sparkles, step: "3", title: "AI Summary", desc: "Key findings & recommendations", color: "bg-secondary/10 text-secondary" },
        ].map((item) => (
          <div key={item.step} className="rounded-2xl border border-border bg-white shadow-sm p-3 md:p-4 flex flex-col items-center text-center gap-2">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground leading-tight">{item.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analyzer card */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-border bg-white">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/40">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground leading-none">Upload &amp; Analyse</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Select your report to get started</p>
          </div>
        </div>
        <MedicalReportAnalyzer />
      </div>
    </div>
  );
};

export default PatientAIAnalyzer;
