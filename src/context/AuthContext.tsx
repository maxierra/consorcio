import { createContext, useContext, ReactNode } from 'react';
import { AuthState } from '../types/auth';

const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  value: AuthState;
}

export function AuthProvider({ children, value }: AuthProviderProps) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}