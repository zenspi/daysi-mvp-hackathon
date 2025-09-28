import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MessageCircle, 
  Stethoscope, 
  Heart, 
  MapPin, 
  AlertTriangle,
  User,
  Plus,
  Clock,
  Star
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const quickActions = [
    {
      id: 'voice',
      title: t('buttons.talkToDaysi'),
      description: t('voice.subtitle'),
      icon: Mic,
      color: 'bg-blue-500',
      iconColor: 'text-white',
      path: '/voice',
      testId: 'tile-voice'
    },
    {
      id: 'chat', 
      title: t('buttons.typeToDaysi'),
      description: t('chat.subtitle'),
      icon: MessageCircle,
      color: 'bg-green-500',
      iconColor: 'text-white',
      path: '/chat',
      testId: 'tile-chat'
    },
    {
      id: 'providers',
      title: t('buttons.findDoctor'),
      description: t('search.providers.subtitle'),
      icon: Stethoscope,
      color: 'bg-purple-500',
      iconColor: 'text-white',
      path: '/search/providers',
      testId: 'tile-providers'
    },
    {
      id: 'resources',
      title: t('buttons.findCommunityHelp'),
      description: t('search.resources.subtitle'),
      icon: Heart,
      color: 'bg-pink-500',
      iconColor: 'text-white',
      path: '/search/resources',
      testId: 'tile-resources'
    }
  ];

  const handleQuickAction = (path: string) => {
    setLocation(path);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name || '';
    if (hour < 12) return user ? `${t('common.good_morning')}, ${name || t('common.there')}!` : `${t('common.good_morning')}!`;
    if (hour < 17) return user ? `${t('common.good_afternoon')}, ${name || t('common.there')}!` : `${t('common.good_afternoon')}!`;
    return user ? `${t('common.good_evening')}, ${name || t('common.there')}!` : `${t('common.good_evening')}!`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="px-6 pt-8 pb-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="greeting-title">
              {getGreeting()}
            </h1>
            <h2 className="text-xl font-semibold text-primary">
              {t('app.name')}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {t('home.subtitle')}
            </p>
          </div>

          {user && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {user.email || user.phone}
              </span>
              {user.role === 'admin' && (
                <Badge variant="secondary" className="text-xs">{t('common.admin')}</Badge>
              )}
              {user.role === 'provider' && (
                <Badge variant="secondary" className="text-xs">{t('common.provider')}</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Notice - Subtle styling */}
      <div className="px-6 mb-4">
        <Card className="border-amber-100 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-900/40">
          <CardContent className="flex items-center gap-2 pt-3 pb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="emergency-notice">
              {t('home.emergencyNotice')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Enhanced */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            {t('home.quickActions')}
          </h3>
          <Badge variant="outline" className="text-xs bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950 dark:to-blue-950 border-sky-200 dark:border-sky-800">
            {t('buttons.getCareNow')}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <Card
              key={action.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden border-0 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-900/50 dark:to-gray-800 shadow-md"
              onClick={() => handleQuickAction(action.path)}
              data-testid={action.testId}
              style={{
                animationDelay: `${index * 150}ms`,
                animation: 'fadeInUp 0.6s ease-out both'
              }}
            >
              {/* Background Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${action.color} transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl`}>
                    <action.icon className={`h-7 w-7 ${action.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors duration-200">
                      {action.title}
                    </CardTitle>
                  </div>
                  {/* Chevron indicator */}
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 relative z-10">
                <CardDescription className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors duration-200">
                  {action.description}
                </CardDescription>
              </CardContent>
              
              {/* Ripple effect background */}
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-0 group-hover:scale-100 rounded-lg" />
            </Card>
          ))}
        </div>
      </div>

      {/* Location & Quick Stats */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card data-testid="card-stats-location">
            <CardContent className="flex items-center gap-3 pt-4">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm" data-testid="text-borough">
                  {user?.borough || t('common.new_york_default')}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-your-area">{t('common.your_area')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stats-availability">
            <CardContent className="flex items-center gap-3 pt-4">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm" data-testid="text-availability">{t('common.twenty_four_seven')}</p>
                <p className="text-xs text-muted-foreground">{t('common.available')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stats-guidance">
            <CardContent className="flex items-center gap-3 pt-4">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-sm" data-testid="text-guidance">{t('common.ai_powered')}</p>
                <p className="text-xs text-muted-foreground">{t('common.guidance')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      {user && (
        <div className="px-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('home.recentActivity')}
          </h3>
          
          <Card>
            <CardContent className="py-6">
              <div className="text-center text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm" data-testid="text-no-activity">{t('common.no_recent_activity')}</p>
                <p className="text-xs" data-testid="text-start-by-talking">{t('common.start_by_talking')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Call to Action for Non-Authenticated Users */}
      {!user && (
        <div className="px-6 mb-8">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="text-center py-6">
              <h3 className="font-semibold mb-2">{t('common.get_personalized_care')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('common.sign_in_benefits')}
              </p>
              <Button 
                onClick={() => setLocation('/login')}
                className="w-full max-w-xs"
                data-testid="button-get-started"
              >
                {t('buttons.login')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="h-20" /> {/* Bottom padding for mobile nav */}
    </div>
  );
}