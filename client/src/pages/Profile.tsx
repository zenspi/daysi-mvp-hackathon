import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Phone, MapPin, Globe, LogOut } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Profile() {
  const { t, language, setLanguage } = useI18n();
  const { user, updateUser, logout, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    language: 'en',
    borough: '',
    zip: '',
  });
  
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        language: user.language || language,
        borough: user.borough || '',
        zip: user.zip || '',
      });
    }
  }, [user, language]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      await updateUser(formData);
      
      // Update app language if changed
      if (formData.language !== language) {
        setLanguage(formData.language as 'en' | 'es');
      }
      
      toast({
        title: t('auth.profile.updated'),
        description: 'Your profile has been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully',
    });
    setLocation('/');
  };

  const handleLocationUpdate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
          toast({
            title: 'Location updated',
            description: 'Your location has been updated',
          });
        },
        (error) => {
          toast({
            title: 'Location error',
            description: 'Could not get your location. Please enter manually.',
            variant: 'destructive',
          });
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle>{t('auth.profile.title')}</CardTitle>
          <CardDescription>
            {user.role === 'admin' && '👑 Admin • '}
            {user.role === 'provider' && '🩺 Provider • '}
            {t('common.member_since')} {new Date(user.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('auth.profile.personalInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('auth.profile.nameLabel')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              data-testid="input-name"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('auth.profile.emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t('auth.profile.phoneLabel')}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                data-testid="input-phone"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('auth.profile.languageLabel')}
            </Label>
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
            >
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="es">🇪🇸 Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Location Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('auth.profile.locationInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="borough">{t('auth.profile.boroughLabel')}</Label>
              <Select
                value={formData.borough}
                onValueChange={(value) => setFormData(prev => ({ ...prev, borough: value }))}
              >
                <SelectTrigger data-testid="select-borough">
                  <SelectValue placeholder="Select borough" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manhattan">Manhattan</SelectItem>
                  <SelectItem value="brooklyn">Brooklyn</SelectItem>
                  <SelectItem value="queens">Queens</SelectItem>
                  <SelectItem value="bronx">Bronx</SelectItem>
                  <SelectItem value="statenisland">Staten Island</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zip">{t('auth.profile.zipLabel')}</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                placeholder="10001"
                maxLength={5}
                data-testid="input-zip"
              />
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={handleLocationUpdate}
            className="w-full"
            data-testid="button-update-location"
          >
            <MapPin className="mr-2 h-4 w-4" />
            {t('auth.profile.updateLocation')}
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleUpdateProfile}
          disabled={isUpdating}
          className="w-full"
          data-testid="button-save-profile"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('auth.profile.updating')}
            </>
          ) : (
            t('buttons.save')
          )}
        </Button>
        
        <Separator />
        
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="w-full"
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('buttons.logout')}
        </Button>
      </div>
    </div>
  );
}