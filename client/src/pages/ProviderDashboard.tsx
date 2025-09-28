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
  Stethoscope, 
  Calendar, 
  Users, 
  ClipboardList,
  Star,
  MessageCircle,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'wouter';

interface ProviderStats {
  totalClaims: number;
  verifiedClaims: number;
  pendingClaims: number;
  totalViews?: number;
  averageRating?: number;
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  
  // Fetch provider statistics
  const { 
    data: stats, 
    isLoading: loading,
    error 
  } = useQuery({
    queryKey: ['/api/provider-claims/user', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProviderStats> => {
      const response = await fetch(`/api/provider-claims/user/${user?.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch provider stats');
      }
      
      if (data.success) {
        const claims = data.data || [];
        return {
          totalClaims: claims.length,
          verifiedClaims: claims.filter((c: any) => c.status === 'verified').length,
          pendingClaims: claims.filter((c: any) => c.status === 'pending').length,
          totalViews: Math.floor(Math.random() * 1000) + 100, // Mock data
          averageRating: 4.2 + Math.random() * 0.8 // Mock data
        };
      } else {
        throw new Error(data.error || 'Failed to fetch provider stats');
      }
    },
    staleTime: 30000,
  });

  const quickActions = [
    {
      icon: ClipboardList,
      title: 'Claim Practice',
      description: 'Verify ownership of your healthcare practice',
      href: '/providers/claim',
      color: 'text-blue-500'
    },
    {
      icon: Users,
      title: 'View Patients',
      description: 'Manage your patient appointments and records',
      href: '#',
      color: 'text-green-500',
      comingSoon: true
    },
    {
      icon: Calendar,
      title: 'Schedule',
      description: 'Manage your availability and appointments',
      href: '#',
      color: 'text-purple-500',
      comingSoon: true
    },
    {
      icon: MessageCircle,
      title: 'Messages',
      description: 'Communicate with patients and colleagues',
      href: '#',
      color: 'text-orange-500',
      comingSoon: true
    }
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-muted-foreground mb-4">You need to be signed in to access the provider dashboard</p>
          <Link href="/login">
            <Button data-testid="button-signin">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Provider Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-provider-welcome">
            Provider Dashboard 🏥
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your healthcare practice and connect with patients
          </p>
        </div>
        <Badge variant="secondary" className="text-xs" data-testid="badge-provider-role">
          <Stethoscope className="h-3 w-3 mr-1" />
          Healthcare Provider
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-claims">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-claims">
              {loading ? '...' : stats?.totalClaims || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Practice verification requests
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-verified-claims">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-verified-claims">
              {loading ? '...' : stats?.verifiedClaims || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully verified practices
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-claims">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="stat-pending-claims">
              {loading ? '...' : stats?.pendingClaims || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-profile-views">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-profile-views">
              {loading ? '...' : stats?.totalViews || '---'}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card data-testid="card-quick-actions">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Stethoscope className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <div key={index} className="relative">
                {action.comingSoon ? (
                  <div className="p-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 opacity-60">
                    <div className="flex items-center space-x-3">
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                      <div>
                        <h3 className="font-medium text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                        <Badge variant="outline" className="text-xs mt-2">Coming Soon</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link href={action.href}>
                    <div className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors" data-testid={`action-${action.title.toLowerCase().replace(' ', '-')}`}>
                      <div className="flex items-center space-x-3">
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                        <div>
                          <h3 className="font-medium text-sm">{action.title}</h3>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Practice Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-practice-info">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Practice Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider Name</span>
                <span className="text-sm font-medium" data-testid="text-provider-name">
                  {user.name || 'Not set'}
                </span>
              </div>
              
              {user.email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contact Email</span>
                  <span className="text-sm font-medium" data-testid="text-provider-email">
                    {user.email}
                  </span>
                </div>
              )}
              
              {user.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="text-sm font-medium" data-testid="text-provider-phone">
                    {user.phone}
                  </span>
                </div>
              )}
              
              {user.borough && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Service Area</span>
                  <span className="text-sm font-medium" data-testid="text-provider-borough">
                    {user.borough}
                  </span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="flex space-x-2">
              <Link href="/profile">
                <Button variant="outline" size="sm" data-testid="button-edit-profile">
                  Edit Profile
                </Button>
              </Link>
              <Link href="/providers/claim">
                <Button size="sm" data-testid="button-manage-practice">
                  Manage Practice
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card data-testid="card-performance">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Rating</span>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium" data-testid="text-average-rating">
                    {stats?.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Response Time</span>
                <span className="text-sm font-medium" data-testid="text-response-time">
                  &lt; 2 hours
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Verification Status</span>
                <Badge variant={stats?.verifiedClaims && stats.verifiedClaims > 0 ? "default" : "secondary"} className="text-xs" data-testid="badge-verification-status">
                  {stats?.verifiedClaims && stats.verifiedClaims > 0 ? 'Verified' : 'Pending'}
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                📈 Your profile has been viewed {stats?.totalViews || 0} times this month
              </p>
              <Button variant="outline" size="sm" className="w-full" data-testid="button-view-analytics" disabled>
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Message */}
      {stats && stats.pendingClaims > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20" data-testid="card-pending-notice">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Pending Verification
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  You have {stats.pendingClaims} practice claim(s) pending verification. 
                  Our team will review your submission within 1-2 business days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}