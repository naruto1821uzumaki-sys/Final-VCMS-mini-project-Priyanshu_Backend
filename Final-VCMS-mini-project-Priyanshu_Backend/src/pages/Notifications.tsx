import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Bell, CheckCircle2, Trash2, Eye, AlertCircle, Cross } from "lucide-react";

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

const Notifications = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [page, setPage] = useState(1);

  const notificationTypes = [
    "all",
    "appointment",
    "prescription",
    "medical-history",
    "doctor-approval",
    "system",
  ];

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, selectedType, page]);

  // Socket listener for real-time notifications
  useEffect(() => {
    if (!socket || !user?._id) return;

    const handleNewNotification = (data: any) => {
      if (data.userId === user._id || data.toUserId === user._id) {
        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((prev) => prev + 1);
        toast({
          title: data.title || "New Notification",
          description: data.message,
        });
      }
    };

    socket.on("notification", handleNewNotification);
    return () => socket.off("notification", handleNewNotification);
  }, [socket, user?._id, toast]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      let url = `/api/notifications?page=${page}&limit=15`;
      if (selectedType !== "all") {
        url += `&type=${selectedType}`;
      }
      const response = await api.get(url);
      if (response.data?.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/api/notifications/unread-count");
      if (response.data?.success) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.post(`/api/notifications/${notificationId}/mark-read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      fetchUnreadCount();
      toast({ title: "Success", description: "Marked as read" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to mark as read",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/api/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({ title: "Success", description: "All marked as read" });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message || "Failed to mark all as read",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      toast({ title: "Success", description: "Notification deleted" });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message || "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "appointment":
        return "bg-blue-100 text-blue-800";
      case "prescription":
        return "bg-green-100 text-green-800";
      case "medical-history":
        return "bg-purple-100 text-purple-800";
      case "doctor-approval":
        return "bg-yellow-100 text-yellow-800";
      case "admin-warning":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "urgent" || priority === "high") {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground">
              {unreadCount} unread notification(s)
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        {notificationTypes.map((type) => (
          <Button
            key={type}
            variant={selectedType === type ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedType(type);
              setPage(1);
            }}
            className="capitalize"
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              No notifications yet. You're all caught up!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif._id}
              className={`border-0 shadow-md ${
                !notif.isRead ? "ring-2 ring-blue-200 bg-blue-50/50" : ""
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={getTypeColor(notif.type)}>
                        {notif.type}
                      </Badge>
                      {notif.priority && notif.priority !== "normal" && (
                        <div className="flex items-center gap-1">
                          {getPriorityIcon(notif.priority)}
                          <span className="text-xs capitalize text-muted-foreground">
                            {notif.priority}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(notif.createdAt).toLocaleDateString()}{" "}
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {notif.isRead && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold mb-1">{notif.title}</h3>

                    {/* Message */}
                    <p className="text-sm text-muted-foreground">
                      {notif.message}
                    </p>

                    {/* From */}
                    {notif.from && (
                      <p className="text-xs text-muted-foreground mt-2">
                        From: <span className="font-medium">{notif.from.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-col">
                    {!notif.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notif._id)}
                        className="whitespace-nowrap"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Mark Read
                      </Button>
                    )}
                    {notif.link && (
                      <a href={notif.link}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="whitespace-nowrap"
                        >
                          View
                        </Button>
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(notif._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {notifications.length > 0 && (
        <div className="flex gap-2 justify-center mt-6">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={notifications.length < 15}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
