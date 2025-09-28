import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('user' | 'provider' | 'admin')[];
  redirectTo?: string;
}

export default function RoleBasedRoute({ 
  children, 
  allowedRoles, 
  redirectTo = '/login' 
}: RoleBasedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation(redirectTo);
        return;
      }
      
      if (!allowedRoles.includes(user.role || 'user')) {
        // Redirect to appropriate dashboard based on user's role
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
    }
  }, [user, isLoading, allowedRoles, redirectTo, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role || 'user')) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}