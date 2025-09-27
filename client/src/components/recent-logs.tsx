import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ServerLog } from "@shared/schema";

export default function RecentLogs() {
  const { data: logs, isLoading } = useQuery<ServerLog[]>({
    queryKey: ["/api/server/logs"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusBadgeVariant = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "bg-accent text-accent-foreground";
    if (statusCode >= 300 && statusCode < 400) return "bg-secondary text-secondary-foreground";
    if (statusCode >= 400) return "bg-destructive text-destructive-foreground";
    return "bg-primary text-primary-foreground";
  };

  const getStatusDotColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "bg-accent";
    if (statusCode >= 300 && statusCode < 400) return "bg-secondary";
    if (statusCode >= 400) return "bg-destructive";
    return "bg-primary";
  };

  const formatTimeAgo = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="mt-8">
      <Card className="overflow-hidden shadow border border-border" data-testid="card-recent-logs">
        <CardHeader className="border-b border-border bg-muted px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold leading-6 text-foreground">Recent Activity</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Latest server logs and requests</p>
            </div>
            <Button variant="outline" data-testid="button-view-all-logs">
              View All
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-4 py-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading logs...</p>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground" data-testid="text-no-logs">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="px-4 py-4 sm:px-6 hover:bg-muted/50 transition-colors"
                  data-testid={`log-entry-${log.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-2 ${getStatusDotColor(log.statusCode)} rounded-full`}></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate" data-testid={`text-log-method-path-${log.id}`}>
                          {log.method} {log.path}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-log-details-${log.id}`}>
                          {log.statusCode >= 200 && log.statusCode < 300 && "OK"} 
                          {log.statusCode >= 300 && log.statusCode < 400 && "Redirect"}
                          {log.statusCode >= 400 && log.statusCode < 500 && "Client Error"}
                          {log.statusCode >= 500 && "Server Error"}
                          {" - "}Response time: {log.responseTime}ms
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusBadgeVariant(log.statusCode)} data-testid={`badge-status-${log.id}`}>
                        {log.statusCode}
                      </Badge>
                      <span className="text-sm text-muted-foreground" data-testid={`text-log-time-${log.id}`}>
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
