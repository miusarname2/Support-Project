import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export interface FAQ {
  id: string;
  agent_id: string;
  question: string;
  answer: string;
  category: string | null;
  is_active: boolean;
  source: "manual" | "crawled";
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

interface FAQListResponse {
  success: boolean;
  data: FAQ[];
  total: number;
  limit: number;
  offset: number;
}

interface FAQResponse {
  success: boolean;
  data: FAQ;
}

export function useFAQs(agentId: string, search?: string, page?: number) {
  const limit = 20;
  const offset = ((page || 1) - 1) * limit;

  return useQuery({
    queryKey: ["faqs", agentId, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (search) params.set("search", search);
      const res = await api.get<FAQListResponse>(`/agents/${agentId}/faqs?${params}`);
      return { faqs: res.data, total: res.total, limit: res.limit, offset: res.offset };
    },
    enabled: !!agentId,
  });
}

export function useCreateFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: { question: string; answer: string; category?: string } }) =>
      api.post<FAQResponse>(`/agents/${agentId}/faqs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });
}

export function useUpdateFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, faqId, data }: { agentId: string; faqId: string; data: Partial<FAQ> }) =>
      api.put<FAQResponse>(`/agents/${agentId}/faqs/${faqId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });
}

export function useDeleteFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, faqId }: { agentId: string; faqId: string }) =>
      api.del(`/agents/${agentId}/faqs/${faqId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });
}

export function useBulkCreateFAQs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, faqs }: { agentId: string; faqs: { question: string; answer: string; category?: string }[] }) =>
      api.post(`/agents/${agentId}/faqs/bulk`, { faqs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });
}
