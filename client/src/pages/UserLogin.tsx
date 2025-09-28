import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Eye, EyeOff, LogIn } from 'lucide-react';

export default function UserLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    borough: '',
    language: 'en'
  });

  const boroughs = [
    'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate user authentication
      if (isLogin) {
        // Login validation
        if (!formData.email || !formData.password) {
          throw new Error('Please enter email and password');
        }
        
        // For demo purposes, accept any email/password combo
        const userData = {
          id: '1',
          name: formData.name || 'User',
          email: formData.email,
          phone: formData.phone,
          borough: formData.borough,
          language: formData.language,
          role: 'user' as const
        };
        
        await login(formData.email, formData.phone);
        
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in to your user account.',
        });
        
        setLocation('/dashboard/user');
      } else {
        // Registration
        if (!formData.name || !formData.email || !formData.password) {
          throw new Error('Please fill in all required fields');
        }
        
        const userData = {
          id: Date.now().toString(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          borough: formData.borough,
          language: formData.language,
          role: 'user' as const
        };
        
        await login(formData.email, formData.phone);
        
        toast({
          title: 'Account created!',
          description: 'Welcome to your new user account.',
        });
        
        setLocation('/dashboard/user');
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'User Login' : 'Create User Account'}
          </CardTitle>
          <Badge variant="outline" className="w-fit mx-auto">
            Patient Dashboard Access
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
                  placeholder="Enter your full name"
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
                placeholder="your@email.com"
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
                
                <div className="space-y-2">
                  <Label htmlFor="borough">Borough</Label>
                  <select
                    id="borough"
                    value={formData.borough}
                    onChange={(e) => setFormData({...formData, borough: e.target.value})}
                    className="w-full p-2 border border-input bg-background rounded-md"
                    data-testid="select-borough"
                  >
                    <option value="">Select your borough</option>
                    {boroughs.map(borough => (
                      <option key={borough} value={borough}>{borough}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-blue-500 hover:bg-blue-600"
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
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                </div>
              )}
            </Button>
          </form>
          
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-blue-500 hover:text-blue-600 font-medium"
              data-testid="button-toggle-mode"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
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