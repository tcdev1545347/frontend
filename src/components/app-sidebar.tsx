// src/components/AppSidebar.tsx
import {
  FolderIcon,
  HomeIcon,
  MailIcon,
  Loader2 as LoadingIcon, // Use a consistent loading icon
} from "lucide-react";
import { cn } from "@/lib/utils"; // *** IMPORT cn ***
import { NavMain } from "@/components/nav-main";
// import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail, // Keep SidebarRail if your component uses it
} from "@/components/ui/sidebar";
import React from "react";

const VERIFY_ENDPOINT = import.meta.env.VITE_VERIFY_ENDPOINT;
const API_KEY = import.meta.env.VITE_API_KEY;

// Helper component for themed messages
const SidebarMessage = ({ children }: { children: React.ReactNode }) => (
    <div className="flex h-full flex-col items-center justify-center space-y-2 border-r bg-sidebar p-4 text-sidebar-foreground">
       {children}
    </div>
);

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<{
    name: string;
    email: string;
    avatar: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        // Let ProtectedRoute handle redirection, avoid setting error here usually
        console.warn("No token found for sidebar user fetch.");
        setLoading(false);
        return;
      }

       if (!VERIFY_ENDPOINT || !API_KEY) {
         console.error("Sidebar fetch configuration missing (VERIFY_ENDPOINT or API_KEY).");
         setError("Configuration error.");
         setLoading(false);
         return;
       }

      try {
        const response = await fetch(VERIFY_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-api-key": API_KEY,
          },
           // Verify if body is needed for verification, often just header is sufficient
          body: JSON.stringify({ token }),
        });

        if (response.status === 401) {
             localStorage.removeItem("token");
             localStorage.removeItem("username"); // Also clear username
             setError("Session expired. Please log in again.");
             setLoading(false);
             // Consider using useNavigate() to redirect to /login
             return;
        }

        if (!response.ok) {
            let errorMsg = `Failed to verify user (${response.status})`;
             try {
                 const errorData = await response.json();
                 errorMsg = errorData.error || errorData.message || errorMsg;
             } catch (e) { /* Ignore */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (!data?.user?.name || !data?.user?.email) {
            throw new Error("Received invalid user data format.");
        }

        setUser({
          name: data.user.name,
          email: data.user.email,
          avatar: data.user.avatar || "/default-avatar.jpg",
        });
      } catch (err: any) {
        console.error("Error fetching user:", err);
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const isHomePageActive = location.pathname === '/homepage';
  const isMyFilesActive = location.pathname === '/my-files';
  const isMessagesActive = location.pathname === '/messages';

  if (loading) {
    // Render sidebar shell with loading state
     return (
       <Sidebar collapsible="icon" {...props} className={cn("border-r", props.className)}>
         <SidebarMessage>
             <LoadingIcon className="size-6 animate-spin text-muted-foreground" />
             <span>Loading...</span>
         </SidebarMessage>
       </Sidebar>
    );
  }

  if (error && !user) {
     // Render sidebar shell with error state
     return (
        <Sidebar collapsible="icon" {...props} className={cn("border-r", props.className)}>
           <SidebarMessage>
               <span className="text-center text-destructive">{error}</span>
           </SidebarMessage>
        </Sidebar>
     );
  }

  if (!user) {
     // Handle case where loading is done, no error, but no user (e.g., no token)
     // Returning null might be appropriate, or a minimal non-functional sidebar
     return null;
  }

  // Render the full sidebar
  return (
    <Sidebar collapsible="icon" {...props} className={cn("border-r", props.className)}>
      <SidebarHeader>
        <TeamSwitcher teams={[]} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={[
            { title: "Home", url: "/homepage", icon: HomeIcon, isActive: isHomePageActive },
            { title: "My Files", url: "/my-files", icon: FolderIcon, isActive: isMyFilesActive },
            { title: "Messages", url: "/messages", icon: MailIcon, isActive: isMessagesActive },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
         <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail/>
    </Sidebar>
  );
}