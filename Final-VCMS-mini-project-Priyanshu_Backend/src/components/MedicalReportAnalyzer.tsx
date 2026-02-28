import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import openaiService from "@/services/openaiService";
import { FileText, Upload, Loader2, Download, X, AlertCircle, Brain } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ReportAnalysis {
  fileName: string;
  extractedText: string;
  analysis: {
    summary: string;
    keyPoints: string[];
    recommendations: string[];
    aiPowered?: boolean;
  };
  analyzedAt: string;
}

export const MedicalReportAnalyzer = () => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [analysis, setAnalysis] = useState<ReportAnalysis | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPG, PNG, or PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setOcrError(null);
  };

  const handleDragAndDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const event = { target: { files: [file] } } as any;
      handleFileSelect(event);
    }
  };

  const handleAnalyzeReport = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a report file first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Step 1: Extract text from image/PDF
      setExtracting(true);
      const extractedTextResult = await openaiService.extractTextFromImage(selectedFile);
      setExtractedText(extractedTextResult);

      // Guard: nothing to analyze if extraction yielded no text
      if (!extractedTextResult || extractedTextResult.trim().length < 10) {
        setOcrError("No readable text found in this file. For images, ensure the scan is clear and well-lit. For PDFs, make sure the document contains selectable text (not a scanned/image-only PDF).");
        return;
      }

      // Step 2: Analyze extracted text
      setExtracting(false);
      setAnalyzing(true);
      const analysisResult = await openaiService.analyzeReport(extractedTextResult);

      // Store analysis with file info
      const reportAnalysis: ReportAnalysis = {
        fileName: selectedFile.name,
        extractedText: extractedTextResult,
        analysis: analysisResult,
        analyzedAt: new Date().toLocaleString(),
      };

      setAnalysis(reportAnalysis);
      setShowDialog(true);
      toast({
        title: "Analysis Complete",
        description: analysisResult.aiPowered === false
          ? "Report extracted and analyzed with smart keyword detection."
          : "Report has been analyzed successfully by AI.",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      setOcrError(error instanceof Error ? error.message : "Could not analyze report. Please try again.");
    } finally {
      setLoading(false);
      setExtracting(false);
      setAnalyzing(false);
    }
  };

  const handleDownloadAnalysis = () => {
    if (!analysis) return;

    const content = `
Medical Report Analysis

File: ${analysis.fileName}
Analyzed At: ${analysis.analyzedAt}

EXTRACTED TEXT:
${analysis.extractedText}

AI ANALYSIS:
${analysis.analysis.summary}

KEY POINTS:
${analysis.analysis.keyPoints.map((p) => `• ${p}`).join("\n")}

RECOMMENDATIONS:
${analysis.analysis.recommendations.map((r) => `• ${r}`).join("\n")}

---
This is an AI-generated analysis and should be reviewed by a medical professional.
    `.trim();

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute("download", `report-analysis-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <>
      <div className="p-5 space-y-4">
          {/* File Upload Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDragAndDrop}
            className="border-2 border-dashed border-border rounded-2xl p-8 hover:border-primary/60 hover:bg-accent/30 transition-all cursor-pointer group"
          >
            <input
              type="file"
              id="report-upload"
              onChange={handleFileSelect}
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <label
              htmlFor="report-upload"
              className="flex flex-col items-center justify-center gap-3 cursor-pointer"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Click to upload or drag &amp; drop</p>
                <p className="text-sm text-muted-foreground mt-0.5">JPG, PNG or PDF — max 10 MB</p>
              </div>
            </label>
          </div>

          {/* Inline OCR / analysis error */}
          {ocrError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
              <div>
                <p className="font-semibold">No text — no summary available</p>
                <p className="mt-0.5 text-red-600/80">{ocrError}</p>
              </div>
            </div>
          )}

          {/* Selected File Display */}
          {selectedFile && (
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={() => setSelectedFile(null)} className="h-7 w-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 transition-colors">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyzeReport}
            disabled={loading || !selectedFile}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {extracting
                  ? "Extracting Text..."
                  : analyzing
                  ? "Analyzing..."
                  : "Processing..."}
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Analyze Report
              </>
            )}
          </Button>

          {/* Info Box */}
          <div className="flex gap-3 rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              AI analysis is for informational purposes only. Always consult your doctor for medical advice.
              {" "}When OpenAI API key is configured, full GPT-powered analysis will be available.
            </p>
          </div>
        </div>

      {/* Analysis Result Dialog */}
      {analysis && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                Report Analysis Results
                {analysis.analysis.aiPowered === false ? (
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Smart Analysis</span>
                ) : (
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">AI-Powered</span>
                )}
              </DialogTitle>
              <DialogDescription>
                {analysis.fileName} • {analysis.analyzedAt}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="font-semibold text-base mb-2">Summary</h3>
                <p className="text-sm text-foreground leading-relaxed">
                  {analysis.analysis.summary}
                </p>
              </div>

              {/* Key Points */}
              <div>
                <h3 className="font-semibold text-base mb-2">Key Findings</h3>
                <div className="space-y-2">
                  {analysis.analysis.keyPoints.map((point, idx) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
                      <p className="text-sm text-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {analysis.analysis.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base mb-2">Recommendations</h3>
                  <div className="space-y-2">
                    {analysis.analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex gap-3 p-3 rounded-xl bg-secondary/5 border border-secondary/15">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
                        <p className="text-sm text-foreground">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Text (Collapsed) */}
              <details className="border border-border rounded-xl p-3 bg-muted/30">
                <summary className="font-semibold text-sm cursor-pointer text-muted-foreground">View Extracted Text</summary>
                <pre className="mt-3 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48 text-foreground">
                  {analysis.extractedText}
                </pre>
              </details>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Close
              </Button>
              <Button onClick={handleDownloadAnalysis}>
                <Download className="h-4 w-4 mr-2" />
                Download Analysis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default MedicalReportAnalyzer;
