import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Users,
  SendHorizontal,
  Search,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sidebar, // Import Sidebar components
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton, // If needed
} from "@/components/ui/sidebar"; // Adjust path if necessary

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { ChatInput } from "@/components/ui/chat/chat-input"; // From chat-cli
import { ChatMessageList } from "@/components/ui/chat/chat-message-list"; // From chat-cli
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
} from "@/components/ui/chat/chat-bubble"; // From chat-cli
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/NotificationContext"; // <-- Import hook
import { Badge } from "@/components/ui/badge"; // <-- Import Badge for indicator

// --- Interfaces ---
interface Group {
  groupID: string;
  groupName: string;
  // Add other potential fields if needed from API
}

interface Message {
  messageId?: string; // Optional from historical fetch
  senderUsername: string;
  groupId: string;
  messageText: string;
  timestamp: number; // Unix timestamp
}

// --- API Configuration ---
const LIST_GROUPS_ENDPOINT = import.meta.env.VITE_GROUPS_ENDPOINT;
const GET_MESSAGES_ENDPOINT = import.meta.env.VITE_GET_MESSAGES_ENDPOINT;
const INVITE_USER_ENDPOINT = import.meta.env.VITE_INVITE_USER_ENDPOINT;
const WEBSOCKET_ENDPOINT = import.meta.env.VITE_WEBSOCKET_ENDPOINT; 
const API_KEY = import.meta.env.VITE_API_KEY;

// --- Helper: Centered Message ---
const CenteredMessage = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("flex h-full flex-col items-center justify-center space-y-2 p-6 text-muted-foreground", className)}>
       {children}
    </div>
);

