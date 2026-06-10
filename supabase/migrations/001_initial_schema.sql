-- Own Lovi - Initial Schema
-- Run this in your Supabase SQL Editor

BEGIN;

-- Helper function to generate random access keys
CREATE OR REPLACE FUNCTION generate_access_key()
RETURNS TEXT AS $$
  SELECT encode(gen_random_bytes(32), 'hex');
$$ LANGUAGE sql;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  system_prompt TEXT DEFAULT 'You are a helpful customer support assistant. Answer questions clearly and concisely based on the provided knowledge base. If you don''t know the answer, say so politely and offer to connect the user with a human agent.',
  welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
  model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
  temperature NUMERIC(3,2) DEFAULT 0.7,
  is_active BOOLEAN DEFAULT TRUE,
  configurations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  source VARCHAR(50) DEFAULT 'manual',
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  last_crawled_at TIMESTAMPTZ,
  pages_found INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawled_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_source_id UUID NOT NULL REFERENCES crawl_sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'Widget Principal',
  access_key VARCHAR(64) UNIQUE NOT NULL DEFAULT generate_access_key(),
  config JSONB DEFAULT '{"primaryColor": "#6366f1", "position": "bottom-right", "bubbleSize": 60}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  visitor_id VARCHAR(128) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key VARCHAR(64) UNIQUE NOT NULL DEFAULT generate_access_key(),
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faqs_agent_id ON faqs(agent_id);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(agent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crawl_sources_agent_id ON crawl_sources(agent_id);
CREATE INDEX IF NOT EXISTS idx_crawl_sources_status ON crawl_sources(status);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_source_id ON crawled_pages(crawl_source_id);
CREATE INDEX IF NOT EXISTS idx_widgets_agent_id ON widgets(agent_id);
CREATE INDEX IF NOT EXISTS idx_widgets_company_id ON widgets(company_id);
CREATE INDEX IF NOT EXISTS idx_widgets_access_key ON widgets(access_key);
CREATE INDEX IF NOT EXISTS idx_conversations_widget_id ON conversations(widget_id);
CREATE INDEX IF NOT EXISTS idx_conversations_visitor ON conversations(widget_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_company_id ON api_keys(company_id);


-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Companies: users can only see their own company
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY "Users can update own company" ON companies
  FOR UPDATE USING (owner_user_id = auth.uid());

-- Agents: scoped to user's company
CREATE POLICY "Users can manage agents in their company" ON agents
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_user_id = auth.uid())
  );

-- FAQs: scoped via agent -> company
CREATE POLICY "Users can manage FAQs for their agents" ON faqs
  FOR ALL USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN companies c ON a.company_id = c.id
      WHERE c.owner_user_id = auth.uid()
    )
  );

-- Crawl sources: scoped via agent -> company
CREATE POLICY "Users can manage crawl sources" ON crawl_sources
  FOR ALL USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN companies c ON a.company_id = c.id
      WHERE c.owner_user_id = auth.uid()
    )
  );

-- Crawled pages: scoped via source -> agent -> company
CREATE POLICY "Users can view crawled pages" ON crawled_pages
  FOR ALL USING (
    crawl_source_id IN (
      SELECT cs.id FROM crawl_sources cs
      JOIN agents a ON cs.agent_id = a.id
      JOIN companies c ON a.company_id = c.id
      WHERE c.owner_user_id = auth.uid()
    )
  );

-- Widgets: scoped to company
CREATE POLICY "Users can manage widgets in their company" ON widgets
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_user_id = auth.uid())
  );

-- Conversations: scoped via widget -> company
CREATE POLICY "Users can view conversations" ON conversations
  FOR ALL USING (
    widget_id IN (
      SELECT w.id FROM widgets w
      JOIN companies c ON w.company_id = c.id
      WHERE c.owner_user_id = auth.uid()
    )
  );

-- Messages: scoped via conversation -> widget -> company
CREATE POLICY "Users can view messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT conv.id FROM conversations conv
      JOIN widgets w ON conv.widget_id = w.id
      JOIN companies c ON w.company_id = c.id
      WHERE c.owner_user_id = auth.uid()
    )
  );

-- API Keys: scoped to company
CREATE POLICY "Users can manage API keys" ON api_keys
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_user_id = auth.uid())
  );

-- ============================================================
-- SERVICE ROLE BYPASS (for backend using service_role key)
-- ============================================================
-- The service_role key bypasses RLS by default in Supabase,
-- so the backend can access all data without restrictions.

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_crawl_sources_updated_at BEFORE UPDATE ON crawl_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_widgets_updated_at BEFORE UPDATE ON widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ENABLE pg_trgm extension for text search
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMIT;
