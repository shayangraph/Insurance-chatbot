import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthTokens } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone_number: string, password: string) => Promise<User>;
  register: (
    phone_number: string,
    full_name: string,
    password: string,
    is_expert_applicant?: boolean,
    requested_company_id?: number | null
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const access = localStorage.getItem('access_token');
      const refresh = localStorage.getItem('refresh_token');
      if (access && refresh) {
        setTokens({ access, refresh });
        try {
          const userData = await authService.getProfile();
          setUser(userData);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setTokens(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (phone_number: string, password: string) => {
    const data = await authService.login(phone_number, password);
    setUser(data.user);
    setTokens(data.tokens);
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    return data.user;
  };


  const register = async (
    phone_number: string,
    full_name: string,
    password: string,
    is_expert_applicant?: boolean,
    requested_company_id?: number | null
  ) => {
    const data = await authService.register(
      phone_number,
      full_name,
      password,
      is_expert_applicant,
      requested_company_id
    );
    setUser(data.user);
    setTokens(data.tokens);
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
  };

  const logout = async () => {
    try {
      if (tokens?.refresh) {
        await authService.logout(tokens.refresh);
      }
    } catch {}
    setUser(null);
    setTokens(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('chat_session_id');
  };

  return (
    <AuthContext.Provider value={{ user, tokens, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
