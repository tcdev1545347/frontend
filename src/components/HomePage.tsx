import React, { useEffect, useState, useCallback } from "react"; // Import useCallback
import { Users, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input"; // <-- Import Input
import { Button } from "@/components/ui/button"; // <-- Import Button
import { Label } from "@/components/ui/label";   // <-- Import Label
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// API Endpoints and Key
const LIST_GROUPS_ENDPOINT = import.meta.env.VITE_GROUPS_ENDPOINT 
const CREATE_GROUP_ENDPOINT = import.meta.env.VITE_CREATE_GROUP_ENDPOINT
const API_KEY = import.meta.env.VITE_API_KEY;

// Group Interface
interface Group {
  groupID: string;
  groupName: string;
}

// Centered Message Component (for loading/error states)
const CenteredMessage = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("flex min-h-[calc(100vh-200px)] flex-col items-center justify-center space-y-2 p-6 text-muted-foreground", className)}>
       {children}
    </div>
);

export default function HomePage() {
  // State for listing groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [listLoading, setListLoading] = useState(true); // Renamed for clarity
  const [listError, setListError] = useState<string | null>(null); // Renamed for clarity

  // --- State for Creating Group ---
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // --- End State for Creating Group ---

  // --- Extracted fetchGroups function using useCallback ---
  const fetchGroups = useCallback(async (isInitialLoad = false) => {
    // Only show full page loader on initial load
    if (isInitialLoad) {
        setListLoading(true);
    }
    setListError(null); // Clear previous list errors

    const token = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");

    if (!token || !storedUsername) {
      setListError("Authentication details missing. Please log in.");
      if (isInitialLoad) setListLoading(false);
      return; // Stop fetching
    }
    if (!API_KEY) {
      setListError("API configuration error.");
      console.error("API Key is missing.");
      if (isInitialLoad) setListLoading(false);
      return; // Stop fetching
    }

    try {
      const response = await fetch(LIST_GROUPS_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-api-key": API_KEY,
        },
        body: JSON.stringify({ username: storedUsername }),
      });

      if (response.status === 401) {
          localStorage.removeItem("token"); localStorage.removeItem("username");
          setListError("Session expired. Please log in.");
          if (isInitialLoad) setListLoading(false);
          return;
      }
      if (!response.ok) {
          let errorMsg = `Failed to fetch groups (Status: ${response.status})`;
          try { const ed = await response.json(); errorMsg = ed.error || ed.message || errorMsg; } catch (e) {}
          throw new Error(errorMsg);
      }
      const data = await response.json();
      if (!Array.isArray(data.groups)) throw new Error("Invalid group data format.");
      setGroups(data.groups);
    } catch (err: any) {
      console.error("Error fetching groups:", err);
      setListError(err.message || "Failed to fetch groups.");
    } finally {
      if (isInitialLoad) {
          setListLoading(false);
      }
    }
  }, []); // Empty dependency array means this function doesn't change

  // --- Initial Fetch on Mount ---
  useEffect(() => {
    fetchGroups(true); // Pass true to indicate it's the initial load
  }, [fetchGroups]); // Depend on the memoized fetchGroups function

  // --- Handle Create Group API Call ---
  const handleCreateGroup = async () => {
     const trimmedGroupName = newGroupName.trim();
     if (!trimmedGroupName) {
         setCreateError("Group name cannot be empty.");
         return;
     }
     setIsCreating(true);
     setCreateError(null);

     const token = localStorage.getItem("token");
     // No need to check username here as create API doesn't seem to need it in body
     if (!token) {
        setCreateError("Not authenticated. Please log in.");
        setIsCreating(false);
        return;
     }
     if (!API_KEY) {
        setCreateError("API configuration error.");
        setIsCreating(false);
        return;
     }

     try {
        const response = await fetch(CREATE_GROUP_ENDPOINT, { // Use the CREATE endpoint
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`, // Send token
                "x-api-key": API_KEY,             // Send API key
            },
            body: JSON.stringify({ groupName: trimmedGroupName }), // Send new group name
        });

         if (response.status === 401) {
             localStorage.removeItem("token"); localStorage.removeItem("username");
             setCreateError("Session expired. Please log in.");
             // Consider redirecting
             return; // Stop before finally block resets isCreating
         }

         if (!response.ok) {
            let errorMsg = `Failed to create group (Status: ${response.status})`;
             try { const ed = await response.json(); errorMsg = ed.error || ed.message || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
         }

         // If successful:
         setNewGroupName(""); // Clear the input field
         setCreateError(null); // Clear any previous creation error
         console.log(`Group "${trimmedGroupName}" created successfully!`);
         // Refresh the list of groups to show the new one
         await fetchGroups(); // Re-fetch groups (isInitialLoad defaults to false)

     } catch (err: any) {
         console.error("Error creating group:", err);
         setCreateError(err.message || "Could not create group.");
     } finally {
         setIsCreating(false); // Re-enable button/input
     }
  };
  // --- End Handle Create Group ---


  // --- Loading State ---
  if (listLoading) {
    return (
      <CenteredMessage>
         <Loader2 className="size-8 animate-spin text-primary" />
         <span className="mt-2">Loading your groups...</span>
      </CenteredMessage>
    );
  }

  // --- Render Page Content ---
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* --- Title Section ---*/}
      <div className="flex items-center gap-3 pb-4 mb-6">
        <h1>
          Welcome to SafeDrop!
        </h1>
      </div>
      
      {/* --- Create Group Section --- */}
      {/* Wrap in a Card for consistent styling */}
      <Card className="mb-8 shadow-sm">
          <CardHeader>
             <CardTitle className="text-xl">Create New Group</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                  <div className="flex-grow grid gap-1.5">
                     {/* Use Label component linked to Input */}
                     <Label htmlFor="new-group-name">Group Name</Label>
                     <Input
                        id="new-group-name"
                        type="text"
                        placeholder="Enter name for the new group"
                        value={newGroupName}
                        onChange={(e) => { setNewGroupName(e.target.value); setCreateError(null); }} // Clear error on change
                        disabled={isCreating}
                        maxLength={100} // Optional: limit length
                     />
                  </div>
                  {/* Use Button component */}
                  <Button
                     onClick={handleCreateGroup}
                     disabled={isCreating || !newGroupName.trim()} // Disable if creating or name is empty/whitespace
                     className="sm:w-auto" // Prevent full width on larger screens
                  >
                     {isCreating ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Creating...
                        </>
                     ) : (
                        "Create Group"
                     )}
                  </Button>
              </div>
              {/* Display Create Error */}
              {createError && <p className="mt-2 text-sm text-destructive">{createError}</p>}
          </CardContent>
      </Card>
      {/* --- End Create Group Section --- */}


      {/* --- Display Groups Section --- */}
      <div className="flex items-center gap-3 border-b border-border pb-4 mb-6"> {/* Container with bottom border & padding */}
          {/* Icon using primary color for accent */}
          <Users className="size-7 text-primary flex-shrink-0" />
          {/* Heading text with slightly adjusted font weight */}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              My Groups
          </h1>
      </div>

      {/* Display error if fetching groups failed *after* initial load */}
      {listError && !listLoading && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Could not refresh groups: {listError}
          </div>
      )}

      {/* Display groups list or 'no groups' message */}
      {groups.length === 0 && !listError ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
              <Users className="size-10 text-muted-foreground mb-3" />
             <p className="text-lg font-medium text-muted-foreground">You are not part of any groups yet.</p>
          </div>
      ) : (
          // --- ADD THIS WRAPPER ---
          <div className="max-h-96 overflow-y-auto w-full"> {/* Adjust max-h-96 as needed */}
            <Accordion type="single" collapsible className="w-full space-y-2">
                {groups.map((group) => (
                    <AccordionItem value={group.groupID} key={group.groupID} className="rounded-md border border-border bg-card transition-colors hover:bg-muted/50">
                        <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                            <div className="flex flex-grow items-center gap-3">
                                <Users className="size-5 flex-shrink-0 text-primary" />
                                <span className="flex-grow truncate font-medium text-card-foreground">{group.groupName}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-1 pb-3 text-sm text-muted-foreground">
                            Content for {group.groupName} will be displayed here.
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
          </div>
          // --- END WRAPPER ---
      )}
      {/* --- End Display Groups Section --- */}

    </div>
  );
}
