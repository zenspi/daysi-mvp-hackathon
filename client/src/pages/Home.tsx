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

      {/* Emergency Notice */}
      <div className="px-6 mb-6">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="flex items-center gap-3 pt-4">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <p className="text-sm text-orange-800 dark:text-orange-200" data-testid="emergency-notice">
              {t('home.emergencyNotice')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {t('home.quickActions')}
          </h3>
          <Badge variant="outline" className="text-xs">
            {t('buttons.getCareNow')}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => handleQuickAction(action.path)}
              data-testid={action.testId}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${action.color}`}>
                    <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{action.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm leading-relaxed">
                  {action.description}
                </CardDescription>
              </CardContent>
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