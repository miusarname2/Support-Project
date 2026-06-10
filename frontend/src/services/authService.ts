import { api } from "./api";

interface AuthResponse {
  success: boolean;
  data: {
    user: { id: string; email: string };
    company: { id: string; name: string } | null;
    token: string;
    refresh_token: string;
    stats?: {
      agents: number;
      faqs: number;
      conversations: number;
      widgets: number;
    };
  };
}

interface MeResponse {
  success: boolean;
  data: {
    user: { id: string; email: string };
    company: { id: string; name: string; created_at: string } | null;
    stats: {
      agents: number;
      faqs: number;
      conversations: number;
      widgets: number;
    };
  };
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse["data"]> {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    if (res.data.token) {
      localStorage.setItem("own_lovi_token", res.data.token);
      localStorage.setItem("own_lovi_refresh_token", res.data.refresh_token);
    }
    return res.data;
  },

  async register(email: string, password: string, companyName: string): Promise<AuthResponse["data"]> {
    const res = await api.post<AuthResponse>("/auth/register", {
      email,
      password,
      companyName,
    });
    if (res.data.token) {
      localStorage.setItem("own_lovi_token", res.data.token);
      localStorage.setItem("own_lovi_refresh_token", res.data.refresh_token);
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem("own_lovi_token");
    localStorage.removeItem("own_lovi_refresh_token");
  },

  async getMe(): Promise<MeResponse["data"]> {
    const res = await api.get<MeResponse>("/auth/me");
    return res.data;
  },

  hasToken(): boolean {
    return !!localStorage.getItem("own_lovi_token");
  },
};
