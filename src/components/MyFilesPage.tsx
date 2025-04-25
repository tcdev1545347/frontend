import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // Use Link for SPA navigation
import {
  FolderIcon,
  FileIcon,
  Loader2,
  UploadIcon,
  DownloadIcon,
  Users,
  ArrowLeftIcon, // Re-use from HomePage
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { toast } from "sonner"; // Import toast for notifications


// --- Interfaces ---
interface Group {
  groupID: string;
  groupName: string;
}

interface FileInfo {
  filename: string;
  downloadUrl: string | null; // URL might be null
}

// --- API Configuration ---
const LIST_GROUPS_ENDPOINT = import.meta.env.VITE_GROUPS_ENDPOINT 
const LIST_FILES_ENDPOINT = import.meta.env.VITE_LIST_FILES_ENDPOINT
const API_KEY = import.meta.env.VITE_API_KEY;

// --- Helper: Centered Message ---
const CenteredMessage = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("flex min-h-[calc(100vh-200px)] flex-col items-center justify-center space-y-2 p-6 text-muted-foreground", className)}>
       {children}
    </div>
);

// --- Main Component ---
export default function MyFilesPage() {
  const navigate = useNavigate();
  

  // State for groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // State for selected group and its files
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false); // Add state for upload loading

  // --- Upload Handler ---
  const handleFileUpload = async (file: File, groupId: string) => {
    setUploadLoading(true);
    const token = localStorage.getItem("token");

    if (!token || !API_KEY) {
      toast.error("Upload failed: Authentication or configuration error.");
      setUploadLoading(false);
      if (!token) navigate("/login");
      return;
    }

    // Encode filename for the URL path
    const encodedFilename = encodeURIComponent(file.name);
    const UPLOAD_ENDPOINT = import.meta.env.VITE_UPLOAD_ENDPOINT + `/${groupId}/${encodedFilename}`;

    try {
      const response = await fetch(UPLOAD_ENDPOINT, {
        method: "PUT", // Use PUT as we're specifying the resource path
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": API_KEY,
          "Content-Type": file.type || "application/octet-stream", // Use file's MIME type
        },
        body: file, // Pass the file object directly as the body
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error details
        throw new Error(
          `Upload failed (Status: ${response.status}): ${errorData.error || response.statusText}`
        );
      }

      const result = await response.json();
      toast.success(result.message || `File "${file.name}" uploaded successfully!`);
      // Refresh the file list for the current group
      fetchFiles(groupId);

    } catch (err: any) {
      console.error("Error uploading file:", err);
      toast.error(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setUploadLoading(false);
    }
  };

  // --- Trigger File Input ---
  const handleUploadClick = () => {
    if (!selectedGroup) return; // Should be disabled, but double-check

    // Create a hidden file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none";

    // Add event listener for when a file is selected
    fileInput.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        handleFileUpload(file, selectedGroup.groupID); // Pass file and groupId
      }
      // Clean up the input element
      document.body.removeChild(fileInput);
    };

    // Append to body and trigger click
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  // --- Fetch Groups (Similar to HomePage) ---
  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    const token = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");

    if (!token || !storedUsername || !API_KEY) {
      setGroupsError("Authentication or configuration error.");
      setGroupsLoading(false);
      // Consider redirecting if token is missing
      if (!token) navigate("/login");
      return;
    }

    try {
      const response = await fetch(LIST_GROUPS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-api-key": API_KEY },
        body: JSON.stringify({ username: storedUsername }),
      });
      if (!response.ok) throw new Error(`Failed to fetch groups (Status: ${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.groups)) throw new Error("Invalid group data format.");
      setGroups(data.groups);
    } catch (err: any) {
      console.error("Error fetching groups:", err);
      setGroupsError(err.message || "Failed to load groups.");
    } finally {
      setGroupsLoading(false);
    }
  }, [navigate]);

  // --- Fetch Files for a Selected Group ---
  const fetchFiles = useCallback(async (groupId: string) => {
    setFilesLoading(true);
    setFilesError(null);
    setFiles([]); // Clear previous files
    const token = localStorage.getItem("token");

    if (!token || !API_KEY) {
      setFilesError("Authentication or configuration error.");
      setFilesLoading(false);
      if (!token) navigate("/login");
      return;
    }

    try {
      const response = await fetch(LIST_FILES_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-api-key": API_KEY },
        body: JSON.stringify({ groupId }),
      });
      if (!response.ok) throw new Error(`Failed to fetch files (Status: ${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.files)) throw new Error("Invalid files data format.");
      // Decode filenames before setting state
      const decodedFiles = data.files.map((file: FileInfo) => ({
        ...file,
        filename: decodeURIComponent(file.filename || ""), // Decode URI component
      }));
      setFiles(decodedFiles);
    } catch (err: any) {
      console.error(`Error fetching files for group ${groupId}:`, err);
      setFilesError(err.message || "Failed to load files for this group.");
    } finally {
      setFilesLoading(false);
    }
  }, [navigate]);

  // --- Initial Group Fetch ---
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // --- Event Handlers ---
  const handleGroupClick = (group: Group) => {
    setSelectedGroup(group);
    fetchFiles(group.groupID); // Fetch files when group is selected
  };

  const handleGoBackToGroups = () => {
    setSelectedGroup(null); // Go back to group view
    setFiles([]); // Clear files
    setFilesError(null);
  };


  // --- Render Logic ---

  // Loading state for groups
  if (groupsLoading) {
    return (
      <CenteredMessage>
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="mt-2">Loading groups...</span>
      </CenteredMessage>
    );
  }

  // Error state for groups
  if (groupsError) {
    return <CenteredMessage className="text-destructive">{groupsError}</CenteredMessage>;
  }

  // Main content rendering
  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Top Bar */}
      <div className="flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6 sticky top-0 z-10 gap-4"> {/* Added gap */}
        <div className="flex items-center gap-2"> {/* Wrapper for back button and breadcrumb */}
          {/* Conditionally Render Back Button */}
          {selectedGroup && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGoBackToGroups} // Use the renamed handler
              aria-label="Go back to groups"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          )}
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {/* Make "My Files" clickable only when a group is selected */}
                {selectedGroup ? (
                  <BreadcrumbLink
                    onClick={handleGoBackToGroups} // Use the renamed handler
                    className="cursor-pointer"
                  >
                    My Files
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>My Files</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {selectedGroup && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{selectedGroup.groupName}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Action Buttons (Upload) */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Updated Upload Button */}
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedGroup || uploadLoading}
            onClick={handleUploadClick}
          >
            {uploadLoading ? (
              <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
            ) : (
              <UploadIcon className="h-4 w-4 mr-1 sm:mr-2" />
            )}
            <span className="hidden sm:inline">
              {uploadLoading ? "Uploading..." : "Upload"}
            </span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Show Group Folders */}
        {!selectedGroup && (
          <>
            {groups.length === 0 ? (
               <CenteredMessage>
                  <Users className="size-10 mb-3" />
                  <p className="text-lg font-medium">You are not part of any groups.</p>
                  <p className="text-sm">Go to 'Home' to create or join groups.</p>
               </CenteredMessage>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {groups.map((group) => (
                  <button
                    key={group.groupID}
                    onClick={() => handleGroupClick(group)}
                    className="group relative block w-full rounded-md border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <div className="flex h-16 w-full items-center justify-center sm:h-20">
                      <FolderIcon className="h-10 w-10 text-muted-foreground group-hover:text-primary sm:h-12 sm:w-12" />
                    </div>
                    <div className="mt-3 text-center sm:mt-4">
                      <h3 className="truncate text-sm font-medium text-foreground">{group.groupName}</h3>
                      {/* Placeholder for item count if available later */}
                      {/* <p className="mt-1 text-xs text-muted-foreground">0 items</p> */}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Show Files within Selected Group */}
        {selectedGroup && (
          <>
            {filesLoading && (
              <CenteredMessage>
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="mt-2">Loading files for {selectedGroup.groupName}...</span>
              </CenteredMessage>
            )}
            {filesError && !filesLoading && (
              <CenteredMessage className="text-destructive">
                Error loading files: {filesError}
              </CenteredMessage>
            )}
            {!filesLoading && !filesError && files.length === 0 && (
               <CenteredMessage>
                  <FileIcon className="size-10 mb-3" />
                  <p className="text-lg font-medium">No files found in this group.</p>
               </CenteredMessage>
            )}
            {!filesLoading && !filesError && files.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {files.map((file) => (
                  <div
                    key={file.filename} // Use filename as key if unique within group
                    className="group relative rounded-md border border-border bg-card p-4 shadow-sm"
                  >
                    {/* Use an anchor tag for download if URL exists */}
                    {file.downloadUrl ? (
                       <a
                          href={file.downloadUrl}
                          target="_blank" // Open in new tab
                          rel="noopener noreferrer"
                          download={file.filename} // Suggest original filename for download
                          className="absolute inset-0 z-10"
                          aria-label={`Download ${file.filename}`}
                       >
                          <span className="sr-only">Download file</span>
                       </a>
                    ) : (
                       <div className="absolute inset-0 z-10 bg-black/10 flex items-center justify-center text-xs text-destructive-foreground rounded-md">
                          Unavailable
                       </div>
                    )}
                    <div className="flex h-16 w-full items-center justify-center sm:h-20">
                      <FileIcon className={`h-10 w-10 sm:h-12 sm:w-12 ${file.downloadUrl ? 'text-muted-foreground group-hover:text-primary' : 'text-muted-foreground/50'}`} />
                    </div>
                    <div className="mt-3 text-center sm:mt-4">
                      <h3 className={`truncate text-sm font-medium ${file.downloadUrl ? 'text-foreground' : 'text-muted-foreground'}`}>{file.filename}</h3>
                      {/* Placeholder for file size if available later */}
                      {/* <p className="mt-1 text-xs text-muted-foreground">0 MB</p> */}
                    </div>
                     {/* Optional: Add a dedicated download button if needed */}
                     {file.downloadUrl && (
                        <Button
                           variant="outline"
                           size="sm"
                           className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                           asChild // Use anchor tag behavior from parent 'a' if possible, or handle click
                        >
                           <a href={file.downloadUrl} download={file.filename} target="_blank" rel="noopener noreferrer">
                              <DownloadIcon className="h-3 w-3" />
                           </a>
                        </Button>
                     )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}