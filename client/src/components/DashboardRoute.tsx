import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardRoute() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation('/login');
        return;
      }
      
      // Redirect to appropriate dashboard based on user role
      switch (user.role) {
        case 'admin':
          setLocation('/admin');
          break;
        case 'provider':
          setLocation('/dashboard/provider');
          break;
        default:
          setLocation('/dashboard/user');
          break;
      }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return null; // Will redirect via useEffect
}