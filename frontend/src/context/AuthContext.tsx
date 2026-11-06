import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (demoId: 'buyer' | 'dhl' | 'bluedart' | 'fedex' | 'delhivery') => Promise<void>;
}

const DEMO_ACCOUNTS = {
  buyer: { email: 'buyer@acme.com', password: 'password123' },
  dhl: { email: 'dhl@supplier.com', password: 'password123' },
  bluedart: { email: 'bluedart@supplier.com', password: 'password123' },
  fedex: { email: 'fedex@supplier.com', password: 'password123' },
  delhivery: { email: 'delhivery@supplier.com', password: 'password123' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const switchDemoUser = async (demoId: keyof typeof DEMO_ACCOUNTS) => {
    setIsLoading(true);
    try {
      const creds = DEMO_ACCOUNTS[demoId];
      await login(creds.email, creds.password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, switchDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

