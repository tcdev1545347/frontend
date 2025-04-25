import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export function DashboardLayout() {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background">
          <AppSidebar />
          {/* --- MODIFY THIS LINE --- */}
          <main className="flex-1"> {/* Removed overflow-y-auto */}
          {/* --- END MODIFICATION --- */}
             <Outlet /> {/* MessagesPage renders here */}
          </main>
        </div>
      </SidebarProvider>
    );
  }