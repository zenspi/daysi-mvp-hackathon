import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Phone, Heart, Clock, Filter, X, ExternalLink } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Resource {
  id: number;
  name: string;
  category: string;
  phone: string;
  address: string;
  borough: string;
  description: string;
  languages: string[];
  hours?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

interface SearchFilters {
  borough: string;
  category: string;
  language: string;
  searchTerm: string;
}

export default function ResourceSearch() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<SearchFilters>({
    borough: '',
    category: '',
    language: '',
    searchTerm: ''
  });

  // Search function
  const searchResources = useCallback(async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params
      if (filters.borough) params.append('borough', filters.borough);
      if (filters.category) params.append('category', filters.category);
      if (filters.language) params.append('lang', filters.language);
      
      // Add location if enabled
      if (useLocation && userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
      }
      
      console.log('[RESOURCE_SEARCH] Searching with params:', params.toString());
      
      const response = await fetch(`/api/resources?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        let results = data.data || [];
        
        // Client-side filtering for search term
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          results = results.filter((resource: Resource) =>
            resource.name.toLowerCase().includes(searchLower) ||
            resource.category.toLowerCase().includes(searchLower) ||
            resource.description.toLowerCase().includes(searchLower) ||
            resource.address.toLowerCase().includes(searchLower)
          );
        }
        
        setResources(results);
        console.log(`[RESOURCE_SEARCH] Found ${results.length} resources`);
      } else {
        throw new Error(data.error || 'Search failed');
      }
      
    } catch (error) {
      console.error('[RESOURCE_SEARCH] Error:', error);
      toast({
        title: t('errors.network'),
        description: error instanceof Error ? error.message : 'Search failed',
        variant: 'destructive'
      });
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [filters, useLocation, userLocation, toast, t]);

  // Request location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: t('location.error'),
        variant: 'destructive'
      });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        setUseLocation(true);
        
        toast({
          title: t('location.banner.title'),
          description: 'Location enabled for distance sorting'
        });
        
        // Trigger search if we have results
        if (resources.length > 0) {
          searchResources();
        }
      },
      (error) => {
        console.error('[RESOURCE_SEARCH] Location error:', error);
        toast({
          title: t('location.denied'),
          variant: 'destructive'
        });
      }
    );
  }, [toast, t, resources.length, searchResources]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      borough: '',
      category: '',
      language: '',
      searchTerm: ''
    });
  }, []);

  // Update filter
  const updateFilter = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Search on mount with user's location/language preferences
  useEffect(() => {
    // Set user's preferred language if available
    if (user?.language) {
      const langCode = user.language.toLowerCase().includes('spanish') ? 'Spanish' : 
                      user.language.toLowerCase().includes('english') ? 'English' : '';
      if (langCode) {
        setFilters(prev => ({ ...prev, language: langCode }));
      }
    }
    
    // Set user's borough if available
    if (user?.borough) {
      setFilters(prev => ({ ...prev, borough: user.borough || '' }));
    }
    
    // Perform initial search
    searchResources();
  }, [user, searchResources]);

  // Trigger search when filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchResources();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [filters.borough, filters.category, filters.language]);

  // Search when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (resources.length > 0) {
        searchResources();
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [filters.searchTerm]);

  // Get borough display name
  const getBoroughDisplay = (borough: string) => {
    const boroughKey = borough.toLowerCase().replace(' ', '');
    return t(`boroughs.${boroughKey}`, borough);
  };

  // Get category display name
  const getCategoryDisplay = (category: string) => {
    const categoryKey = category.toLowerCase().replace(/[^a-z]/g, '');
    return t(`resourceCategories.${categoryKey}`, category);
  };

  // Get language display name
  const getLanguageDisplay = (lang: string) => {
    const langKey = lang.toLowerCase();
    return t(`languages.${langKey}`, lang);
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold" data-testid="resource-search-title">
              {t('search.resources.title')}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="resource-search-subtitle">
              {t('search.resources.subtitle')}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-1" />
            {t('search.providers.filters')}
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${t('search.resources.title')}...`}
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="pl-10"
              data-testid="input-resource-search"
            />
          </div>
          <Button
            variant="outline"
            onClick={requestLocation}
            disabled={useLocation}
            data-testid="button-use-location"
          >
            <MapPin className="h-4 w-4 mr-1" />
            {useLocation ? '✓' : t('search.providers.useMyLocation')}
          </Button>
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <Card className="mb-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg" data-testid="filters-title">
                  {t('search.providers.filters')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    data-testid="button-close-filters"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Borough Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block" data-testid="label-borough">
                    {t('search.providers.borough')}
                  </label>
                  <Select value={filters.borough} onValueChange={(value) => updateFilter('borough', value)}>
                    <SelectTrigger data-testid="select-borough">
                      <SelectValue placeholder="Any borough" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any borough</SelectItem>
                      <SelectItem value="Manhattan">Manhattan</SelectItem>
                      <SelectItem value="Brooklyn">Brooklyn</SelectItem>
                      <SelectItem value="Queens">Queens</SelectItem>
                      <SelectItem value="Bronx">Bronx</SelectItem>
                      <SelectItem value="Staten Island">Staten Island</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block" data-testid="label-category">
                    {t('search.resources.category')}
                  </label>
                  <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Any category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any category</SelectItem>
                      <SelectItem value="Housing Assistance">Housing Assistance</SelectItem>
                      <SelectItem value="Food Security">Food Security</SelectItem>
                      <SelectItem value="Healthcare Access">Healthcare Access</SelectItem>
                      <SelectItem value="Legal Aid">Legal Aid</SelectItem>
                      <SelectItem value="Childcare">Childcare</SelectItem>
                      <SelectItem value="Elder Care">Elder Care</SelectItem>
                      <SelectItem value="Mental Health Support">Mental Health Support</SelectItem>
                      <SelectItem value="Substance Abuse">Substance Abuse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Language Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block" data-testid="label-language">
                    {t('search.providers.language')}
                  </label>
                  <Select value={filters.language} onValueChange={(value) => updateFilter('language', value)}>
                    <SelectTrigger data-testid="select-language">
                      <SelectValue placeholder="Any language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any language</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="Chinese">Chinese</SelectItem>
                      <SelectItem value="Arabic">Arabic</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Russian">Russian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Active Filters */}
        {(filters.borough || filters.category || filters.language) && (
          <div className="flex gap-2 flex-wrap">
            {filters.borough && (
              <Badge variant="secondary" className="text-xs" data-testid={`filter-badge-borough`}>
                {getBoroughDisplay(filters.borough)}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('borough', '')}
                />
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary" className="text-xs" data-testid={`filter-badge-category`}>
                {getCategoryDisplay(filters.category)}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('category', '')}
                />
              </Badge>
            )}
            {filters.language && (
              <Badge variant="secondary" className="text-xs" data-testid={`filter-badge-language`}>
                {getLanguageDisplay(filters.language)}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('language', '')}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 p-4 min-h-0">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium" data-testid="results-header">
              {loading ? (
                'Searching...'
              ) : (
                `${resources.length} ${resources.length === 1 ? 'resource' : 'resources'} found`
              )}
            </h2>
            {useLocation && userLocation && (
              <Badge variant="outline" className="text-xs" data-testid="location-badge">
                <MapPin className="h-3 w-3 mr-1" />
                Sorted by distance
              </Badge>
            )}
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} data-testid={`skeleton-resource-${i}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* No Results */}
        {!loading && resources.length === 0 && (
          <div className="text-center py-12" data-testid="no-results">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">{t('search.resources.noResults')}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Try adjusting your search criteria or removing some filters
            </p>
            <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters-no-results">
              Clear all filters
            </Button>
          </div>
        )}
        
        {/* Resource List */}
        {!loading && resources.length > 0 && (
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              {resources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-md transition-shadow" data-testid={`resource-card-${resource.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-lg" data-testid={`resource-name-${resource.id}`}>
                              {resource.name}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`resource-category-${resource.id}`}>
                              {getCategoryDisplay(resource.category)}
                            </p>
                          </div>
                          {resource.distance !== undefined && (
                            <Badge variant="outline" className="text-xs" data-testid={`resource-distance-${resource.id}`}>
                              {resource.distance.toFixed(1)} {t('search.providers.milesAway')}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3" data-testid={`resource-description-${resource.id}`}>
                          {resource.description}
                        </p>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span data-testid={`resource-address-${resource.id}`}>{resource.address}</span>
                          </div>
                          
                          {resource.hours && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span data-testid={`resource-hours-${resource.id}`}>{resource.hours}</span>
                            </div>
                          )}
                          
                          {resource.languages && resource.languages.length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1 flex-wrap">
                                {resource.languages.slice(0, 3).map((lang, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs" data-testid={`resource-language-${resource.id}-${i}`}>
                                    {getLanguageDisplay(lang)}
                                  </Badge>
                                ))}
                                {resource.languages.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{resource.languages.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            size="sm"
                            onClick={() => window.open(`tel:${resource.phone}`, '_self')}
                            data-testid={`resource-call-${resource.id}`}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Call Now
                          </Button>
                          
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(resource.address)}`, '_blank')}
                            data-testid={`resource-directions-${resource.id}`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {t('buttons.directions')}
                          </Button>
                          
                          {resource.website && (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(resource.website, '_blank')}
                              data-testid={`resource-website-${resource.id}`}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Website
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}