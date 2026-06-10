export interface Company {
  id: string;
  name: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  updated_at: string;
}

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

export interface CrawlSource {
  id: string;
  agent_id: string;
  url: string;
  status: "pending" | "crawling" | "completed" | "error";
  last_crawled_at: string | null;
  pages_found: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawledPage {
  id: string;
  crawl_source_id: string;
  url: string;
  title: string | null;
  content: string | null;
  status: "pending" | "scraped" | "error";
  created_at: string;
}

export interface Widget {
  id: string;
  agent_id: string;
  company_id: string;
  name: string;
  access_key: string;
  config: {
    primaryColor?: string;
    position?: string;
    bubbleSize?: number;
    [key: string]: unknown;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  widget_id: string;
  agent_id: string;
  visitor_id: string;
  status: "active" | "closed";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApiKey {
  id: string;
  company_id: string;
  key: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Extended Express Request with auth info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      companyId?: string;
      userEmail?: string;
    }
  }
}
