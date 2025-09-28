import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Search, UserCheck, Phone, Mail, Building, CheckCircle, Clock } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';

interface Provider {
  id: number;
  name: string;
  specialty: string;
  phone: string;
  address: string;
  borough: string;
  verified: boolean;
  claimed: boolean;
}

interface ClaimSubmission {
  providerId: string;
  fullName: string;
  email: string;
  phone: string;
  license: string;
  npi: string;
}

type ClaimStatus = 'searching' | 'found' | 'verifying' | 'submitted' | 'verified';

export default function ProviderClaim() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [status, setStatus] = useState<ClaimStatus>('searching');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation schema
  const claimSchema = z.object({
    providerId: z.string().min(1, 'Provider ID is required'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Valid professional email required'),
    phone: z.string().min(10, 'Valid phone number required'),
    license: z.string().min(3, 'License number is required'),
    npi: z.string().min(10, 'Valid NPI number required').max(10, 'NPI must be 10 digits')
  });

  // Form setup
  const form = useForm<ClaimSubmission>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      providerId: '',
      fullName: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      license: '',
      npi: ''
    }
  });

  // Search for providers
  const searchProviders = useCallback(async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    
    try {
      console.log('[PROVIDER_CLAIM] Searching for:', searchTerm);
      
      // Search using existing provider API
      const params = new URLSearchParams();
      const response = await fetch(`/api/providers?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        let results = data.data || [];
        
        // Filter by search term
        const searchLower = searchTerm.toLowerCase();
        results = results.filter((provider: Provider) =>
          provider.name.toLowerCase().includes(searchLower) ||
          provider.specialty.toLowerCase().includes(searchLower) ||
          provider.address.toLowerCase().includes(searchLower) ||
          provider.id.toString() === searchTerm
        );
        
        // Add mock claim status for demo
        results = results.map((provider: Provider) => ({
          ...provider,
          verified: Math.random() > 0.7, // Random verification status
          claimed: Math.random() > 0.8   // Random claim status
        }));
        
        setSearchResults(results);
        console.log(`[PROVIDER_CLAIM] Found ${results.length} matching providers`);
      } else {
        throw new Error(data.error || 'Search failed');
      }
      
    } catch (error) {
      console.error('[PROVIDER_CLAIM] Search error:', error);
      toast({
        title: t('errors.network'),
        description: error instanceof Error ? error.message : 'Search failed',
        variant: 'destructive'
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, toast, t]);

  // Select provider for claiming
  const selectProvider = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
    setStatus('found');
    
    // Pre-fill form with provider ID
    form.setValue('providerId', provider.id.toString());
    
    toast({
      title: 'Provider Selected',
      description: `Ready to claim profile for ${provider.name}`
    });
  }, [form, toast]);

  // Start verification process
  const startVerification = useCallback(() => {
    setStatus('verifying');
  }, []);

  // Submit claim
  const onSubmit = useCallback(async (data: ClaimSubmission) => {
    setIsSubmitting(true);
    
    try {
      console.log('[PROVIDER_CLAIM] Submitting claim:', data);
      
      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatus('submitted');
      
      toast({
        title: t('providerClaim.pending'),
        description: 'Your claim has been submitted for verification'
      });
      
      // For demo: auto-verify after short delay
      setTimeout(() => {
        setStatus('verified');
        toast({
          title: t('providerClaim.verified'),
          description: 'Profile successfully verified and claimed!'
        });
      }, 3000);
      
    } catch (error) {
      console.error('[PROVIDER_CLAIM] Submit error:', error);
      toast({
        title: t('errors.network'),
        description: 'Failed to submit claim',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [toast, t]);

  // Reset and start over
  const resetClaim = useCallback(() => {
    setStatus('searching');
    setSelectedProvider(null);
    setSearchResults([]);
    setSearchTerm('');
    form.reset();
  }, [form]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold" data-testid="claim-title">
              {t('providerClaim.title')}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="claim-subtitle">
              {t('providerClaim.subtitle')}
            </p>
          </div>
          
          {status !== 'searching' && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetClaim}
              data-testid="button-start-over"
            >
              Start Over
            </Button>
          )}
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {status === 'searching' && (
            <Badge variant="secondary" className="text-xs" data-testid="status-searching">
              <Search className="h-3 w-3 mr-1" />
              Searching
            </Badge>
          )}
          {status === 'found' && (
            <Badge variant="secondary" className="text-xs" data-testid="status-found">
              <UserCheck className="h-3 w-3 mr-1" />
              Provider Found
            </Badge>
          )}
          {status === 'verifying' && (
            <Badge variant="secondary" className="text-xs" data-testid="status-verifying">
              <AlertCircle className="h-3 w-3 mr-1" />
              Verifying
            </Badge>
          )}
          {status === 'submitted' && (
            <Badge variant="outline" className="text-xs" data-testid="status-submitted">
              <Clock className="h-3 w-3 mr-1" />
              Submitted
            </Badge>
          )}
          {status === 'verified' && (
            <Badge variant="default" className="text-xs bg-green-500" data-testid="status-verified">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        
        {/* Search Phase */}
        {status === 'searching' && (
          <Card data-testid="card-search">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                {t('providerClaim.searchPrompt')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter practice name, specialty, or Provider ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchProviders()}
                  className="flex-1"
                  data-testid="input-search-provider"
                />
                <Button 
                  onClick={searchProviders}
                  disabled={!searchTerm.trim() || isSearching}
                  data-testid="button-search"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm" data-testid="search-results-header">
                    Found {searchResults.length} matching providers:
                  </h3>
                  
                  <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                      {searchResults.map((provider) => (
                        <Card 
                          key={provider.id} 
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => selectProvider(provider)}
                          data-testid={`provider-result-${provider.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium" data-testid={`provider-name-${provider.id}`}>
                                    {provider.name}
                                  </h4>
                                  {provider.verified && (
                                    <Badge variant="default" className="text-xs bg-blue-500">
                                      Verified
                                    </Badge>
                                  )}
                                  {provider.claimed && (
                                    <Badge variant="outline" className="text-xs">
                                      Claimed
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-1">
                                  {provider.specialty}
                                </p>
                                
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {provider.address}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {provider.phone}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-right text-xs">
                                <Badge variant="secondary">
                                  ID: {provider.id}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              
              {searchTerm && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No providers found matching "{searchTerm}"</p>
                  <p className="text-xs">Try a different search term or contact support</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Provider Found Phase */}
        {status === 'found' && selectedProvider && (
          <Card data-testid="card-selected-provider">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Selected Provider Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between p-4 bg-accent rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-lg" data-testid="selected-provider-name">
                      {selectedProvider.name}
                    </h3>
                    {selectedProvider.verified && (
                      <Badge variant="default" className="text-xs bg-blue-500">
                        Verified
                      </Badge>
                    )}
                    {selectedProvider.claimed && (
                      <Badge variant="destructive" className="text-xs">
                        Already Claimed
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground mb-2">{selectedProvider.specialty}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {selectedProvider.address}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedProvider.phone}
                    </div>
                  </div>
                </div>
                
                <Badge variant="secondary">
                  ID: {selectedProvider.id}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="text-center space-y-4">
                {selectedProvider.claimed ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">This profile has already been claimed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      If you believe this is your practice, please contact support for assistance.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Ready to claim this provider profile? You'll need to verify your credentials.
                    </p>
                    <Button 
                      onClick={startVerification}
                      className="w-full max-w-sm"
                      data-testid="button-start-verification"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {t('buttons.claimProfile')}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Form Phase */}
        {status === 'verifying' && selectedProvider && (
          <Card data-testid="card-verification-form">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('providerClaim.verificationForm')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('providerClaim.instructions')}
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Provider ID (readonly) */}
                  <FormField
                    control={form.control}
                    name="providerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('providerClaim.fields.providerId')}</FormLabel>
                        <FormControl>
                          <Input {...field} disabled className="bg-muted" data-testid="input-provider-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('providerClaim.fields.fullName')}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-full-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Professional Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('providerClaim.fields.email')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone Number */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('providerClaim.fields.phone')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* License Number */}
                    <FormField
                      control={form.control}
                      name="license"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('providerClaim.fields.license')}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-license" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* NPI Number */}
                  <FormField
                    control={form.control}
                    name="npi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('providerClaim.fields.npi')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="10-digit NPI number" data-testid="input-npi" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStatus('found')}
                      className="flex-1"
                      data-testid="button-back"
                    >
                      {t('buttons.back')}
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                      data-testid="button-submit-claim"
                    >
                      {isSubmitting ? 'Submitting...' : t('buttons.submit')}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => onSubmit(form.getValues())}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-instant-verify"
                    >
                      {t('buttons.instantVerify')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Submitted Status */}
        {status === 'submitted' && (
          <Card data-testid="card-submitted">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Clock className="h-16 w-16 mx-auto text-orange-500" />
                <div>
                  <h3 className="font-medium text-lg mb-2">Claim Submitted</h3>
                  <p className="text-muted-foreground">
                    {t('providerClaim.pending')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verified Status */}
        {status === 'verified' && (
          <Card data-testid="card-verified">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                <div>
                  <h3 className="font-medium text-lg mb-2">Profile Verified!</h3>
                  <p className="text-muted-foreground">
                    {t('providerClaim.verified')}
                  </p>
                </div>
                
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={resetClaim} data-testid="button-claim-another">
                    Claim Another Profile
                  </Button>
                  <Button onClick={() => window.location.href = '/profile'} data-testid="button-view-profile">
                    View My Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}