import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import StatusCards from "@/components/status-cards";
import ServerConfig from "@/components/server-config";
import QuickActions from "@/components/quick-actions";
import RecentLogs from "@/components/recent-logs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";
import type { ServerStatusResponse } from "@shared/schema";

export default function Dashboard() {
  const { data: serverStatus } = useQuery<ServerStatusResponse>({
    queryKey: ["/api/server/status"],
    refetchInterval: 30000, // Update every 30 seconds
  });

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Navigation */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-card border-b border-border">
          <button 
            type="button" 
            className="border-r border-border px-4 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring lg:hidden"
            data-testid="button-toggle-sidebar"
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          
          <div className="flex flex-1 justify-between px-4 lg:px-6">
            <div className="flex flex-1">
              <div className="flex w-full md:ml-0">
                <div className="relative w-full max-w-lg">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input 
                    className="pl-10" 
                    placeholder="Search..." 
                    type="search"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground" data-testid="text-server-status">
                  {serverStatus?.status || "Server Running"}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* Page Header */}
              <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight">
                    Dashboard
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Monitor your Express.js server status and configuration
                  </p>
                </div>
                <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
                  <Button variant="outline" data-testid="button-view-logs">
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    View Logs
                  </Button>
                  <Button data-testid="button-restart-server">
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Restart Server
                  </Button>
                </div>
              </div>

              <StatusCards />

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <ServerConfig />
                <QuickActions />
              </div>

              <RecentLogs />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
