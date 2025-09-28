import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Mic, MessageCircle, Search, User, Download } from "lucide-react";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const [currentLang, setCurrentLang] = useState<'en' | 'es'>('en');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // PWA install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'es' : 'en';
    setCurrentLang(newLang);
    localStorage.setItem('preferredLanguage', newLang);
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/voice', icon: Mic, label: 'Voice' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/search/providers', icon: Search, label: 'Search' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="font-semibold text-lg">Ask Daysi</span>
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            {/* Language Chip */}
            <Badge 
              variant="outline" 
              className="cursor-pointer px-2 py-1"
              onClick={toggleLanguage}
              data-testid="language-toggle"
            >
              {currentLang === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
            </Badge>
            
            {/* Install App Button */}
            {showInstallPrompt && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleInstallClick}
                className="text-xs"
                data-testid="button-install-app"
              >
                <Download className="w-3 h-3 mr-1" />
                Install
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path || 
              (path === '/search/providers' && location.startsWith('/search'));
            
            return (
              <Link key={path} href={path}>
                <div 
                  className={`flex flex-col items-center p-2 min-w-[60px] ${
                    isActive 
                      ? 'text-sky-500' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs mt-1">{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}