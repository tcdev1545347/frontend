import { createContext, useState, useContext, useCallback, useMemo, ReactNode } from 'react';

// Define the shape of a group (minimal for context)
interface GroupInfo {
    groupID: string;
    groupName: string;
}

// Define the shape of the context value
interface NotificationContextType {
    unreadGroupIds: Set<string>;
    addUnreadGroup: (groupId: string) => void;
    removeUnreadGroup: (groupId: string) => void;
    hasUnread: boolean;
    allGroups: GroupInfo[]; // Add all groups here
    setAllGroups: (groups: GroupInfo[]) => void; // Function to update groups
}

// Create the context with a default value
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Create the provider component
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [unreadGroupIds, setUnreadGroupIds] = useState<Set<string>>(new Set());
    const [allGroups, setAllGroupsState] = useState<GroupInfo[]>([]); // State for all groups

    const addUnreadGroup = useCallback((groupId: string) => {
        setUnreadGroupIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(groupId);
            return newSet;
        });
    }, []);

    const removeUnreadGroup = useCallback((groupId: string) => {
        setUnreadGroupIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(groupId);
            return newSet;
        });
    }, []);

    const setAllGroups = useCallback((groups: GroupInfo[]) => {
        setAllGroupsState(groups);
    }, []);

    const hasUnread = useMemo(() => unreadGroupIds.size > 0, [unreadGroupIds]);

    const value = useMemo(() => ({
        unreadGroupIds,
        addUnreadGroup,
        removeUnreadGroup,
        hasUnread,
        allGroups, // Provide groups
        setAllGroups // Provide setter
    }), [unreadGroupIds, addUnreadGroup, removeUnreadGroup, hasUnread, allGroups, setAllGroups]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

// Create a custom hook for easy consumption
export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};