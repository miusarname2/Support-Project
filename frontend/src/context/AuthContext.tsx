import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";

interface User {
  id: string;
  email: string;
}

interface Company {
  id: string;
  name: string;
}

interface Stats {
  agents: number;
  faqs: number;
  conversations: number;
  widgets: number;
}

interface AuthState {
  user: User | null;
  company: Company | null;
  stats: Stats | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, companyName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
      setCompany(data.company);
      setStats(data.stats);
    } catch {
      setUser(null);
      setCompany(null);
      setStats(null);
    }
  }, []);

  useEffect(() => {
    if (authService.hasToken()) {
      refreshProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    setCompany(data.company);
  };

  const register = async (email: string, password: string, companyName: string) => {
    const data = await authService.register(email, password, companyName);
    setUser(data.user);
    setCompany(data.company);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setCompany(null);
    setStats(null);
  };

  return (
    <AuthContext.Provider value={{ user, company, stats, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