// --- Main Component ---
export default function MessagesPage() {
  const navigate = useNavigate();
  const currentUsername = localStorage.getItem("username"); // Get username saved during login
  const token = localStorage.getItem("token");
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // --- ADD REF FOR SELECTED GROUP ID ---
  const selectedGroupIdRef = useRef<string | null>(null);
  // --- END ADD REF ---

  // State
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const {
      addUnreadGroup,
      removeUnreadGroup,
      unreadGroupIds,
      setAllGroups // <-- Get function to update all groups in context
  } = useNotifications(); // <-- Use the context hook

  // --- Fetch Groups ---
  const fetchGroups = useCallback(async () => {
    if (!currentUsername || !token || !API_KEY) {
      setGroupsError("Authentication or configuration error.");
      setGroupsLoading(false);
      if (!token) navigate("/login");
      return;
    }
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const response = await fetch(LIST_GROUPS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-api-key": API_KEY },
        body: JSON.stringify({ username: currentUsername }),
      });
      if (!response.ok) throw new Error(`Failed to fetch groups (Status: ${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.groups)) throw new Error("Invalid group data format.");
      setGroups(data.groups);
      setAllGroups(data.groups); // <-- Update groups in context
    } catch (err: any) {
      console.error("Error fetching groups:", err);
      setGroupsError(err.message || "Failed to load groups.");
      toast.error("Failed to load groups.");
      setAllGroups([]); // Clear groups in context on error
    } finally {
      setGroupsLoading(false);
    }
  }, [currentUsername, token, navigate, setAllGroups]); // <-- Add setAllGroups dependency

  // --- Fetch Historical Messages ---
  const fetchMessages = useCallback(async (groupId: string) => {
    if (!token || !API_KEY) {
      setMessagesError("Authentication or configuration error.");
      setMessagesLoading(false);
      if (!token) navigate("/login");
      return;
    }
    setMessagesLoading(true);
    setMessagesError(null);
    setMessages([]); // Clear previous messages
    try {
      const response = await fetch(GET_MESSAGES_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-api-key": API_KEY },
        body: JSON.stringify({ groupId }),
      });
      if (!response.ok) throw new Error(`Failed to fetch messages (Status: ${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.messages)) throw new Error("Invalid message data format.");
      // Sort messages by timestamp just in case
      const sortedMessages = data.messages.sort((a: Message, b: Message) => a.timestamp - b.timestamp);
      setMessages(sortedMessages);
    } catch (err: any) {
      console.error(`Error fetching messages for group ${groupId}:`, err);
      setMessagesError(err.message || "Failed to load messages.");
      toast.error("Failed to load messages for this group.");
    } finally {
      setMessagesLoading(false);
    }
  }, [token, navigate]);

  // --- UPDATE REF WHEN SELECTED GROUP CHANGES ---
  useEffect(() => {
    selectedGroupIdRef.current = selectedGroup ? selectedGroup.groupID : null;
    // Mark group as read when selected
    if (selectedGroup) {
        removeUnreadGroup(selectedGroup.groupID); // <-- Mark as read
    }
  }, [selectedGroup, removeUnreadGroup]); // <-- Add removeUnreadGroup dependency

  // --- WebSocket Connection ---
  useEffect(() => {
    if (!token) {
      console.error("WebSocket: No token found. Connection aborted.");
      setIsConnected(false);
      return;
    }

    // --- ENSURE THIS CHANGE IS APPLIED ---
    const baseEndpoint = WEBSOCKET_ENDPOINT.endsWith('/') ? WEBSOCKET_ENDPOINT.slice(0, -1) : WEBSOCKET_ENDPOINT;
    const wsUrl = `${baseEndpoint}?token=${encodeURIComponent(token)}`;
    // --- END CHANGE ---

    console.log("Attempting WebSocket connection with URL:", wsUrl); // Log the URL with token

    // Prevent duplicate connections
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN)) {
      console.log("WebSocket connection attempt skipped: Already connecting or open.");
      return;
    }

    // Clean up previous instance
    if (ws.current) {
        ws.current.close(1000, "Starting new connection");
    }

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      // Check if this is still the current socket instance when event fires
      if (socket === ws.current) {
        console.log("WebSocket Connected");
        setIsConnected(true);
        toast.success("Chat connected");
      } else {
        console.log("onopen received for an old WebSocket instance.");
        socket.close(); // Close the obsolete socket
      }
    };

    socket.onclose = (event) => {
      console.log("WebSocket Disconnected:", event.reason, `Code: ${event.code}`);
      // Only update state if the closing socket is the current one
      if (socket === ws.current) {
        setIsConnected(false);
        ws.current = null; // Clear the ref when the current socket closes
        if (event.code !== 1000 && event.code !== 1005) { // Avoid toast for normal/expected closure
          toast.error(`Chat disconnected (${event.code}). Check connection or try refreshing.`);
          // Consider adding reconnection logic here if desired
        }
      } else {
         console.log("onclose received for an old WebSocket instance.");
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      // Only update state if the error is from the current socket
      if (socket === ws.current) {
        toast.error("Chat connection error.");
        setIsConnected(false); // Reflect error state
        // ws.current might be nullified by onclose shortly after, handle carefully
      } else {
          console.log("onerror received for an old WebSocket instance.");
      }
    };

    socket.onmessage = (event) => {
       // Ignore messages from obsolete sockets
       if (socket !== ws.current) {
           console.log("onmessage received for an old WebSocket instance. Ignoring.");
           return;
       }
      try {
        const message: Message = JSON.parse(event.data);

        let messageAdded = false;
        setMessages((prevMessages) => {
          if (selectedGroupIdRef.current && message.groupId === selectedGroupIdRef.current) {
            messageAdded = true;
            if (message.messageId && prevMessages.some(m => m.messageId === message.messageId)) {
                return prevMessages;
            }
            return [...prevMessages, message];
          }
          return prevMessages;
        });

        // --- FIX: Only notify if NOT from current user ---
        if (
          !messageAdded &&
          message.senderUsername !== currentUsername // <-- Only notify if not your own message
        ) {
            addUnreadGroup(message.groupId);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", event.data, e);
      }
    };

    return () => {
        console.log("Cleanup: Closing WebSocket instance for URL:", socket.url);
        // Remove listeners before closing
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, "Component unmounting");
        }
        // If this socket is still the current one in the ref, clear the ref
        if (ws.current === socket) {
            ws.current = null;
            setIsConnected(false); // Ensure disconnected state on unmount
        }
      };
      // Dependency array: Re-run effect only if the token changes.
    }, [token, addUnreadGroup, currentUsername]); // <-- Add addUnreadGroup dependency

  // --- Initial Group Fetch ---
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // --- Event Handlers ---
  const handleGroupSelect = (group: Group) => {
    if (selectedGroup?.groupID === group.groupID) return;
    setSelectedGroup(group);
    fetchMessages(group.groupID);
    // removeUnreadGroup(group.groupID); // <-- Moved to useEffect [selectedGroup]
  };

  const handleSendMessage = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      toast.error("Chat not connected. Cannot send message.");
      return;
    }
    if (!selectedGroup) {
      toast.error("Please select a group to send a message.");
      return;
    }
    if (newMessage.trim() === "") {
      return; // Don't send empty messages
    }

    const payload = {
      action: "sendmessage",
      groupId: selectedGroup.groupID,
      messageText: newMessage.trim(),
    };

    try {
      console.log("Sending message:", payload);
      ws.current.send(JSON.stringify(payload));
      setNewMessage(""); // Clear input after sending
    } catch (error) {
      console.error("Failed to send message via WebSocket:", error);
      toast.error("Failed to send message.");
    }
  };

  const handleInviteUser = async () => {
    if (!selectedGroup || !inviteUsername.trim() || !token || !API_KEY) {
      toast.error("Missing information for invite.");
      return;
    }
    setInviteLoading(true);
    try {
      const response = await fetch(INVITE_USER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-api-key": API_KEY },
        body: JSON.stringify({
          groupId: selectedGroup.groupID,
          usernameToInvite: inviteUsername.trim(),
        }),
      });

      const result = await response.json(); // Try to get response body regardless of status

      if (!response.ok) {
        throw new Error(result.error || `Failed to invite user (Status: ${response.status})`);
      }

      toast.success(result.message || `${inviteUsername} invited successfully!`);
      setIsInviteDialogOpen(false); // Close dialog on success
      setInviteUsername(""); // Clear input

    } catch (err: any) {
      console.error("Error inviting user:", err);
      toast.error(`Invite failed: ${err.message}`);
    } finally {
      setInviteLoading(false);
    }
  };

  // --- Filtering Groups ---
  const filteredGroups = groups.filter((group) =>
    group.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Timestamp Formatting ---
  const formatTimestamp = (timestamp: number): string => {
    try {
      return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error("Error formatting timestamp:", timestamp, e);
      return "Invalid Date";
    }
  };

  // --- Render Logic ---
  return (
    // Root container: Full height flex row
    <div className="flex h-full border-t">

      {/* Left Sidebar: Fixed width, doesn't shrink */}
      <Sidebar
        className="shrink-0 border-r !bg-muted/40 p-0"
        variant="sidebar"
        collapsible="none"
      >
        {/* SidebarHeader for the search input area */}
        <SidebarHeader className="p-4 border-b"> {/* Add padding back */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search groups..."
              // Use sidebar input styling if available, or keep current
              className="w-full rounded-lg bg-background pl-8 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </SidebarHeader>

        {/* SidebarContent handles the scrolling automatically */}
        <SidebarContent className="p-0"> {/* Remove default padding if nav adds its own */}
          {/* Optional: Wrap nav in ScrollArea if SidebarContent doesn't scroll as expected */}
          {/* <ScrollArea className="flex-1"> */}
            <nav className="grid gap-1 p-2"> {/* Keep padding for nav items */}
              {groupsLoading && (
                <CenteredMessage className="min-h-[100px]">
                  <Loader2 className="size-5 animate-spin" />
                </CenteredMessage>
              )}
              {groupsError && !groupsLoading && (
                 <CenteredMessage className="min-h-[100px] text-xs text-destructive">{groupsError}</CenteredMessage>
              )}
              {!groupsLoading && !groupsError && filteredGroups.length === 0 && (
                 <CenteredMessage className="min-h-[100px] text-sm">No groups found.</CenteredMessage>
              )}
              {/* Use SidebarMenu structure */}
              <SidebarMenu>
                {!groupsLoading && !groupsError && filteredGroups.map((group) => {
                  const isUnread = unreadGroupIds.has(group.groupID); // <-- Check if unread
                  return (
                    <SidebarMenuItem key={group.groupID}>
                      {/* Use SidebarMenuButton for consistent styling and hover effects */}
                      <SidebarMenuButton
                        className="w-full justify-start gap-2 relative" // Add relative for badge positioning
                        isActive={selectedGroup?.groupID === group.groupID} // Use isActive prop
                        onClick={() => handleGroupSelect(group)}
                      >
                        <Users className="h-4 w-4" />
                        <span className="truncate flex-1">{group.groupName}</span>
                        {/* Visual Indicator */}
                        {isUnread && (
                          <Badge variant="destructive" className="h-2 w-2 p-0 ml-auto" /> // Simple red dot badge
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          {/* </ScrollArea> */}
        </SidebarContent>
        {/* Optional: SidebarFooter */}
        {/* <SidebarFooter className="p-4 border-t"> ... </SidebarFooter> */}
      </Sidebar>

      {/* Right Pane: Takes remaining width, flex column, clips overflow */}
      {/* --- MODIFY THIS LINE --- */}
      <div className="flex flex-1 flex-col overflow-hidden-mt-12"> {/* Removed h-full */}
      {/* --- END MODIFICATION --- */}
        {!selectedGroup ? (
          <CenteredMessage>
            <Users className="size-12 mb-4" />
            <p className="text-lg font-medium">Select a group</p>
            <p>Choose a group from the left sidebar to start chatting.</p>
          </CenteredMessage>
        ) : (
          <>
            {/* Chat Header: Fixed height, doesn't shrink */}
            <div className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
              <h2 className="text-lg font-semibold truncate">{selectedGroup.groupName}</h2>
              <AlertDialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Invite User to "{selectedGroup.groupName}"</AlertDialogTitle>
                    <AlertDialogDescription>
                      Enter the username of the person you want to invite to this group.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="invite-username" className="text-right">
                        Username
                      </Label>
                      <Input
                        id="invite-username"
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., professor2"
                        disabled={inviteLoading}
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={inviteLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleInviteUser} disabled={!inviteUsername.trim() || inviteLoading}>
                      {inviteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Invite
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Message List: Takes remaining vertical space, scrolls internally */}
            {/* --- MODIFY THIS LINE --- */}
            {/* Reduce bottom padding (e.g., from p-4 to px-4 pt-4 pb-2) */}
            <ChatMessageList className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
            {/* --- END MODIFICATION --- */}
              {messagesLoading && (
                <CenteredMessage>
                  <Loader2 className="size-6 animate-spin" />
                  <span className="mt-2">Loading messages...</span>
                </CenteredMessage>
              )}
              {messagesError && !messagesLoading && (
                 <CenteredMessage className="text-destructive">{messagesError}</CenteredMessage>
              )}
              {!messagesLoading && !messagesError && messages.length === 0 && (
                 <CenteredMessage>No messages yet. Start the conversation!</CenteredMessage>
              )}
              {!messagesLoading && !messagesError && messages.map((msg, index) => (
                <ChatBubble
                  key={msg.messageId || `${msg.senderUsername}-${msg.timestamp}-${index}`} // Use messageId if available, fallback otherwise
                  variant={msg.senderUsername === currentUsername ? "sent" : "received"}
                >
                  {/* Conditionally show avatar for received messages */}
                  {msg.senderUsername !== currentUsername && (
                     <ChatBubbleAvatar
                        fallback={msg.senderUsername.substring(0, 2).toUpperCase()}
                        // src={/* Add avatar source if available */}
                     />
                  )}
                  <ChatBubbleMessage>
                    {/* Show sender name for received messages */}
                    {msg.senderUsername !== currentUsername && (
                       <p className="text-xs font-semibold mb-1 text-muted-foreground">{msg.senderUsername}</p>
                    )}
                    {msg.messageText}
                    <ChatBubbleTimestamp timestamp={formatTimestamp(msg.timestamp)} />
                  </ChatBubbleMessage>
                </ChatBubble>
              ))}
            </ChatMessageList>

            {/* Message Input Area: Fixed padding/border, doesn't shrink */}
            {/* --- MODIFY THIS LINE --- */}
            {/* Reduce top padding (e.g., from p-4 to px-4 pt-2 pb-4) */}
            <div className="border-t px-4 pt-2 pb-4 bg-background shrink-0">
            {/* --- END MODIFICATION --- */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* ChatInput: Takes remaining horizontal space within the form */}
                <ChatInput
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={!isConnected || messagesLoading}
                  className="flex-1 " // Allows input to grow horizontally
                />
                {/* Send Button: Fixed size */}
                <Button type="submit" size="icon" disabled={!isConnected || !newMessage.trim() || messagesLoading}>
                  <SendHorizontal className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
              {/* Disconnected indicator */}
              {!isConnected && <p className="text-xs text-destructive text-center mt-1">Chat disconnected.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}