import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Wifi, Folder, Zap } from "lucide-react";
import type { ServerStatusResponse, ServerLog } from "@shared/schema";

export default function StatusCards() {
  const { data: serverStatus } = useQuery<ServerStatusResponse>({
    queryKey: ["/api/server/status"],
  });

  const { data: logs } = useQuery<ServerLog[]>({
    queryKey: ["/api/server/logs"],
  });

  const cards = [
    {
      title: "Server Status",
      value: serverStatus?.status || "Running",
      subtitle: "Online",
      icon: Sparkles,
      bgColor: "bg-accent",
      textColor: "text-accent-foreground",
      statusColor: "text-accent",
      testId: "card-server-status"
    },
    {
      title: "API Routes",
      value: "8",
      subtitle: "Active",
      icon: Wifi,
      bgColor: "bg-primary",
      textColor: "text-primary-foreground",
      statusColor: "text-primary",
      testId: "card-api-routes"
    },
    {
      title: "Static Files",
      value: "24",
      subtitle: "Files",
      icon: Folder,
      bgColor: "bg-secondary",
      textColor: "text-secondary-foreground",
      statusColor: "text-secondary",
      testId: "card-static-files"
    },
    {
      title: "Uptime",
      value: serverStatus?.uptime || "0m",
      subtitle: "Running",
      icon: Zap,
      bgColor: "bg-chart-2",
      textColor: "text-white",
      statusColor: "text-chart-2",
      testId: "card-uptime"
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="overflow-hidden shadow border border-border" data-testid={card.testId}>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${card.bgColor} ${card.textColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">
                      {card.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-foreground" data-testid={`text-${card.testId}-value`}>
                        {card.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${card.statusColor}`}>
                        {card.title === "Server Status" && (
                          <div className="w-2 h-2 bg-accent rounded-full mr-1"></div>
                        )}
                        {card.subtitle}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
