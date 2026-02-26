import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Filter,
  Eye,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  Tag,
  Zap,
} from "lucide-react";
import api from "@/services/api";

interface ContactStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  urgent: number;
  byType: Record<string, number>;
  byRole: Record<string, number>;
}

interface Contact {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  userName: string;
  userEmail: string;
  userPhone: string;
  userRole: string;
  problemType: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  adminNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminContacts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    userRole: "all",
    problemType: "all",
    search: "",
  });

  // Status update form
  const [statusForm, setStatusForm] = useState({
    status: "open",
    adminNotes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [contacts, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, contactsRes] = await Promise.all([
        api.get("/contact/stats/dashboard").catch(() => ({ data: { success: false } })),
        api.get("/contact/").catch(() => ({ data: { success: false } })),
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }

      if (contactsRes.data?.success) {
        setContacts(contactsRes.data.data || []);
      } else {
        setContacts([]);
      }
      setFilteredContacts([]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setContacts([]);
      setFilteredContacts([]);
      toast({
        title: "Warning",
        description: "Contacts data temporarily unavailable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = contacts;

    if (filters.status !== "all") {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.priority !== "all") {
      filtered = filtered.filter((c) => c.priority === filters.priority);
    }

    if (filters.userRole !== "all") {
      filtered = filtered.filter((c) => c.userRole === filters.userRole);
    }

    if (filters.problemType !== "all") {
      filtered = filtered.filter((c) => c.problemType === filters.problemType);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.userName.toLowerCase().includes(searchLower) ||
          c.userEmail.toLowerCase().includes(searchLower) ||
          c.subject.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower)
      );
    }

    setFilteredContacts(filtered);
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setStatusForm({
      status: contact.status,
      adminNotes: contact.adminNotes || "",
    });
    setShowDetails(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedContact) return;

    try {
      setStatusUpdateLoading(true);
      const response = await api.put(`/contact/${selectedContact._id}/status`, {
        status: statusForm.status,
        adminNotes: statusForm.adminNotes,
      });

      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Contact status updated successfully",
        });

        setShowDetails(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update contact status",
        variant: "destructive",
      });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <MessageSquare className="w-4 h-4" />;
      case "in-progress":
        return <Clock className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "text-blue-600";
      case "in-progress":
        return "text-yellow-600";
      case "resolved":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin"/>
          </div>
          <p className="text-gray-600 mt-4">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Contact Management</h1>
        <p className="text-muted-foreground mt-2 text-lg">View and manage all customer contact submissions</p>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Contacts</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {stats.total}
                  </p>
                </div>
                <MessageSquare className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Open</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {stats.open}
                  </p>
                </div>
                <AlertCircle className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {stats.inProgress}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Resolved</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {stats.resolved}
                  </p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Urgent</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {stats.urgent}
                  </p>
                </div>
                <Zap className="w-10 h-10 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50/50 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-5 h-5 text-slate-600" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              placeholder="Search by name, email, subject..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="sm:col-span-2 lg:col-span-1 h-10 bg-white border border-slate-200 focus:border-slate-400"
            />

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="h-10 bg-white border border-slate-200 focus:border-slate-400">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
              <SelectTrigger className="h-10 bg-white border border-slate-200 focus:border-slate-400">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.userRole} onValueChange={(value) => setFilters({ ...filters, userRole: value })}>
              <SelectTrigger className="h-10 bg-white border border-slate-200 focus:border-slate-400">
                <SelectValue placeholder="User Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.problemType} onValueChange={(value) => setFilters({ ...filters, problemType: value })}>
              <SelectTrigger className="h-10 bg-white border border-slate-200 focus:border-slate-400">
                <SelectValue placeholder="Problem Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="technical-issue">Technical Issue</SelectItem>
                <SelectItem value="payment-issue">Payment Issue</SelectItem>
                <SelectItem value="account-issue">Account Issue</SelectItem>
                <SelectItem value="appointment-issue">Appointment Issue</SelectItem>
                <SelectItem value="medical-concern">Medical Concern</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFilters({ status: "all", priority: "all", userRole: "all", problemType: "all", search: "" })}
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
            >
              Clear Filters
            </Button>
            <div className="flex-1 text-right">
              <p className="text-sm text-muted-foreground">{filteredContacts?.length || 0} results</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              All Contacts 
              <span className="ml-2 inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold">
                {filteredContacts?.length || 0}
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!filteredContacts || filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No contacts found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts && filteredContacts.length > 0 && filteredContacts.map((contact) => (
                    <tr
                      key={contact._id}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">
                            {contact.userName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {contact.userEmail}
                          </p>
                          <p className="text-xs text-gray-500 bg-slate-100 w-fit px-2 py-1 rounded">
                            {contact.userRole}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900 font-medium max-w-xs truncate">
                          {contact.subject}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {contact.problemType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(
                            contact.priority
                          )}`}
                        >
                          {contact.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(
                            contact.status
                          )}`}
                        >
                          {getStatusIcon(contact.status)}
                          <span className="capitalize">{contact.status}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {new Date(contact.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(contact)}
                          className="gap-1 text-slate-600 border-slate-300 hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail View Modal */}
      {showDetails && selectedContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Contact Details</CardTitle>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* User Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  User Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">
                      {selectedContact.userName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <p className="font-medium text-gray-900">
                      {selectedContact.userRole}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      Email
                    </p>
                    <p className="font-medium text-gray-900">
                      {selectedContact.userEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      Phone
                    </p>
                    <p className="font-medium text-gray-900">
                      {selectedContact.userPhone || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Contact Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Subject</p>
                    <p className="font-medium text-gray-900">
                      {selectedContact.subject}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedContact.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Problem Type</p>
                      <p className="font-medium text-gray-900">
                        {selectedContact.problemType}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Priority</p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(
                          selectedContact.priority
                        )}`}
                      >
                        {selectedContact.priority}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Date
                      </p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedContact.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update Form */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Update Status
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <Select
                      value={statusForm.status}
                      onValueChange={(value) =>
                        setStatusForm({ ...statusForm, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes
                    </label>
                    <Textarea
                      placeholder="Add notes about this contact..."
                      value={statusForm.adminNotes}
                      onChange={(e) =>
                        setStatusForm({
                          ...statusForm,
                          adminNotes: e.target.value,
                        })
                      }
                      rows={4}
                    />
                  </div>

                  {selectedContact.adminNotes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900 font-medium">
                        Previous Admin Notes:
                      </p>
                      <p className="text-blue-800 text-sm mt-1">
                        {selectedContact.adminNotes}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleUpdateStatus}
                      disabled={statusUpdateLoading}
                      className="flex-1"
                    >
                      {statusUpdateLoading ? "Updating..." : "Update Status"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDetails(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
