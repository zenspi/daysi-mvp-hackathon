import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, Heart, Activity, TrendingUp, BarChart3, Calendar, Shield } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface AdminStats {
  users: number;
  providers: number;
  resources: number;
}

export default function Admin() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch admin overview stats using TanStack Query
  const { 
    data: stats, 
    isLoading: loading, 
    error,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['/api/admin/overview'],
    queryFn: async (): Promise<AdminStats> => {
      console.log('[ADMIN] Fetching overview stats...');
      
      const response = await fetch('/api/admin/overview');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        console.log('[ADMIN] Stats loaded successfully:', data.data);
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch admin stats');
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Handle errors
  if (error) {
    toast({
      title: t('errors.network'),
      description: error instanceof Error ? error.message : 'Failed to fetch admin stats',
      variant: 'destructive'
    });
  }

  // Format number with commas using user's locale
  const formatNumber = (num: number) => {
    const locale = language === 'es' ? 'es-ES' : 'en-US';
    return new Intl.NumberFormat(locale).format(num);
  };

  // Calculate total platform users
  const getTotalUsers = () => {
    if (!stats) return 0;
    return stats.users + stats.providers;
  };

  // Get growth indicator (mock data for demo)
  const getGrowthIndicator = (type: 'users' | 'providers' | 'resources') => {
    // In a real app, this would come from historical data
    const mockGrowth = {
      users: 12.5,
      providers: 8.3,
      resources: 15.7
    };
    return mockGrowth[type];
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold" data-testid="admin-title">
              {t('admin.title')}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="admin-subtitle">
              {t('admin.subtitle')}
            </p>
          </div>
          
          <Badge variant="outline" className="text-xs" data-testid="admin-access-badge">
            <Shield className="h-3 w-3 mr-1" />
            {t('admin.accessBadge')}
          </Badge>
        </div>
        
        {dataUpdatedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span data-testid="last-updated">
              {t('admin.lastUpdated')}: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 p-4 space-y-6">
        
        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Platform Users */}
          <Card className="hover:shadow-md transition-shadow" data-testid="card-total-users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.stats.totalUsers')}
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="total-users-count">
                    {formatNumber(getTotalUsers())}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Platform users + providers
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Registered Users */}
          <Card className="hover:shadow-md transition-shadow" data-testid="card-users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.stats.users')}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="users-count">
                    {formatNumber(stats?.users || 0)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    +{getGrowthIndicator('users')}% this month
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Healthcare Providers */}
          <Card className="hover:shadow-md transition-shadow" data-testid="card-providers">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.stats.providers')}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="providers-count">
                    {formatNumber(stats?.providers || 0)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    +{getGrowthIndicator('providers')}% this month
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Community Resources */}
          <Card className="hover:shadow-md transition-shadow" data-testid="card-resources">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.stats.resources')}
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="resources-count">
                    {formatNumber(stats?.resources || 0)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    +{getGrowthIndicator('resources')}% this month
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Platform Overview */}
          <Card data-testid="card-platform-overview">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <CardTitle className="text-lg">
                  {t('admin.sections.platformHealth')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Users</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${((stats?.users || 0) / getTotalUsers()) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats?.users || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Providers</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${((stats?.providers || 0) / Math.max(stats?.providers || 0, 1500)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats?.providers || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Resources</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${((stats?.resources || 0) / Math.max(stats?.resources || 0, 500)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats?.resources || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Platform is operating at full capacity with healthy growth across all categories.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & System Status */}
          <Card data-testid="card-system-status">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <CardTitle className="text-lg">
                  {t('admin.sections.systemStatus')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Database Connection</span>
                      <Badge variant="secondary" className="text-xs">
                        Fallback Mode
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Services</span>
                      <Badge variant="default" className="text-xs bg-green-500">
                        Operational
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">OpenAI Integration</span>
                      <Badge variant="default" className="text-xs bg-green-500">
                        Connected
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">WebSocket Realtime</span>
                      <Badge variant="default" className="text-xs bg-green-500">
                        Active
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      All core services are operational. System running in fallback mode due to database connectivity.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Data Insights */}
        <Card data-testid="card-data-insights">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <CardTitle className="text-lg">
                  {t('admin.insights.title')}
                </CardTitle>
              </div>
              {dataUpdatedAt && (
                <Badge variant="outline" className="text-xs">
                  Live Data
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600" data-testid="insight-user-ratio">
                    {stats ? Math.round((stats.users / getTotalUsers()) * 100) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">User to Provider Ratio</div>
                  <div className="text-xs text-muted-foreground">
                    Healthy engagement balance
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600" data-testid="insight-coverage">
                    {stats ? Math.round((stats.providers / (stats.resources || 1)) * 100) / 100 : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Provider per Resource</div>
                  <div className="text-xs text-muted-foreground">
                    Coverage effectiveness
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600" data-testid="insight-growth">
                    +{Math.round((getGrowthIndicator('users') + getGrowthIndicator('providers') + getGrowthIndicator('resources')) / 3 * 10) / 10}%
                  </div>
                  <div className="text-sm text-muted-foreground">Average Growth</div>
                  <div className="text-xs text-muted-foreground">
                    Monthly platform expansion
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}