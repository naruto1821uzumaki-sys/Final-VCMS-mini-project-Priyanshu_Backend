import { useState, useEffect } from "react";
import { useAuth, User } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import api from "@/services/api";

// Helper to format location
const formatLocation = (loc: any): string => {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  if (typeof loc === "object") {
    const parts = [loc.city, loc.state, loc.country].filter(Boolean);
    return parts.join(", ") || "";
  }
  return "";
};

const AdminUsers = () => {
  const { users: contextUsers, deleteUser, warnUser } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [warningUser, setWarningUser] = useState<User | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [localUsers, setLocalUsers] = useState<User[]>([]);

  // Use localUsers if fetched, else fall back to context users
  const users = localUsers.length > 0 ? localUsers : contextUsers;

  // Always fetch from admin/users for admin pages (high limit to get all)
  useEffect(() => {
    api.get('/admin/users', { params: { limit: 1000 } })
      .then(r => {
        const list = r.data.users || r.data;
        setLocalUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => {/* silent fallback to context users */});
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || u.role === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleDelete = async () => {
    if (deletingUser) {
      const result = await deleteUser(deletingUser._id);
      if (result.success) {
        toast({ title: "User deleted", description: `${deletingUser.name} has been removed.` });
        setDeletingUser(null);
      } else {
        toast({ title: "Delete failed", description: result.message, variant: "destructive" });
      }
    }
  };

  const handleWarn = async () => {
    if (warningUser && warningMessage.trim()) {
      const result = await warnUser(warningUser._id, warningMessage);
      if (result.success) {
        toast({ title: "Warning sent", description: `Warning sent to ${warningUser.name}.` });
        setWarningUser(null);
        setWarningMessage("");
      } else {
        toast({ title: "Warning failed", description: result.message, variant: "destructive" });
      }
    }
  };

  const tabs = [
    { value: "all", label: "All Users" },
    { value: "patient", label: "Patients" },
    { value: "doctor", label: "Doctors" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl pb-12">
      {/* Gradient Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="h-6 w-6" /> Manage Users</h1>
            <p className="mt-1 text-blue-100 text-sm">View and manage all registered users · <a href="/admin/approvals" className="underline text-white/90 hover:text-white">Pending approvals</a></p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => api.get('/admin/users', { params: { limit: 1000 } }).then(r => { const list = r.data.users || r.data; setLocalUsers(Array.isArray(list) ? list : []); })}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === tab.value
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name or email..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="pl-9 h-10 bg-white border-slate-200 focus:border-primary"
        />
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Users 
              <span className="ml-2 inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold">
                {filteredUsers.length}
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-b border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Phone</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Details</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                          u.role === "admin" ? "bg-destructive" : u.role === "doctor" ? "bg-secondary" : "bg-primary"
                        }`}>
                          {u.name.split(' ')[0][0]}{u.name.split(' ')[1]?.[0] || ''}
                        </div>
                        {u.name}
                      </div>
                      {u.approvalStatus === "approved" && u.role === "doctor" && (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">✓ Approved</Badge>
                      )}
                      {u.approvalStatus === "rejected" && u.role === "doctor" && (
                        <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">✗ Rejected</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{u.email}</TableCell>
                    <TableCell className="text-slate-600">{u.phone}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase text-white ${
                        u.role === "admin" ? "bg-red-600" : u.role === "doctor" ? "bg-blue-600" : "bg-purple-600"
                      }`}>
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {u.role === "doctor" && <>{u.specialization} • ₹{u.consultationFee} • {formatLocation(u.location)}</>}
                      {u.role === "patient" && <>{u.age ? `Age: ${u.age}` : "—"} • {u.medicalHistory || "No history"}</>}
                      {u.role === "admin" && "System Admin"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs px-3 bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 font-semibold"
                          onClick={() => setWarningUser(u)}
                          disabled={u.role === "admin"}
                        >
                          ⚠ Warn
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs px-3 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 font-semibold"
                          onClick={() => setDeletingUser(u)}
                          disabled={u.role === "admin"}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Dialog */}
      <AlertDialog open={!!warningUser} onOpenChange={() => { setWarningUser(null); setWarningMessage(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Warning to {warningUser?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              This warning will be visible on the user's notification page and profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter warning message..."
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWarn} disabled={!warningMessage.trim()} className="bg-warning text-warning-foreground hover:bg-warning/90">
              Send Warning
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default AdminUsers;
