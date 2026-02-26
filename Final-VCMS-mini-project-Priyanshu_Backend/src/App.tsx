import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClinicProvider } from "@/contexts/ClinicContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Chatbot from "@/components/Chatbot";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminApprovals from "./pages/AdminApprovals";
import AdminAppointments from "./pages/AdminAppointments";
import AdminContacts from "./pages/AdminContacts";
import AdminAnalytics from "./pages/AdminAnalytics";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorTodayAppointments from "./pages/DoctorTodayAppointments";
import DoctorPatients from "./pages/DoctorPatients";
import PatientDashboard from "./pages/PatientDashboard";
import PatientAppointments from "./pages/PatientAppointments";
import PatientMedicalHistory from "./pages/PatientMedicalHistory";
import PatientPrescriptions from "./pages/PatientPrescriptions";
import VideoConsultation from "./pages/VideoConsultation";
import ViewPrescription from "./pages/ViewPrescription";
import CreatePrescription from "./pages/CreatePrescription";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import PublicDoctors from "./pages/public/PublicDoctors";
import PublicDoctorProfile from "./pages/public/PublicDoctorProfile";
import { ContactUs as PublicContactUs } from "./pages/public/ContactUs";
import GuestDashboard from "./pages/GuestDashboard";
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import FAQs from "./pages/FAQs";
import ContactUs from "./pages/ContactUs";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold text-destructive">Oops! Something went wrong</h1>
            <p className="text-muted-foreground">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Create router with future flags
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <Index />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/login",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <Login />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/register",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <Register />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/doctors",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <PublicDoctors />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/doctors/:id",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <PublicDoctorProfile />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/about-us",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <AboutUs />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/faqs",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <FAQs />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/contact",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <PublicContactUs />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/contact-us",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["doctor", "patient", "admin"]}>
              <ContactUs />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/guest-booking",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <GuestDashboard />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/admin",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/admin/users",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsers />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/admin/approvals",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminApprovals />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/admin/appointments",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminAppointments />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/admin/contacts",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminContacts />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/admin/analytics",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminAnalytics />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/doctor",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/doctor/today",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorTodayAppointments />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/doctor/patients",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorPatients />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/patient",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientDashboard />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/patient/appointments",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientAppointments />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/patient/history",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientMedicalHistory />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/patient/prescriptions",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientPrescriptions />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/video/:appointmentId",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["doctor", "patient"]}>
              <VideoConsultation />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/prescriptions/:id",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["patient", "doctor"]}>
              <ViewPrescription />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/create-prescription/:appointmentId",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["doctor"]}>
              <CreatePrescription />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/profile",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["doctor", "patient", "admin"]}>
              <Profile />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "/notifications",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <ProtectedRoute allowedRoles={["doctor", "patient", "admin"]}>
              <Notifications />
            </ProtectedRoute>
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
  {
    path: "*",
    element: (
      <AuthProvider>
        <ClinicProvider>
          <Layout>
            <NotFound />
          </Layout>
        </ClinicProvider>
      </AuthProvider>
    ),
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

