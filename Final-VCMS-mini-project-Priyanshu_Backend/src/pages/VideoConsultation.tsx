import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import useSocket from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { PrescriptionAISummary } from "@/components/PrescriptionAISummary";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, FileText, Loader,
  Plus, Trash2, CheckCircle, Clock, RefreshCw, Sparkles,
  ClipboardList, User, Stethoscope, CalendarDays, ChevronDown, ChevronUp
} from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  refills: number;
  sideEffects: string[];
}

interface PrescriptionFormData {
  diagnosis: string;
  clinicalNotes: string;
  treatmentPlan: string;
  followUpDate: string;
  followUpRecommendations: string;
  validUntil: string;
  medications: Medication[];
}

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const VideoConsultation = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { on, off, emit, joinRoom } = useSocket();

  const [appointment, setAppointment] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<any>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [rxSubmitting, setRxSubmitting] = useState(false);
  const [prescriptionExpanded, setPrescriptionExpanded] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);
  const [rxForm, setRxForm] = useState<PrescriptionFormData>({
    diagnosis: "",
    clinicalNotes: "",
    treatmentPlan: "",
    followUpDate: "",
    followUpRecommendations: "",
    validUntil: "",
    medications: [
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
        quantity: 0,
        refills: 0,
        sideEffects: [],
      },
    ],
  });

  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  // Keep a ref to appointment so async WebRTC callbacks can access it
  const appointmentRef = useRef<any>(null);

  const normalizedRole = (user?.role || "").toLowerCase();
  const isDoctor = normalizedRole === "doctor";

  // Initialize WebRTC
  useEffect(() => {
    if (!appointmentId || !user) return;

    fetchAppointment();
    initializeCall();

    return () => {
      cleanupCall();
    };
  }, [appointmentId, user]);

  useEffect(() => {
    if (!appointmentId) return;
    fetchPrescription();
  }, [appointmentId]);

  // Real-time polling for patient: auto-refresh prescription every 6s until found
  useEffect(() => {
    if (isDoctor || !appointmentId || !pollingActive) return;
    if (prescription) { setPollingActive(false); return; }
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/prescriptions/appointment/${appointmentId}`);
        if (response.data?.success) {
          const data = response.data.data || response.data.prescription || response.data;
          if (data && data._id) {
            setPrescription(data);
            setPollingActive(false);
            toast({ title: "Prescription available!", description: "Doctor has issued your prescription." });
          }
        }
      } catch (_) { /* silent */ }
    }, 6000);
    return () => clearInterval(interval);
  }, [isDoctor, appointmentId, prescription, pollingActive, toast]);

  // ── Join video room via socket ──
  useEffect(() => {
    if (!appointmentId || !user) return;
    joinRoom(`video_${appointmentId}`);
  }, [appointmentId, user, joinRoom]);

  // ── WebRTC signaling via socket ──
  useEffect(() => {
    if (!appointmentId || !user) return;

    const handleOffer = async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit("video:answer", { answer, to: from, appointmentId });
      } catch (e) {
        console.error("Error handling offer:", e);
      }
    };

    const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error("Error handling answer:", e);
      }
    };

    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current;
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    };

    const handleEndCall = () => {
      cleanupCall();
      toast({ title: "Call ended", description: "The other party ended the call." });
      if (isDoctor) navigate("/doctor/today", { replace: true });
      else navigate("/patient", { replace: true });
    };

    on("video:offer", handleOffer);
    on("video:answer", handleAnswer);
    on("video:ice-candidate", handleIceCandidate);
    on("video:end-call", handleEndCall);

    return () => {
      off("video:offer", handleOffer);
      off("video:answer", handleAnswer);
      off("video:ice-candidate", handleIceCandidate);
      off("video:end-call", handleEndCall);
    };
  }, [appointmentId, user, isDoctor, on, off, emit, navigate, toast]);

  // ── Doctor creates offer once call is active and appointment is loaded ──
  useEffect(() => {
    if (!isDoctor || !callActive || !appointmentRef.current) return;
    const pc = peerConnectionRef.current;
    if (!pc) return;
    const patientId = appointmentRef.current?.patientId?._id;
    if (!patientId) return;

    const timer = setTimeout(async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emit("video:offer", { offer, to: patientId, appointmentId });
      } catch (e) {
        console.error("Error creating WebRTC offer:", e);
      }
    }, 1500); // small delay to let patient join room first

    return () => clearTimeout(timer);
  }, [isDoctor, callActive, appointmentId, emit]);

  const fetchAppointment = async () => {
    try {
      const response = await api.get(`/appointments/${appointmentId}`);
      if (response.data?.success) {
        const appt = response.data.appointment;
        setAppointment(appt);
        appointmentRef.current = appt;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load appointment",
        variant: "destructive",
      });
      setTimeout(() => navigate(-1), 1500);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescription = async () => {
    if (!appointmentId) return;
    setLoadingPrescription(true);
    try {
      const response = await api.get(`/prescriptions/appointment/${appointmentId}`);
      if (response.data?.success) {
        setPrescription(response.data.data || response.data.prescription || response.data);
      }
    } catch (error) {
      setPrescription(null);
    } finally {
      setLoadingPrescription(false);
    }
  };

  const handleRxInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRxForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: any) => {
    const updated = [...rxForm.medications];
    updated[index] = { ...updated[index], [field]: value };
    setRxForm((prev) => ({ ...prev, medications: updated }));
  };

  const addMedication = () => {
    setRxForm((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
          quantity: 0,
          refills: 0,
          sideEffects: [],
        },
      ],
    }));
  };

  const removeMedication = (index: number) => {
    if (rxForm.medications.length === 1) return;
    setRxForm((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const submitPrescription = async (issueNow: boolean) => {
    if (!appointmentId) return;

    if (!rxForm.diagnosis.trim()) {
      toast({ title: "Diagnosis is required", variant: "destructive" });
      return;
    }

    if (!rxForm.validUntil) {
      toast({ title: "Validity date is required", variant: "destructive" });
      return;
    }

    const validDate = new Date(rxForm.validUntil);
    if (validDate <= new Date()) {
      toast({ title: "Validity date must be in the future", variant: "destructive" });
      return;
    }

    for (const med of rxForm.medications) {
      if (!med.name.trim() || !med.dosage.trim() || !med.frequency.trim() || !med.duration.trim()) {
        toast({ title: "All medication fields are required", variant: "destructive" });
        return;
      }
    }

    try {
      setRxSubmitting(true);
      const response = await api.post("/prescriptions", {
        appointmentId,
        diagnosis: rxForm.diagnosis.trim(),
        clinicalNotes: rxForm.clinicalNotes.trim(),
        treatmentPlan: rxForm.treatmentPlan.trim(),
        followUpDate: rxForm.followUpDate || undefined,
        followUpRecommendations: rxForm.followUpRecommendations.trim(),
        validUntil: rxForm.validUntil,
        medications: rxForm.medications.map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          instructions: m.instructions.trim(),
          quantity: m.quantity,
          refills: m.refills,
          sideEffects: m.sideEffects,
        })),
      });

      const created = response.data?.prescription;
      if (created) {
        if (issueNow) {
          await api.post(`/prescriptions/${created._id}/issue`, {});
          const issued = await api.get(`/prescriptions/${created._id}`);
          setPrescription(issued.data?.data || issued.data?.prescription || issued.data);
          toast({ title: "Prescription issued", description: "Patient can view it now." });
        } else {
          setPrescription(created);
          toast({ title: "Prescription saved", description: "Saved as draft." });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create prescription",
        variant: "destructive",
      });
    } finally {
      setRxSubmitting(false);
    }
  };

  const initializeCall = async () => {
    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: STUN_SERVERS,
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("Received remote track:", event.track);
        remoteStreamRef.current.addTrack(event.track);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
      };

      // Handle ICE candidates — forward to the other peer via socket signaling
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const appt = appointmentRef.current;
          const targetId = isDoctor
            ? appt?.patientId?._id
            : appt?.doctorId?._id;
          if (targetId) {
            emit("video:ice-candidate", { candidate: event.candidate, to: targetId, appointmentId });
          }
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", peerConnection.connectionState);
        if (
          peerConnection.connectionState === "connected" ||
          peerConnection.connectionState === "completed"
        ) {
          setConnected(true);
        } else if (
          peerConnection.connectionState === "disconnected" ||
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "closed"
        ) {
          setConnected(false);
        }
      };

      setCallActive(true);
    } catch (error) {
      console.error("Failed to initialize call:", error);
      toast({
        title: "Error",
        description: "Failed to access camera/microphone",
        variant: "destructive",
      });
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMuted((prev) => !prev);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setCameraOff((prev) => !prev);
    }
  };

  const endCall = async () => {
    // Notify the other party before cleanup
    const appt = appointmentRef.current;
    const targetId = isDoctor ? appt?.patientId?._id : appt?.doctorId?._id;
    if (targetId) {
      emit("video:end-call", { to: targetId, appointmentId });
    }

    cleanupCall();

    // Mark appointment as completed
    try {
      if (appointmentId) {
        await api.put(`/appointments/${appointmentId}/status`, { status: "completed" });
      }
    } catch (error) {
      console.error("Failed to update appointment:", error);
    }

    // Navigate back to respective dashboard
    if (isDoctor) {
      navigate("/doctor/today", { replace: true });
      return;
    }

    if (normalizedRole === "patient") {
      navigate("/patient", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  };

  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setCallActive(false);
    setConnected(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing video call...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Appointment not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Video Consultation</h1>
          </div>
          <p className="text-muted-foreground mt-1 ml-11">
            {isDoctor
              ? <span className="flex items-center gap-1"><User className="h-4 w-4" /> Patient: <strong>{appointment.patientId?.name || "Loading..."}</strong></span>
              : <span className="flex items-center gap-1"><Stethoscope className="h-4 w-4" /> Doctor: <strong>{appointment.doctorId?.name || "Loading..."}</strong></span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge className="bg-green-500 text-white hover:bg-green-600">● Live</Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300">● Connecting...</Badge>
          )}
          <Badge variant="secondary">
            <CalendarDays className="h-3 w-3 mr-1" />
            {appointment.date} · {appointment.time}
          </Badge>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Video */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="aspect-video bg-muted flex items-center justify-center relative">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraOff ? "hidden" : ""}`}
            />
            {cameraOff && (
              <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                <VideoOff className="h-12 w-12" />
                <p className="text-sm">Camera is off</p>
              </div>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground py-2">
            You {isDoctor ? "(Doctor)" : "(Patient)"}
          </p>
        </Card>

        {/* Remote Video */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="aspect-video bg-muted flex items-center justify-center relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${connected ? "" : "hidden"}`}
            />
            {!connected && (
              <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Video className="h-8 w-8" />
                </div>
                <p className="text-sm">
                  Waiting for {isDoctor ? "patient" : "doctor"} to connect...
                </p>
                <Loader className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground py-2">
            {isDoctor
              ? appointment.patientId?.name || "Patient"
              : appointment.doctorId?.name || "Doctor"}
          </p>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex justify-center gap-3 flex-wrap">
          {/* Mic */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant={muted ? "destructive" : "outline"}
              size="icon"
              className={`h-12 w-12 rounded-full transition-all ${!muted ? 'hover:bg-primary/10' : ''}`}
              onClick={toggleMute}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <span className="text-[10px] text-muted-foreground">{muted ? "Unmute" : "Mute"}</span>
          </div>

          {/* Camera */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant={cameraOff ? "destructive" : "outline"}
              size="icon"
              className={`h-12 w-12 rounded-full transition-all ${!cameraOff ? 'hover:bg-primary/10' : ''}`}
              onClick={toggleCamera}
            >
              {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <span className="text-[10px] text-muted-foreground">{cameraOff ? "Camera On" : "Camera Off"}</span>
          </div>

          {/* Prescription (doctor only) */}
          {isDoctor && (
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full hover:bg-blue-50"
                onClick={() => navigate(`/create-prescription/${appointmentId}`)}
                title="Full Prescription Form"
              >
                <FileText className="h-5 w-5 text-blue-600" />
              </Button>
              <span className="text-[10px] text-muted-foreground">Prescription</span>
            </div>
          )}

          {/* End call */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={endCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
            <span className="text-[10px] text-muted-foreground">End Call</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">WebRTC peer-to-peer · End-to-end encrypted</p>
      </div>

      {/* Prescription Panel */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Prescription
            </CardTitle>
            <div className="flex items-center gap-2">
              {prescription?.status && (
                <Badge
                  className={`capitalize ${
                    prescription.status === 'issued'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}
                >
                  {prescription.status}
                </Badge>
              )}
              {!isDoctor && !prescription && pollingActive && (
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Auto-checking...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">

          {loadingPrescription ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader className="h-4 w-4 animate-spin" />
              Loading prescription...
            </div>
          ) : isDoctor ? (
            prescription ? (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Diagnosis:</span>
                    <span>{prescription.diagnosis || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Created:</span>
                    <span>{new Date(prescription.createdAt || prescription.issuedAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                  {prescription.medications?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{prescription.medications.length} medication(s) prescribed</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => navigate(`/prescriptions/${prescription._id}`)}>View Full Prescription</Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submitPrescription(false); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="diagnosis">Diagnosis *</Label>
                    <Textarea
                      id="diagnosis"
                      name="diagnosis"
                      rows={2}
                      value={rxForm.diagnosis}
                      onChange={handleRxInputChange}
                      placeholder="Enter diagnosis"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                    <Textarea
                      id="clinicalNotes"
                      name="clinicalNotes"
                      rows={2}
                      value={rxForm.clinicalNotes}
                      onChange={handleRxInputChange}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="treatmentPlan">Treatment Plan</Label>
                    <Textarea
                      id="treatmentPlan"
                      name="treatmentPlan"
                      rows={2}
                      value={rxForm.treatmentPlan}
                      onChange={handleRxInputChange}
                      placeholder="Treatment plan"
                    />
                  </div>
                  <div>
                    <Label htmlFor="followUpRecommendations">Follow-up Recommendations</Label>
                    <Textarea
                      id="followUpRecommendations"
                      name="followUpRecommendations"
                      rows={2}
                      value={rxForm.followUpRecommendations}
                      onChange={handleRxInputChange}
                      placeholder="Follow-up guidance"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="followUpDate">Follow-up Date</Label>
                    <Input
                      id="followUpDate"
                      name="followUpDate"
                      type="date"
                      value={rxForm.followUpDate}
                      onChange={handleRxInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="validUntil">Valid Until *</Label>
                    <Input
                      id="validUntil"
                      name="validUntil"
                      type="date"
                      value={rxForm.validUntil}
                      onChange={handleRxInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Medications *</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addMedication}>
                      <Plus className="h-4 w-4 mr-2" /> Add Medication
                    </Button>
                  </div>
                  {rxForm.medications.map((med, index) => (
                    <div key={index} className="rounded-md border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Medication {index + 1}</span>
                        {rxForm.medications.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMedication(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Name *</Label>
                          <Input value={med.name} onChange={(e) => handleMedicationChange(index, "name", e.target.value)} />
                        </div>
                        <div>
                          <Label>Dosage *</Label>
                          <Input value={med.dosage} onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Frequency *</Label>
                          <Input value={med.frequency} onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)} />
                        </div>
                        <div>
                          <Label>Duration *</Label>
                          <Input value={med.duration} onChange={(e) => handleMedicationChange(index, "duration", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label>Instructions</Label>
                        <Textarea
                          rows={2}
                          value={med.instructions}
                          onChange={(e) => handleMedicationChange(index, "instructions", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={rxSubmitting}>
                    {rxSubmitting ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={rxSubmitting}
                    onClick={() => submitPrescription(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Issue to Patient
                  </Button>
                </div>
              </form>
            )
          ) : (
            // ─── PATIENT VIEW ───
            <div className="space-y-4">
              {prescription ? (
                <>
                  {/* Prescription detail card */}
                  <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50/50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Prescription Issued by Doctor</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Diagnosis</p>
                        <p className="font-medium">{prescription.diagnosis || "—"}</p>
                      </div>
                      {prescription.treatmentPlan && (
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">Treatment Plan</p>
                          <p className="font-medium">{prescription.treatmentPlan}</p>
                        </div>
                      )}
                      {prescription.followUpRecommendations && (
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">Follow-up</p>
                          <p className="font-medium">{prescription.followUpRecommendations}</p>
                        </div>
                      )}
                      {prescription.medications?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">Medications</p>
                          <p className="font-medium">{prescription.medications.map((m: any) => m.name).join(", ")}</p>
                        </div>
                      )}
                    </div>

                    {/* Expandable medications list */}
                    {prescription.medications?.length > 0 && (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setPrescriptionExpanded((p) => !p)}
                        >
                          {prescriptionExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                          {prescriptionExpanded ? "Hide" : "View"} full medication details
                        </Button>
                        {prescriptionExpanded && (
                          <div className="mt-2 space-y-2">
                            {prescription.medications.map((med: any, i: number) => (
                              <div key={i} className="rounded-lg border bg-white/80 p-3 text-xs space-y-1">
                                <p className="font-semibold text-sm">{med.name}</p>
                                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                                  <span>Dosage: <strong className="text-foreground">{med.dosage}</strong></span>
                                  <span>Frequency: <strong className="text-foreground">{med.frequency}</strong></span>
                                  <span>Duration: <strong className="text-foreground">{med.duration}</strong></span>
                                  {med.instructions && <span className="col-span-2">Instructions: {med.instructions}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => navigate(`/prescriptions/${prescription._id}`)} className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> View Full Prescription
                    </Button>
                  </div>

                  {/* AI Summary section */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                    <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> AI Prescription Summary (powered by OpenAI)
                    </p>
                    <PrescriptionAISummary
                      medications={prescription.medications || []}
                      diagnosis={prescription.diagnosis || ""}
                      treatmentPlan={prescription.treatmentPlan || ""}
                      followUpRecommendations={prescription.followUpRecommendations || ""}
                    />
                  </div>
                </>
              ) : (
                // ── No prescription yet ──
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Prescription Not Generated Yet</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      The doctor hasn't issued a prescription yet. It will appear here automatically once the doctor generates it.
                    </p>
                  </div>
                  {pollingActive ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Checking automatically every 6 seconds...
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { fetchPrescription(); setPollingActive(true); }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Check Now
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoConsultation;
