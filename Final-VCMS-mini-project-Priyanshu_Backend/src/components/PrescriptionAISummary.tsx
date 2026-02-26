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

  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
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
      toast({
        title: "Error",
        description: "Could not generate summary. Please try again.",
        variant: "destructive",
      });
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
