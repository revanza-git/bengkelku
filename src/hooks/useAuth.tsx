import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AxiosError } from 'axios';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  full_name: string;
  org_id: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: { message: string; status?: number } }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: { message: string; status?: number } }>;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = authApi.getUser();
        if (storedUser && authApi.isAuthenticated()) {
          // Verify token is still valid by calling profile endpoint
          try {
            const profile = await authApi.getProfile();
            setUser(profile);
          } catch {
            // Token invalid, clear storage
            authApi.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const normalizeAuthError = (error: unknown) => {
    const axiosError = error as AxiosError<{ message?: string | string[] }>;
    const status = axiosError?.response?.status;
    const messageFromApi = axiosError?.response?.data?.message;
    const message =
      Array.isArray(messageFromApi)
        ? messageFromApi.join(', ')
        : messageFromApi ||
          (status === 401
            ? 'Invalid email or password.'
            : status === 409
              ? 'Email already registered.'
              : 'Unexpected error. Please try again.');
    return { message, status };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user: userData } = await authApi.login(email, password);
      setUser(userData);
      return {};
    } catch (error) {
      return { error: normalizeAuthError(error) };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const { user: userData } = await authApi.register(email, password, fullName);
      setUser(userData);
      return {};
    } catch (error) {
      return { error: normalizeAuthError(error) };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
