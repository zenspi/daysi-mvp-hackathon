import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email?: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      // Check if user data exists in localStorage for demo purposes
      const savedUser = localStorage.getItem('daysi_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('daysi_user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email?: string, phone?: string) => {
    if (!email && !phone) {
      throw new Error('Email or phone is required');
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phone,
          name: '', // Will be updated in profile
          language: 'en', // Default language
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      const userData = data.user;
      setUser(userData);
      
      // Save user data to localStorage for persistence
      localStorage.setItem('daysi_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    setIsLoading(true);
    try {
      // For now, update localStorage (in real app, would call API)
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('daysi_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Update user failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('daysi_user');
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    user,
    isLoading,
    login,
    logout,
    updateUser,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}