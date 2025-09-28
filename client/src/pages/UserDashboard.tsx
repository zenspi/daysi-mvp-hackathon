import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  User, 
  MessageCircle, 
  Mic, 
  Search, 
  Heart, 
  Stethoscope, 
  Calendar,
  Activity,
  MapPin,
  Globe,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { ProactiveSuggestions } from '@/components/proactive/ProactiveSuggestions';

interface UserActivity {
  type: 'voice' | 'chat' | 'search';
  timestamp: Date;
  description: string;
}

interface Appointment {
  id: string;
  providerName: string;
  preferredDate: string;
  preferredTime: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  requestedAt: string;
  patientPhone: string;
}

export default function UserDashboard() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  
  // Fetch user appointments by phone number
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments/by-phone', user?.phone],
    enabled: !!user?.phone,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const [recentActivity] = useState<UserActivity[]>([
    {
      type: 'voice',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      description: 'Asked about finding a cardiologist in Brooklyn'
    },
    {
      type: 'chat', 
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      description: 'Searched for mental health resources'
    },
    {
      type: 'search',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      description: 'Found 5 providers in Manhattan'
    }
  ]);

  const quickActions = [
    {
      icon: Mic,
      title: t('navigation.voice'),
      description: 'Talk to Daysi for personalized healthcare guidance',
      href: '/voice',
      color: 'text-blue-500'
    },
    {
      icon: MessageCircle,
      title: t('navigation.chat'),
      description: 'Chat with AI assistant about health questions',
      href: '/chat',
      color: 'text-green-500'
    },
    {
      icon: Stethoscope,
      title: 'Find Providers',
      description: 'Search for healthcare providers near you',
      href: '/search/providers',
      color: 'text-purple-500'
    },
    {
      icon: Heart,
      title: 'Find Resources',
      description: 'Discover community health resources',
      href: '/search/resources',
      color: 'text-red-500'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'voice': return <Mic className="h-4 w-4 text-blue-500" />;
      case 'chat': return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'search': return <Search className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getAppointmentStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'routine': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-muted-foreground mb-4">You need to be signed in to view your dashboard</p>
          <Link href="/login">
            <Button data-testid="button-signin">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-welcome">
            Welcome back{user.name ? `, ${user.name}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Your personalized healthcare navigation hub
          </p>
        </div>
        <Badge variant="outline" className="text-xs" data-testid="badge-user-role">
          <User className="h-3 w-3 mr-1" />
          User Account
        </Badge>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Link key={index} href={action.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full" data-testid={`card-action-${action.title.toLowerCase().replace(' ', '-')}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <CardTitle className="text-sm font-medium">
                    {action.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary */}
        <Card data-testid="card-profile-summary">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium" data-testid="text-user-name">
                  {user.name || 'Not set'}
                </span>
              </div>
              
              {user.email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium" data-testid="text-user-email">
                    {user.email}
                  </span>
                </div>
              )}
              
              {user.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="text-sm font-medium" data-testid="text-user-phone">
                    {user.phone}
                  </span>
                </div>
              )}
              
              {user.borough && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Borough</span>
                  <span className="text-sm font-medium" data-testid="text-user-borough">
                    {user.borough}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Language</span>
                <span className="text-sm font-medium" data-testid="text-user-language">
                  {user.language || language.toUpperCase()}
                </span>
              </div>
            </div>
            
            <Separator />
            
            <Link href="/profile">
              <Button variant="outline" size="sm" className="w-full" data-testid="button-edit-profile">
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2" data-testid="card-recent-activity">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50" data-testid={`activity-${index}`}>
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No recent activity yet. Start by asking Daysi for help!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments Section */}
      {user?.phone && (
        <Card data-testid="card-appointments">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>My Appointments</span>
              </div>
              <Link href="/search/providers">
                <Button variant="outline" size="sm" data-testid="button-schedule-new">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule New
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Loading appointments...</p>
              </div>
            ) : appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.slice(0, 3).map((appointment: Appointment) => (
                  <div key={appointment.id} className="p-4 rounded-lg border bg-card" data-testid={`appointment-${appointment.id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm" data-testid={`appointment-provider-${appointment.id}`}>
                          {appointment.providerName}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {appointment.reason}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs px-2 py-1 ${getAppointmentStatusColor(appointment.status)}`} data-testid={`appointment-status-${appointment.id}`}>
                          {getAppointmentStatusIcon(appointment.status)}
                          <span className="ml-1 capitalize">{appointment.status}</span>
                        </Badge>
                        <Badge className={`text-xs px-2 py-1 ${getUrgencyColor(appointment.urgency)}`} data-testid={`appointment-urgency-${appointment.id}`}>
                          {appointment.urgency.charAt(0).toUpperCase() + appointment.urgency.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        {appointment.preferredDate && (
                          <span>Preferred: {appointment.preferredDate}</span>
                        )}
                        {appointment.preferredTime && (
                          <span>{appointment.preferredTime}</span>
                        )}
                      </div>
                      <span>
                        Requested {formatRelativeTime(new Date(appointment.requestedAt))}
                      </span>
                    </div>
                  </div>
                ))}
                
                {appointments.length > 3 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      Showing 3 of {appointments.length} appointments
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No appointments yet. Schedule your first appointment!
                </p>
                <Link href="/search/providers">
                  <Button variant="outline" size="sm" data-testid="button-find-providers">
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Find Providers
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proactive AI Suggestions */}
      <ProactiveSuggestions className="mb-6" maxSuggestions={2} />

      {/* Health Tips Card */}
      <Card data-testid="card-health-tips">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Daily Health Tip</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            💡 <strong>Today's Tip:</strong> Stay hydrated! Aim for 8 glasses of water daily to maintain optimal health and energy levels.
          </p>
          <Link href="/chat">
            <Button variant="outline" size="sm" data-testid="button-ask-health-question">
              <MessageCircle className="h-4 w-4 mr-2" />
              Ask a Health Question
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}