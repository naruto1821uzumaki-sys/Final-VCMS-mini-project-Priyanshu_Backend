import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, LogOut, User, ArrowLeft, LayoutDashboard, Bell } from "lucide-react";
import { useEffect, useState } from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout, isAuthenticated, notifications } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Extract initials from name (e.g., "John Doe" -> "JD")
  const initials = user ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : "";
  const roleColor = user?.role === "admin" ? "bg-destructive" : user?.role === "doctor" ? "bg-secondary" : "bg-primary";

  const isDashboard = isAuthenticated && (
    location.pathname === `/${user?.role}` || location.pathname === "/"
  );

  const showBackArrow = isAuthenticated && !isDashboard;

  const unreadCount = notifications.filter((n) => n.userId === user?.id && !n.read).length;

  // Hide Sign In / Register link in header when already on that page
  const currentPath = location.pathname.replace(/\/$/, "");
  const isLoginPage = currentPath === "/login";
  const isRegisterPage = currentPath === "/register";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mx-auto animate-pulse">
            <Activity className="h-6 w-6" />
          </div>
          <p className="text-muted-foreground">Loading MediConnect...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Left: Back arrow + Logo */}
          <div className="flex items-center gap-2">
            {showBackArrow && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Medi<span className="text-primary">Connect</span>
              </span>
            </Link>
          </div>

          {/* Right: Notification + Profile */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user && user.role !== "admin" && (
              <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate("/notifications")}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
                    {unreadCount}
                  </span>
                )}
              </Button>
            )}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={`${roleColor} text-white text-xs font-semibold`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
                      {user.role}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/${user.role}`)}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  {user.role !== "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/notifications")}>
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                      {unreadCount > 0 && <span className="ml-auto text-xs text-destructive font-bold">{unreadCount}</span>}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                {!isLoginPage && (
                  <Button size="sm" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                )}
                {!isRegisterPage && (
                  <Button size="sm" asChild>
                    <Link to="/register">Register</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
};

export default Layout;
