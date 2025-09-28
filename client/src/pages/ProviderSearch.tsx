import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, MapPin, Phone, Users, Clock, Stethoscope, Filter, X, ExternalLink, MessageCircle } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface Provider {
  id: number;
  name: string;
  specialty: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  borough: string;
  languages: string[];
  insurance: string[];
  website?: string;
  lat?: number | null;
  lng?: number | null;
  verified?: boolean;
  source?: string;
  updated_at?: string;
  distance?: number;
}

interface SearchFilters {
  borough: string;
  specialty: string;
  language: string;
  insurance: string;
  searchTerm: string;
}

export default function ProviderSearch() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [useUserLocation, setUseUserLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<SearchFilters>({
    borough: '',
    specialty: '',
    language: '',
    insurance: '',
    searchTerm: ''
  });

  // Search function
  const searchProviders = useCallback(async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params
      if (filters.borough) params.append('borough', filters.borough);
      if (filters.specialty) params.append('specialty', filters.specialty);
      if (filters.language) params.append('lang', filters.language);
      
      // Add location if enabled
      if (useUserLocation && userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
      }
      
      console.log('[PROVIDER_SEARCH] Searching with params:', params.toString());
      
      const response = await fetch(`/api/providers?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        let results = data.data || [];
        
        // Client-side filtering for search term and insurance
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          results = results.filter((provider: Provider) =>
            provider.name.toLowerCase().includes(searchLower) ||
            provider.specialty.toLowerCase().includes(searchLower) ||
            provider.address.toLowerCase().includes(searchLower)
          );
        }
        
        if (filters.insurance) {
          results = results.filter((provider: Provider) =>
            provider.insurance?.some((ins: string) => 
              ins.toLowerCase().includes(filters.insurance.toLowerCase())
            )
          );
        }
        
        setProviders(results);
        console.log(`[PROVIDER_SEARCH] Found ${results.length} providers`);
      } else {
        throw new Error(data.error || 'Search failed');
      }
      
    } catch (error) {
      console.error('[PROVIDER_SEARCH] Error:', error);
      toast({
        title: t('errors.network'),
        description: error instanceof Error ? error.message : 'Search failed',
        variant: 'destructive'
      });
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [filters, useUserLocation, userLocation, toast, t]);

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
        setUseUserLocation(true);
        
        toast({
          title: t('location.banner.title'),
          description: 'Location enabled for distance sorting'
        });
        
        // Trigger search if we have results
        if (providers.length > 0) {
          searchProviders();
        }
      },
      (error) => {
        console.error('[PROVIDER_SEARCH] Location error:', error);
        toast({
          title: t('location.denied'),
          variant: 'destructive'
        });
      }
    );
  }, [toast, t, providers.length, searchProviders]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      borough: '',
      specialty: '',
      language: '',
      insurance: '',
      searchTerm: ''
    });
  }, []);

  // Handle appointment request with inline form
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({
    preferredDate: '',
    preferredTime: '',
    reason: '',
    phone: '',
    email: '',
    urgency: 'routine'
  });

  const handleRequestAppointment = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
    // Clear form
    setAppointmentForm({
      preferredDate: '',
      preferredTime: '',
      reason: '',
      phone: '',
      email: '',
      urgency: 'routine'
    });
  }, []);

  const submitAppointmentRequest = useCallback(async () => {
    if (!selectedProvider) return;
    
    try {
      // Submit appointment request to your backend
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProvider.id,
          providerName: selectedProvider.name,
          ...appointmentForm,
          requestDate: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        toast({
          title: '✅ Appointment Requested',
          description: `Your appointment request has been sent to ${selectedProvider.name}. They will contact you within 24 hours.`,
          duration: 5000,
        });
        setSelectedProvider(null);
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (error) {
      toast({
        title: '❌ Request Failed',
        description: 'Please try again or call the provider directly.',
        variant: 'destructive'
      });
    }
  }, [selectedProvider, appointmentForm, toast]);

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
    if (user?.borough && user.borough !== null) {
      setFilters(prev => ({ ...prev, borough: user.borough as string }));
    }
    
    // Perform initial search immediately
    searchProviders();
  }, []); // Remove dependencies to force immediate load

  // Also search on mount without any conditions
  useEffect(() => {
    searchProviders();
  }, []);

  // Trigger search when filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProviders();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [filters.borough, filters.specialty, filters.language, filters.insurance]);

  // Search when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (providers.length > 0) {
        searchProviders();
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [filters.searchTerm]);

  // Get borough display name
  const getBoroughDisplay = (borough: string) => {
    const boroughKey = borough.toLowerCase().replace(' ', '');
    return t(`boroughs.${boroughKey}`, borough);
  };

  // Get specialty display name
  const getSpecialtyDisplay = (specialty: string) => {
    const specialtyKey = specialty.toLowerCase().replace(/[^a-z]/g, '');
    return t(`specialties.${specialtyKey}`, specialty);
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
            <h1 className="text-2xl font-bold" data-testid="provider-search-title">
              {t('search.providers.title')}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="provider-search-subtitle">
              {t('search.providers.subtitle')}
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
              placeholder={`${t('search.providers.title')}...`}
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="pl-10"
              data-testid="input-provider-search"
            />
          </div>
          <Button
            variant="outline"
            onClick={requestLocation}
            disabled={useUserLocation}
            data-testid="button-use-location"
          >
            <MapPin className="h-4 w-4 mr-1" />
            {useUserLocation ? '✓' : t('search.providers.useMyLocation')}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
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
                
                {/* Specialty Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block" data-testid="label-specialty">
                    {t('search.providers.specialty')}
                  </label>
                  <Select value={filters.specialty} onValueChange={(value) => updateFilter('specialty', value)}>
                    <SelectTrigger data-testid="select-specialty">
                      <SelectValue placeholder="Any specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any specialty</SelectItem>
                      <SelectItem value="Primary Care">Primary Care</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="OB-GYN">OB-GYN</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Dermatology">Dermatology</SelectItem>
                      <SelectItem value="Mental Health">Mental Health</SelectItem>
                      <SelectItem value="Dentistry">Dentistry</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
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
                
                {/* Insurance Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block" data-testid="label-insurance">
                    {t('search.providers.insurance')}
                  </label>
                  <Select value={filters.insurance} onValueChange={(value) => updateFilter('insurance', value)}>
                    <SelectTrigger data-testid="select-insurance">
                      <SelectValue placeholder="Any insurance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any insurance</SelectItem>
                      <SelectItem value="Medicaid">Medicaid</SelectItem>
                      <SelectItem value="Medicare">Medicare</SelectItem>
                      <SelectItem value="Blue Cross">Blue Cross Blue Shield</SelectItem>
                      <SelectItem value="Aetna">Aetna</SelectItem>
                      <SelectItem value="UnitedHealth">UnitedHealthcare</SelectItem>
                      <SelectItem value="Cigna">Cigna</SelectItem>
                      <SelectItem value="Humana">Humana</SelectItem>
                      <SelectItem value="Uninsured">Accepts Uninsured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Active Filters */}
        {(filters.borough || filters.specialty || filters.language || filters.insurance) && (
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
            {filters.specialty && (
              <Badge variant="secondary" className="text-xs" data-testid={`filter-badge-specialty`}>
                {getSpecialtyDisplay(filters.specialty)}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('specialty', '')}
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
            {filters.insurance && (
              <Badge variant="secondary" className="text-xs" data-testid={`filter-badge-insurance`}>
                {filters.insurance}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => updateFilter('insurance', '')}
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
                `${providers.length} ${providers.length === 1 ? 'provider' : 'providers'} found`
              )}
            </h2>
            {useUserLocation && userLocation && (
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
              <Card key={i} data-testid={`skeleton-provider-${i}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* No Results */}
        {!loading && providers.length === 0 && (
          <div className="text-center py-12" data-testid="no-results">
            <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">{t('search.providers.noResults')}</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Try adjusting your search criteria or removing some filters
            </p>
            
            {/* Call Daysi Help Section */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 max-w-md mx-auto">
              <div className="flex items-center justify-center mb-2">
                <Phone className="h-5 w-5 text-primary mr-2" />
                <span className="font-medium text-foreground">Need help finding a provider?</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Call Daysi for personalized provider recommendations
              </p>
              <div className="text-lg font-bold text-primary mb-2" data-testid="provider-search-phone">
                (866) 386-3095
              </div>
              <a href="tel:+18663863095" className="w-full">
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90" data-testid="button-call-help">
                  <Phone className="h-4 w-4 mr-2" />
                  Call for Help
                </Button>
              </a>
            </div>
            
            <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters-no-results">
              Clear all filters
            </Button>
          </div>
        )}
        
        {/* Provider List */}
        {!loading && providers.length > 0 && (
          <ScrollArea className="h-full">
            <div className="space-y-4 pb-4">
              {providers.map((provider) => (
                <Card key={provider.id} className="hover:shadow-md transition-shadow" data-testid={`provider-card-${provider.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-lg" data-testid={`provider-name-${provider.id}`}>
                              {provider.name}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`provider-specialty-${provider.id}`}>
                              {getSpecialtyDisplay(provider.specialty)}
                            </p>
                          </div>
                          {provider.distance !== undefined && (
                            <Badge variant="outline" className="text-xs" data-testid={`provider-distance-${provider.id}`}>
                              {provider.distance.toFixed(1)} {t('search.providers.milesAway')}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span data-testid={`provider-address-${provider.id}`}>{provider.address}</span>
                          </div>
                          
                          {provider.languages && provider.languages.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <div className="flex gap-1 flex-wrap">
                                {provider.languages.slice(0, 3).map((lang, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs" data-testid={`provider-language-${provider.id}-${i}`}>
                                    {getLanguageDisplay(lang)}
                                  </Badge>
                                ))}
                                {provider.languages.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{provider.languages.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {provider.insurance && provider.insurance.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="flex gap-1 flex-wrap">
                                {provider.insurance.slice(0, 2).map((insurance: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs" data-testid={`provider-insurance-${provider.id}-${i}`}>
                                    {insurance}
                                  </Badge>
                                ))}
                                {provider.insurance.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{provider.insurance.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => window.open(`tel:${provider.phone}`, '_self')}
                            data-testid={`provider-call-${provider.id}`}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            {t('search.providers.callNow')}
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedProvider(provider)}
                                data-testid={`provider-schedule-${provider.id}`}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Schedule
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>Request Appointment with {provider.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="preferred-date">Preferred Date</Label>
                                    <Input
                                      id="preferred-date"
                                      type="date"
                                      value={appointmentForm.preferredDate}
                                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                                      min={new Date().toISOString().split('T')[0]}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="preferred-time">Preferred Time</Label>
                                    <Select 
                                      value={appointmentForm.preferredTime} 
                                      onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, preferredTime: value }))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="morning">Morning (8AM-12PM)</SelectItem>
                                        <SelectItem value="afternoon">Afternoon (12PM-5PM)</SelectItem>
                                        <SelectItem value="evening">Evening (5PM-8PM)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label htmlFor="urgency">Urgency</Label>
                                  <Select 
                                    value={appointmentForm.urgency} 
                                    onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, urgency: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="routine">Routine (within 2 weeks)</SelectItem>
                                      <SelectItem value="urgent">Urgent (within 48 hours)</SelectItem>
                                      <SelectItem value="emergency">Emergency (same day)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label htmlFor="reason">Reason for Visit</Label>
                                  <Textarea
                                    id="reason"
                                    placeholder="Briefly describe your reason for the appointment..."
                                    value={appointmentForm.reason}
                                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, reason: e.target.value }))}
                                    rows={3}
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="contact-phone">Phone Number</Label>
                                    <Input
                                      id="contact-phone"
                                      type="tel"
                                      placeholder="(555) 123-4567"
                                      value={appointmentForm.phone}
                                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="contact-email">Email</Label>
                                    <Input
                                      id="contact-email"
                                      type="email"
                                      placeholder="your@email.com"
                                      value={appointmentForm.email}
                                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 pt-4">
                                  <Button 
                                    onClick={submitAppointmentRequest}
                                    className="flex-1"
                                    disabled={!appointmentForm.reason || !appointmentForm.phone}
                                  >
                                    Submit Request
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(provider.address)}`, '_blank')}
                            data-testid={`provider-directions-${provider.id}`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {t('buttons.directions')}
                          </Button>
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