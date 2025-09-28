import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope, Building, Eye, EyeOff, LogIn } from 'lucide-react';

export default function ProviderLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    practice: '',
    specialty: '',
    npi: '',
    phone: ''
  });

  const specialties = [
    'Primary Care', 'Cardiology', 'Dermatology', 'Endocrinology',
    'Gastroenterology', 'Neurology', 'Oncology', 'Orthopedics',
    'Pediatrics', 'Psychiatry', 'Surgery', 'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          throw new Error('Please enter email and password');
        }
        
        const userData = {
          id: '2',
          name: formData.name || 'Dr. Provider',
          email: formData.email,
          phone: formData.phone,
          practice: formData.practice,
          specialty: formData.specialty,
          npi: formData.npi,
          role: 'provider' as const
        };
        
        await login(formData.email, formData.phone);
        
        toast({
          title: 'Welcome back, Doctor!',
          description: 'Successfully logged in to your provider account.',
        });
        
        setLocation('/dashboard/provider');
      } else {
        if (!formData.name || !formData.email || !formData.password || !formData.specialty) {
          throw new Error('Please fill in all required fields');
        }
        
        const userData = {
          id: Date.now().toString(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          practice: formData.practice,
          specialty: formData.specialty,
          npi: formData.npi,
          role: 'provider' as const
        };
        
        await login(formData.email, formData.phone);
        
        toast({
          title: 'Provider account created!',
          description: 'Welcome to your new provider dashboard.',
        });
        
        setLocation('/dashboard/provider');
      }
    } catch (error) {
      toast({
        title: 'Authentication Error',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'Provider Login' : 'Provider Registration'}
          </CardTitle>
          <Badge variant="outline" className="w-fit mx-auto">
            Healthcare Provider Access
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  data-testid="input-name"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@practice.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Medical Specialty *</Label>
                  <select
                    id="specialty"
                    value={formData.specialty}
                    onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                    className="w-full p-2 border border-input bg-background rounded-md"
                    data-testid="select-specialty"
                  >
                    <option value="">Select your specialty</option>
                    {specialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="practice">Practice/Hospital Name</Label>
                  <Input
                    id="practice"
                    type="text"
                    placeholder="NYC Medical Center"
                    value={formData.practice}
                    onChange={(e) => setFormData({...formData, practice: e.target.value})}
                    data-testid="input-practice"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="npi">NPI Number</Label>
                  <Input
                    id="npi"
                    type="text"
                    placeholder="1234567890"
                    value={formData.npi}
                    onChange={(e) => setFormData({...formData, npi: e.target.value})}
                    data-testid="input-npi"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    data-testid="input-phone"
                  />
                </div>
              </>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>{isLogin ? 'Sign In' : 'Register Practice'}</span>
                </div>
              )}
            </Button>
          </form>
          
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "New provider?" : "Already registered?"}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-green-500 hover:text-green-600 font-medium"
              data-testid="button-toggle-mode"
            >
              {isLogin ? 'Register here' : 'Sign in'}
            </button>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              For demo: Use any email/password combination
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}