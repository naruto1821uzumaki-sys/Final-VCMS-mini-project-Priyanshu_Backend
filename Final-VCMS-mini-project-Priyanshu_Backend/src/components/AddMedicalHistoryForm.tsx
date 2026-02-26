import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import api from "@/services/api";

interface MedicalHistoryFormData {
  condition: string;
  description: string;
  diagnosis: string;
  treatment: string;
  reportFile?: File;
  reportFileName?: string;
}

interface AddMedicalHistoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRecord: (record: MedicalHistoryFormData) => void;
  loading?: boolean;
}

export const AddMedicalHistoryForm = ({
  open,
  onOpenChange,
  onAddRecord,
  loading = false,
}: AddMedicalHistoryFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<MedicalHistoryFormData>({
    condition: "",
    description: "",
    diagnosis: "",
    treatment: "",
  });
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF, images, documents)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload PDF, image, or document files only.",
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

    setReportFile(file);
    setFormData((prev) => ({
      ...prev,
      reportFileName: file.name,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.condition.trim()) {
      toast({
        title: "Error",
        description: "Please enter a health condition.",
        variant: "destructive",
      });
      return;
    }

    try {
      const dataToSubmit = { ...formData };

      if (reportFile) {
        // Upload file separately
        const fileFormData = new FormData();
        fileFormData.append("file", reportFile);
        const fileRes = await api.post("/medical-history/upload-report", fileFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        dataToSubmit.reportFileName = fileRes.data.fileName;
      }

      onAddRecord(dataToSubmit);

      // Reset form
      setFormData({
        condition: "",
        description: "",
        diagnosis: "",
        treatment: "",
      });
      setReportFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to add medical history record.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Medical History Record</DialogTitle>
          <DialogDescription>
            Document your health conditions, treatments, and attach medical reports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Health Condition */}
          <div className="space-y-2">
            <Label htmlFor="condition" className="font-semibold">
              Health Condition *
            </Label>
            <Input
              id="condition"
              placeholder="e.g., Stomach pain, Back pain, Diabetes, High BP"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Describe the health issue you experienced
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Details about when it started, symptoms, duration, etc."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis" className="font-semibold">
              Diagnosis
            </Label>
            <Input
              id="diagnosis"
              placeholder="Doctor's diagnosis (if available)"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="text-sm"
            />
          </div>

          {/* Treatment */}
          <div className="space-y-2">
            <Label htmlFor="treatment" className="font-semibold">
              Treatment/Medication
            </Label>
            <Textarea
              id="treatment"
              placeholder="Medications taken, procedures done, or self-care measures"
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="font-semibold">Attach Medical Report (Optional)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag file</p>
                <p className="text-xs text-muted-foreground">PDF, images, or documents (max 10MB)</p>
              </div>
            </div>
            
            {reportFile && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">{reportFile.name}</span>
                  </div>
                  <button
                    onClick={() => setReportFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Box */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                You can add multiple health conditions separately. Each entry will be stored with date and time.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMedicalHistoryForm;
