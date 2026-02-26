import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Mic, MicOff, Video, VideoOff, PhoneOff, FileText, Loader } from "lucide-react";

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

  const [appointment, setAppointment] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [loading, setLoading] = useState(true);

  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());

  const isDoctor = user?.role === "doctor";

  // Initialize WebRTC
  useEffect(() => {
    if (!appointmentId || !user) return;

    fetchAppointment();
    initializeCall();

    return () => {
      cleanupCall();
    };
  }, [appointmentId, user]);

  const fetchAppointment = async () => {
    try {
      const response = await api.get(`/api/appointments/${appointmentId}`);
      if (response.data?.success) {
        setAppointment(response.data.appointment);
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

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate via signaling
          console.log("ICE candidate:", event.candidate);
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
    cleanupCall();

    // Update appointment status
    try {
      if (appointmentId) {
        await api.post(`/api/appointments/${appointmentId}/complete`, {});
      }
    } catch (error) {
      console.error("Failed to update appointment:", error);
    }

    navigate(isDoctor ? "/doctor/today" : "/patient/appointments");
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Video Consultation</h1>
        <p className="text-muted-foreground mt-1">
          {isDoctor
            ? `Patient: ${appointment.patientId?.name || "Loading..."}`
            : `Doctor: ${appointment.doctorId?.name || "Loading..."}`}
        </p>
        {connected && (
          <p className="text-sm text-green-600 mt-2">✓ Connected</p>
        )}
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
      <div className="flex justify-center gap-3 flex-wrap">
        <Button
          variant={muted ? "destructive" : "outline"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleMute}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant={cameraOff ? "destructive" : "outline"}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleCamera}
          title={cameraOff ? "Turn on camera" : "Turn off camera"}
        >
          {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        {isDoctor && (
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => navigate(`/prescription/create/${appointmentId}`)}
            title="Create Prescription"
          >
            <FileText className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={endCall}
          title="End Call"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {/* Info */}
      <Card className="border-0 shadow-md p-4">
        <div className="text-sm space-y-2">
          <p>
            <span className="font-medium">Appointment Date:</span>{" "}
            {new Date(appointment.date).toLocaleDateString()}
          </p>
          <p>
            <span className="font-medium">Time:</span> {appointment.time}
          </p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            <span className="capitalize">{appointment.status}</span>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default VideoConsultation;
