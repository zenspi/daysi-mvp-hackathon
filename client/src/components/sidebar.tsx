import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Wifi, 
  Folder, 
  Settings, 
  FileText, 
  User 
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, current: location === "/" },
    { name: "API Routes", href: "/api-routes", icon: Wifi, current: location === "/api-routes" },
    { name: "Static Files", href: "/static-files", icon: Folder, current: location === "/static-files" },
    { name: "Configuration", href: "/configuration", icon: Settings, current: location === "/configuration" },
    { name: "Logs", href: "/logs", icon: FileText, current: location === "/logs" },
  ];

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow bg-sidebar border-r border-sidebar-border overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">D</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-sidebar-foreground">Daysi MVP</h2>
              <p className="text-xs text-muted-foreground">Express.js Server</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div 
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    item.current
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                  data-testid={`link-${item.name.toLowerCase().replace(" ", "-")}`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center space-x-3 px-4 py-2">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-sidebar-foreground" data-testid="text-username">
                Developer
              </p>
              <p className="text-xs text-muted-foreground">localhost:5000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
