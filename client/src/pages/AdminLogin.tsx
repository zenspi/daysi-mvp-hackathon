import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Building2, Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react';

export default function AdminLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    department: '',
    adminCode: ''
  });

  const departments = [
    'System Administration',
    'Healthcare Operations',
    'Data Analytics',
    'Provider Relations',
    'Patient Services',
    'Security & Compliance'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Please enter email and password');
      }
      
      // For demo purposes - simple admin authentication
      if (formData.email.includes('admin') || formData.adminCode === 'ADMIN2024') {
        const userData = {
          id: '3',
          name: 'System Administrator',
          email: formData.email,
          department: formData.department || 'System Administration',
          adminCode: formData.adminCode,
          role: 'admin' as const
        };
        
        await login(formData.email, '');
        
        toast({
          title: 'Admin Access Granted',
          description: 'Welcome to the administrative dashboard.',
        });
        
        setLocation('/admin');
      } else {
        throw new Error('Invalid admin credentials. Use an admin email or admin code ADMIN2024');
      }
    } catch (error) {
      toast({
        title: 'Access Denied',
        description: error instanceof Error ? error.message : 'Invalid administrative credentials',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-lg border-2 border-orange-200 dark:border-orange-800">
        <CardHeader className="text-center space-y-3">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            Admin Login
          </CardTitle>
          <Badge variant="destructive" className="w-fit mx-auto">
            Restricted Access
          </Badge>
          
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Administrative access only
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@healthcare.org"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                data-testid="input-email"
                className="border-orange-200 focus:border-orange-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  data-testid="input-password"
                  className="border-orange-200 focus:border-orange-500"
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
            
            <div className="space-y-2">
              <Label htmlFor="adminCode">Admin Access Code</Label>
              <Input
                id="adminCode"
                type="text"
                placeholder="Enter admin code (optional)"
                value={formData.adminCode}
                onChange={(e) => setFormData({...formData, adminCode: e.target.value})}
                data-testid="input-admin-code"
                className="border-orange-200 focus:border-orange-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full p-2 border border-orange-200 bg-background rounded-md focus:border-orange-500"
                data-testid="select-department"
              >
                <option value="">Select your department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>Access Admin Dashboard</span>
                </div>
              )}
            </Button>
          </form>
          
          <div className="pt-4 border-t border-orange-200">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-medium">Demo Access:</p>
              <p>• Email containing "admin" OR</p>
              <p>• Admin code: <code className="bg-orange-100 dark:bg-orange-900/20 px-1 rounded">ADMIN2024</code></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}