import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Wifi, Shield, Folder, ChevronRight } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      title: "Test API Endpoints",
      description: "Send test requests to your routes",
      icon: Wifi,
      iconColor: "text-primary",
      testId: "action-test-endpoints"
    },
    {
      title: "CORS Settings",
      description: "Configure cross-origin requests",
      icon: Shield,
      iconColor: "text-secondary",
      testId: "action-cors-settings"
    },
    {
      title: "Manage Static Files",
      description: "Browse and upload public folder contents",
      icon: Folder,
      iconColor: "text-chart-2",
      testId: "action-manage-files"
    },
  ];

  return (
    <Card className="overflow-hidden shadow border border-border" data-testid="card-quick-actions">
      <CardHeader className="border-b border-border bg-muted px-4 py-5 sm:px-6">
        <h3 className="text-base font-semibold leading-6 text-foreground">Quick Actions</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Common development tasks</p>
      </CardHeader>
      
      <CardContent className="px-4 py-5 sm:p-6 space-y-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <div 
              key={action.title}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
              data-testid={action.testId}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Icon className={`h-6 w-6 ${action.iconColor}`} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{action.title}</h4>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
