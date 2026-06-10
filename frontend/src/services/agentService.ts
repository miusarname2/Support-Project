import { api } from "./api";

export interface Agent {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  system_prompt: string | null;
  welcome_message: string | null;
  model: string;
  temperature: number;
  is_active: boolean;
  configurations: Record<string, unknown>;
  faq_count?: number;
  conversation_count?: number;
  created_at: string;
  updated_at: string;
}

interface AgentListResponse {
  success: boolean;
  data: Agent[];
}

interface AgentResponse {
  success: boolean;
  data: Agent;
}

export interface CreateAgentData {
  name: string;
  description?: string;
  system_prompt?: string;
  welcome_message?: string;
  model?: string;
  temperature?: number;
}

export const agentService = {
  async getAgents(): Promise<Agent[]> {
    const res = await api.get<AgentListResponse>("/agents");
    return res.data;
  },

  async getAgent(id: string): Promise<Agent> {
    const res = await api.get<AgentResponse>(`/agents/${id}`);
    return res.data;
  },

  async createAgent(data: CreateAgentData): Promise<Agent> {
    const res = await api.post<AgentResponse>("/agents", data);
    return res.data;
  },

  async updateAgent(id: string, data: Partial<CreateAgentData> & { is_active?: boolean }): Promise<Agent> {
    const res = await api.put<AgentResponse>(`/agents/${id}`, data);
    return res.data;
  },

  async deleteAgent(id: string): Promise<void> {
    await api.del(`/agents/${id}`);
  },
};
