import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useNotifications } from "@/contexts/NotificationContext"; // <-- Import hook
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge"; // For potential count badge
import React from "react";

const getInitials = (name: string) => {
  const [firstName, lastName] = name.split(" ");
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
};

export function NavUser({ user }: { // <-- Simplified props
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const {
      hasUnread,
      unreadGroupIds,
      allGroups, // Get all groups from context
      removeUnreadGroup // To mark as read on click
  } = useNotifications(); // <-- Use context

  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear the token from localStorage
    navigate("/login"); // Redirect to the login page
  };
  
  // Find names of unread groups
  const unreadGroupsDetails = React.useMemo(() => {
      return allGroups.filter(group => unreadGroupIds.has(group.groupID));
  }, [allGroups, unreadGroupIds]);

  const handleNotificationClick = (groupId: string) => {
      navigate('/messages'); // Navigate to messages page first
      // We need a way to tell MessagesPage to select this group
      // Option 1: Pass state via navigate (less clean)
      // Option 2: Add a function to context `selectGroup(groupId)` that MessagesPage listens to (better)
      // For now, just remove unread status, user needs to click group manually after navigation
      removeUnreadGroup(groupId);
  };


  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck className="mr-2 h-4 w-4" /> {/* Added margin */}
                Account
              </DropdownMenuItem>

              {/* --- Modified Notifications Item --- */}
              <DropdownMenuItem
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                // Prevent closing dropdown if clicking within the notification area (optional)
                onSelect={(e) => e.preventDefault()}
              >
                <Bell className="mr-2 h-4 w-4" />
                Notifications
                {/* Bell Icon Indicator */}
                {hasUnread && (
                    <Badge variant="destructive" className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 p-0" />
                )}
              </DropdownMenuItem>
              {/* --- Sub-menu or list for unread groups --- */}
              {hasUnread && unreadGroupsDetails.length > 0 && (
                  <div className="pl-8 pr-2 py-1 text-xs text-muted-foreground"> {/* Indent notifications */}
                      {unreadGroupsDetails.map(group => (
                          <div
                              key={group.groupID}
                              onClick={() => handleNotificationClick(group.groupID)}
                              className="cursor-pointer hover:text-foreground py-0.5 truncate"
                              title={`New message in ${group.groupName}`} // Tooltip
                          >
                              {group.groupName}
                          </div>
                      ))}
                  </div>
              )}
             {/* --- End Notifications --- */}

            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> {/* Added margin */}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
