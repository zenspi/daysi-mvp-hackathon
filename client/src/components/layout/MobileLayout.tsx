import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Mic, MessageCircle, Search, User, Download, Stethoscope, Heart } from "lucide-react";
import { useI18n, getLanguageInfo } from "@/contexts/I18nContext";
import { NotificationCenter } from "@/components/proactive/NotificationCenter";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const { language, setLanguage, t } = useI18n();
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
    const newLang = language === 'en' ? 'es' : 'en';
    setLanguage(newLang);
  };

  const navItems = [
    { path: '/', icon: Home, label: t('navigation.home') },
    { path: '/voice', icon: Mic, label: t('navigation.voice') },
    { path: '/chat', icon: MessageCircle, label: t('navigation.chat') },
    { path: '/search/providers', icon: Stethoscope, label: 'Providers' },
    { path: '/search/resources', icon: Heart, label: 'Resources' },
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
              {getLanguageInfo(language).flag} {language.toUpperCase()}
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

      {/* Bottom Navigation - Enhanced with animations and better touch targets */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 shadow-lg">
        <div className="grid grid-cols-5 py-2 px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path;
            
            return (
              <Link key={path} href={path}>
                <div 
                  className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 transform active:scale-95 ${
                    isActive 
                      ? 'text-sky-500 bg-sky-50 dark:bg-sky-950/30 shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-sky-100 dark:bg-sky-900/50' : ''}`}>
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  </div>
                  <span className={`text-xs mt-1 text-center font-medium transition-all ${
                    isActive ? 'text-sky-600 dark:text-sky-400' : ''
                  }`}>
                    {label}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 bg-sky-500 rounded-full mt-1 animate-pulse" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* Profile in header - Enhanced */}
        <div className="absolute -top-12 right-4">
          <Link href="/profile">
            <div className={`p-3 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md ${
              location === '/profile' 
                ? 'text-sky-500 bg-sky-100 dark:bg-sky-900/50 border-2 border-sky-200 dark:border-sky-800' 
                : 'text-muted-foreground bg-background/90 backdrop-blur-sm border hover:text-foreground hover:bg-accent'
            }`}>
              <User className="w-5 h-5" />
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}