import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import openaiService from "@/services/openaiService";
import { FileText, Upload, Loader2, Download, X, AlertCircle, Brain, CheckCircle2, Clock, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ReportAnalysis {
  fileName: string;
  fileSize: string;
  extractedText: string;
  analysis: {
    summary: string;
    keyPoints: string[];
    recommendations: string[];
    aiPowered?: boolean;
  };
  isMedical: boolean;
  analyzedAt: string;
}

interface QueueItem {
  file: File;
  status: "pending" | "extracting" | "analyzing" | "done" | "error";
  error?: string;
  result?: ReportAnalysis;
}

// Heuristic: check if extracted text looks like medical content
const isMedicalContent = (text: string): boolean => {
  const t = text.toLowerCase();
  const medicalKeywords = [
    "patient", "diagnosis", "prescription", "mg", "dosage", "doctor", "dr.",
    "hospital", "clinic", "blood", "test", "report", "lab", "result",
    "hemoglobin", "glucose", "cholesterol", "bp", "ecg", "mri", "ct scan",
    "x-ray", "ultrasound", "biopsy", "symptom", "treatment", "medicine",
    "tablet", "injection", "surgery", "medical", "health", "disease",
    "infection", "inflammation", "fever", "pain", "weight", "height", "bmi",
    "platelet", "wbc", "rbc", "urine", "serum", "creatinine", "thyroid",
  ];
  const matchCount = medicalKeywords.filter((kw) => t.includes(kw)).length;
  return matchCount >= 2;
};

export const MedicalReportAnalyzer = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [viewingResult, setViewingResult] = useState<ReportAnalysis | null>(null);
  const [expandedText, setExpandedText] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) return "Only JPG, PNG or PDF allowed.";
    if (file.size > 10 * 1024 * 1024) return "File must be under 10 MB.";
    return null;
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newItems: QueueItem[] = [];
    for (const file of arr) {
      const err = validateFile(file);
      if (err) {
        toast({ title: `Skipped: ${file.name}`, description: err, variant: "destructive" });
        continue;
      }
      // Avoid exact duplicates in queue
      const alreadyIn = queue.some((q) => q.file.name === file.name && q.file.size === file.size);
      if (!alreadyIn) newItems.push({ file, status: "pending" });
    }
    if (newItems.length) setQueue((prev) => [...prev, ...newItems]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = ""; // allow selecting same file again
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const removeFromQueue = (idx: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== idx));
  };

  const analyzeAll = async () => {
    const pending = queue.filter((q) => q.status === "pending" || q.status === "error");
    if (!pending.length) {
      toast({ title: "Nothing to analyze", description: "Add files first." });
      return;
    }

    setProcessing(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== "pending" && item.status !== "error") continue;

      // Mark extracting
      setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "extracting" } : q));

      try {
        const extractedText = await openaiService.extractTextFromImage(item.file);

        if (!extractedText || extractedText.trim().length < 10) {
          setQueue((prev) => prev.map((q, idx) => idx === i
            ? { ...q, status: "error", error: "No readable text found. Ensure clear scan or selectable PDF text." }
            : q));
          continue;
        }

        // Medical content gate
        const medical = isMedicalContent(extractedText);

        // Mark analyzing
        setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "analyzing" } : q));

        const analysisResult = await openaiService.analyzeReport(extractedText);

        const result: ReportAnalysis = {
          fileName: item.file.name,
          fileSize: (item.file.size / 1024 / 1024).toFixed(2) + " MB",
          extractedText,
          analysis: analysisResult,
          isMedical: medical,
          analyzedAt: new Date().toLocaleString(),
        };

        setQueue((prev) => prev.map((q, idx) => idx === i
          ? { ...q, status: "done", result }
          : q));

      } catch (err: any) {
        setQueue((prev) => prev.map((q, idx) => idx === i
          ? { ...q, status: "error", error: err.message || "Analysis failed." }
          : q));
      }
    }

    setProcessing(false);
    toast({ title: "Analysis complete", description: "All reports processed." });
  };

  const handleDownload = (result: ReportAnalysis) => {
    const content = `
Medical Report Analysis
=======================
File: ${result.fileName}
Analyzed At: ${result.analyzedAt}
Medical Content: ${result.isMedical ? "Yes" : "Non-medical / unclear"}

SUMMARY:
${result.analysis.summary}

KEY FINDINGS:
${result.analysis.keyPoints.map((p) => `â€¢ ${p}`).join("\n")}

RECOMMENDATIONS:
${result.analysis.recommendations.map((r) => `â€¢ ${r}`).join("\n")}

EXTRACTED TEXT:
${result.extractedText}

---
AI-generated analysis. Always consult a qualified medical professional.
    `.trim();

    const el = document.createElement("a");
    el.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
    el.download = `report-analysis-${Date.now()}.txt`;
    el.click();
  };

  const pendingCount = queue.filter((q) => q.status === "pending" || q.status === "error").length;
  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <>
      <div className="p-5 space-y-5">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer group ${
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-accent/30"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            accept=".jpg,.jpeg,.png,.pdf"
          />
          <div className="flex flex-col items-center justify-center gap-3">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
              isDragOver ? "bg-primary/20" : "bg-primary/10 group-hover:bg-primary/20"
            }`}>
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Click to upload or drag &amp; drop</p>
              <p className="text-sm text-muted-foreground mt-0.5">JPG, PNG or PDF â€” max 10 MB each â€” multiple files supported</p>
            </div>
          </div>
        </div>

        {/* File Queue */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Files ({queue.length}) â€” {doneCount} analyzed
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7"
                onClick={() => setQueue([])}
                disabled={processing}
              >
                Clear all
              </Button>
            </div>
            {queue.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                item.status === "done" ? "border-green-200 bg-green-50/50" :
                item.status === "error" ? "border-red-200 bg-red-50/50" :
                item.status === "extracting" || item.status === "analyzing" ? "border-primary/20 bg-primary/5" :
                "border-border bg-muted/20"
              }`}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-border">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    {item.status === "extracting" && " Â· Extracting text..."}
                    {item.status === "analyzing" && " Â· AI analyzing..."}
                    {item.status === "done" && ` Â· Done ${item.result?.isMedical ? "âœ“ Medical" : "âš  Non-medical"}`}
                    {item.status === "error" && ` Â· Error: ${item.error}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(item.status === "extracting" || item.status === "analyzing") && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {item.status === "done" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                      onClick={() => { setExpandedText(false); setViewingResult(item.result!); }}
                    >
                      View
                    </Button>
                  )}
                  {item.status === "error" && pendingCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-amber-600"
                      onClick={() => setQueue((prev) => prev.map((q, i) => i === idx ? { ...q, status: "pending", error: undefined } : q))}
                    >
                      Retry
                    </Button>
                  )}
                  <button
                    disabled={item.status === "extracting" || item.status === "analyzing"}
                    onClick={() => removeFromQueue(idx)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 border border-transparent transition-colors disabled:opacity-30"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analyze Button */}
        <Button
          onClick={analyzeAll}
          disabled={processing || pendingCount === 0}
          className="w-full"
          size="lg"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Analyze {pendingCount > 0 ? `${pendingCount} Report${pendingCount > 1 ? "s" : ""}` : "Reports"}
            </>
          )}
        </Button>

        {/* Info Box */}
        <div className="flex gap-3 rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            AI analysis is for informational purposes only. Always consult your doctor for medical advice.
            Upload multiple reports at once â€” they'll be processed one by one.
          </p>
        </div>
      </div>

      {/* Analysis Result Dialog */}
      {viewingResult && (
        <Dialog open={!!viewingResult} onOpenChange={(open) => !open && setViewingResult(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                Report Analysis
                {!viewingResult.isMedical && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    âš  Non-medical content detected
                  </span>
                )}
                {viewingResult.isMedical && viewingResult.analysis.aiPowered !== false && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    AI-Powered
                  </span>
                )}
                {viewingResult.analysis.aiPowered === false && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Smart Analysis
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {viewingResult.fileName} ({viewingResult.fileSize}) Â· {viewingResult.analyzedAt}
              </DialogDescription>
            </DialogHeader>

            {!viewingResult.isMedical && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <p>
                  This document does not appear to contain medical content. The analysis below may not be medically relevant.
                  For accurate results, upload lab reports, prescriptions, discharge summaries, or imaging reports.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {/* Summary */}
              <div className="rounded-xl border border-border bg-accent/30 p-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Summary</h3>
                <p className="text-sm text-foreground leading-relaxed">{viewingResult.analysis.summary}</p>
              </div>

              {/* Key Findings */}
              {viewingResult.analysis.keyPoints.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Key Findings</h3>
                  <div className="space-y-2">
                    {viewingResult.analysis.keyPoints.map((point, idx) => (
                      <div key={idx} className="flex gap-3 p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-500/20 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
                        <p className="text-sm text-foreground">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {viewingResult.analysis.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Recommendations</h3>
                  <div className="space-y-2">
                    {viewingResult.analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex gap-3 p-3 rounded-xl bg-green-50/70 border border-green-100">
                        <CheckCircle2 className="flex-shrink-0 h-4 w-4 text-green-600 mt-0.5" />
                        <p className="text-sm text-foreground">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Text (Collapsible) */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
                  onClick={() => setExpandedText((p) => !p)}
                >
                  <span className="text-muted-foreground">Extracted Text</span>
                  {expandedText ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {expandedText && (
                  <pre className="text-xs bg-muted/20 p-4 overflow-auto max-h-48 text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {viewingResult.extractedText}
                  </pre>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setViewingResult(null)}>Close</Button>
              <Button onClick={() => handleDownload(viewingResult)}>
                <Download className="h-4 w-4 mr-2" /> Download Analysis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default MedicalReportAnalyzer;
