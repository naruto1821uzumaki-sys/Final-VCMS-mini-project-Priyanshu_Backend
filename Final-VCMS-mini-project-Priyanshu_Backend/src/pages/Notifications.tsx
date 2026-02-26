import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Bell, CheckCircle2, Trash2, Eye, AlertCircle, Calendar, Pill, ClipboardList, UserCheck, Settings } from "lucide-react";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  from: any;
  link?: string;
  isRead: boolean;
  readAt?: string;
  priority: string;
  createdAt: string;
  data?: Record<string, any>;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string; border: string }> = {
  appointment:      { label: "Appointment",     icon: Calendar,      bg: "bg-primary/10",    text: "text-primary",     border: "border-primary/30" },
  prescription:     { label: "Prescription",    icon: Pill,          bg: "bg-secondary/10",  text: "text-secondary",   border: "border-secondary/30" },
  "medical-history":{ label: "Medical History", icon: ClipboardList, bg: "bg-violet-50",     text: "text-violet-600",  border: "border-violet-200" },
  "doctor-approval":{ label: "Doctor Approval", icon: UserCheck,     bg: "bg-amber-50",      text: "text-amber-600",   border: "border-amber-200" },
  system:           { label: "System",          icon: Settings,      bg: "bg-gray-100",       text: "text-gray-600",    border: "border-gray-200" },
};

const Notifications = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "appointment", label: "Appointments" },
    { key: "prescription", label: "Prescriptions" },
    { key: "medical-history", label: "Medical" },
    { key: "doctor-approval", label: "Approvals" },
    { key: "system", label: "System" },
  ];

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, selectedType, page]);

  useEffect(() => {
    if (!socket || !user?._id) return;
    const handleNewNotification = (data: any) => {
      if (data.userId === user._id || data.toUserId === user._id) {
        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((prev) => prev + 1);
        toast({ title: data.title || "New Notification", description: data.message });
      }
    };
    socket.on("notification", handleNewNotification);
    return () => socket.off("notification", handleNewNotification);
  }, [socket, user?._id, toast]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      let url = `/notifications?page=${page}&limit=15`;
      if (selectedType !== "all") url += `&type=${selectedType}`;
      const response = await api.get(url);
      if (response.data?.success) setNotifications(response.data.notifications || []);
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to load notifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/notifications/unread-count");
      if (response.data?.success) setUnreadCount(response.data.unreadCount || 0);
    } catch { /* silent */ }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/mark-read`);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
      fetchUnreadCount();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to mark as read", variant: "destructive" });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({ title: "Done", description: "All marked as read" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 p-3 md:p-5 space-y-3">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 px-5 py-4 shadow-lg border border-primary/20">
        <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Notifications</h1>
              <p className="text-white/70 text-xs mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "You're all caught up"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors border border-white/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide border-b border-border">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setSelectedType(tab.key); setPage(1); }}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                selectedType === tab.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
              {tab.key === "all" && unreadCount > 0 && (
                <span className="ml-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3 p-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground">No notifications</p>
            <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
              const Icon = cfg.icon;
              const isUrgent = notif.priority === "urgent" || notif.priority === "high";
              return (
                <div
                  key={notif._id}
                  className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 ${!notif.isRead ? "bg-primary/3" : ""}`}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 h-10 w-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${cfg.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      {isUrgent && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600">
                          <AlertCircle className="h-3 w-3" /> Urgent
                        </span>
                      )}
                      {!notif.isRead && (
                        <span className="h-2 w-2 bg-primary rounded-full" />
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(notif.createdAt).toLocaleDateString()} · {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                    {notif.from && (
                      <p className="text-[11px] text-muted-foreground mt-1">From: <span className="font-semibold">{notif.from.name}</span></p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif._id)}
                        title="Mark as read"
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif._id)}
                      title="Delete"
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {notifications.length > 0 && (
          <div className="flex gap-2 justify-center px-4 py-3 border-t border-border">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={notifications.length < 15}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;