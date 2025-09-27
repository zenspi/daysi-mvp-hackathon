import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import type { ServerConfig, ServerStatusResponse } from "@shared/schema";

export default function ServerConfig() {
  const { data: config } = useQuery<ServerConfig>({
    queryKey: ["/api/server/config"],
  });

  const { data: serverStatus } = useQuery<ServerStatusResponse>({
    queryKey: ["/api/server/status"],
  });

  return (
    <Card className="overflow-hidden shadow border border-border" data-testid="card-server-config">
      <CardHeader className="border-b border-border bg-muted px-4 py-5 sm:px-6">
        <h3 className="text-base font-semibold leading-6 text-foreground">Server Configuration</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Current Express.js server settings</p>
      </CardHeader>
      
      <CardContent className="px-4 py-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-muted-foreground">Port</dt>
            <dd className="mt-1 text-sm text-foreground font-mono" data-testid="text-config-port">
              {serverStatus?.port || config?.port || "5000"}
            </dd>
          </div>
          
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-muted-foreground">Environment</dt>
            <dd className="mt-1 text-sm text-foreground">
              <Badge className="bg-accent text-accent-foreground" data-testid="badge-config-environment">
                {serverStatus?.environment || config?.environment || "Development"}
              </Badge>
            </dd>
          </div>
          
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">CORS Enabled</dt>
            <dd className="mt-1 flex items-center space-x-2">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span className="text-sm text-foreground" data-testid="text-config-cors">
                {config?.corsEnabled || "Yes - All Origins"}
              </span>
            </dd>
          </div>
          
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">Body Parser</dt>
            <dd className="mt-1 text-sm text-foreground" data-testid="text-config-body-parser">
              {config?.bodyParserLimit || "JSON (limit: 50mb)"}
            </dd>
          </div>
          
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">Static Directory</dt>
            <dd className="mt-1 text-sm text-foreground font-mono" data-testid="text-config-static-dir">
              {config?.staticDirectory || "./public"}
            </dd>
          </div>
        </dl>
        
        <div className="mt-6">
          <Button variant="outline" data-testid="button-edit-config">
            <Edit className="mr-1.5 h-4 w-4" />
            Edit Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
