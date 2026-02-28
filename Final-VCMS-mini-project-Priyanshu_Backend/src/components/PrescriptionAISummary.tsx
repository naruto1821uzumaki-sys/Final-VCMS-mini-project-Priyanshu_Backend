import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import openaiService from "@/services/openaiService";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface PrescriptionSummaryProps {
  medications: any[];
  diagnosis: string;
  treatmentPlan: string;
  followUpRecommendations: string;
}

interface SummaryState {
  summary: string;
  keyPoints: string[];
  recommendations: string[];
}

export const PrescriptionAISummary = ({
  medications,
  diagnosis,
  treatmentPlan,
  followUpRecommendations,
}: PrescriptionSummaryProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      setSummaryError(null);
      const result = await openaiService.summarizePrescription(
        medications,
        diagnosis,
        treatmentPlan,
        followUpRecommendations
      );
      setSummaryData(result);
      setExpanded(true);
      toast({
        title: "Summary Generated",
        description: "AI has analyzed your prescription.",
      });
    } catch (error) {
      console.error("Summary error:", error);
      setSummaryError(error instanceof Error ? error.message : "Could not generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGenerateSummary}
        disabled={loading}
        variant={summaryData ? "secondary" : "default"}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Summary...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            AI Summary
          </>
        )}
      </Button>

      {summaryError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">No summary available</p>
            <p className="mt-0.5 text-xs text-red-600/80">{summaryError}</p>
          </div>
        </div>
      )}

      {summaryData && expanded && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                AI Summary
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "−" : "+"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Main Summary */}
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {summaryData.summary}
              </p>
            </div>

            {/* Key Points */}
            {summaryData.keyPoints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Key Points:</h4>
                <ul className="space-y-2">
                  {summaryData.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {summaryData.recommendations && summaryData.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Recommendations:</h4>
                <ul className="space-y-2">
                  {summaryData.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                AI Generated
              </Badge>
              <Badge variant="outline" className="text-xs">
                For Information
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrescriptionAISummary;
