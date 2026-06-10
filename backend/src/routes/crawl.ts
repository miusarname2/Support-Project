import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config/env.js";

export const crawlRouter = Router();

const startCrawlSchema = z.object({
  url: z.string().url("Invalid URL"),
  max_pages: z.number().min(1).max(50).default(10),
});

// Helper to verify agent belongs to user's company
async function verifyAgentOwnership(agentId: string, companyId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("company_id", companyId)
    .maybeSingle();
  return !!data;
}

// POST /api/agents/:agentId/crawl - Start crawling a URL
crawlRouter.post(
  "/agents/:agentId/crawl",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.companyId) {
        res.status(400).json({ success: false, error: "No company found" });
        return;
      }

      if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
        res.status(404).json({ success: false, error: "Agent not found" });
        return;
      }

      const body = startCrawlSchema.parse(req.body);

      // Call AI service to start crawling
      const aiServiceUrl = `${env.AI_SERVICE_URL}/crawl/start`;
      const response = await fetch(aiServiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: body.url,
          agent_id: req.params.agentId,
          max_pages: body.max_pages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI service crawl error:", errText);
        res.status(502).json({ success: false, error: "Crawling service unavailable" });
        return;
      }

      const result = await response.json();
      res.status(202).json({ success: true, data: result });
    } catch (err: any) {
      if (err.name === "ZodError") {
        res.status(400).json({ success: false, error: "Validation error", details: err.errors });
        return;
      }
      console.error("Start crawl error:", err);
      res.status(500).json({ success: false, error: "Failed to start crawling" });
    }
  }
);

// GET /api/agents/:agentId/crawl - List crawl sources
crawlRouter.get(
  "/agents/:agentId/crawl",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.companyId) {
        res.status(400).json({ success: false, error: "No company found" });
        return;
      }

      if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
        res.status(404).json({ success: false, error: "Agent not found" });
        return;
      }

      const { data: sources, error } = await supabaseAdmin
        .from("crawl_sources")
        .select("*")
        .eq("agent_id", req.params.agentId)
        .order("created_at", { ascending: false });

      if (error) {
        res.status(500).json({ success: false, error: "Failed to fetch crawl sources" });
        return;
      }

      res.json({ success: true, data: sources });
    } catch (err) {
      console.error("List crawl sources error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch crawl sources" });
    }
  }
);

// GET /api/agents/:agentId/crawl/:sourceId/pages - List crawled pages
crawlRouter.get(
  "/agents/:agentId/crawl/:sourceId/pages",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.companyId) {
        res.status(400).json({ success: false, error: "No company found" });
        return;
      }

      if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
        res.status(404).json({ success: false, error: "Agent not found" });
        return;
      }

      const { data: pages, error } = await supabaseAdmin
        .from("crawled_pages")
        .select("*")
        .eq("crawl_source_id", req.params.sourceId)
        .order("created_at", { ascending: false });

      if (error) {
        res.status(500).json({ success: false, error: "Failed to fetch pages" });
        return;
      }

      res.json({ success: true, data: pages });
    } catch (err) {
      console.error("List crawled pages error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch pages" });
    }
  }
);

// DELETE /api/agents/:agentId/crawl/:sourceId - Delete crawl source
crawlRouter.delete(
  "/agents/:agentId/crawl/:sourceId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.companyId) {
        res.status(400).json({ success: false, error: "No company found" });
        return;
      }

      if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
        res.status(404).json({ success: false, error: "Agent not found" });
        return;
      }

      const { error } = await supabaseAdmin
        .from("crawl_sources")
        .delete()
        .eq("id", req.params.sourceId)
        .eq("agent_id", req.params.agentId);

      if (error) {
        res.status(500).json({ success: false, error: "Failed to delete source" });
        return;
      }

      res.json({ success: true, message: "Crawl source deleted" });
    } catch (err) {
      console.error("Delete crawl source error:", err);
      res.status(500).json({ success: false, error: "Failed to delete source" });
    }
  }
);

// POST /api/agents/:agentId/crawl/:sourceId/generate-faqs - Generate FAQs from crawled content
crawlRouter.post(
  "/agents/:agentId/crawl/:sourceId/generate-faqs",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.companyId) {
        res.status(400).json({ success: false, error: "No company found" });
        return;
      }

      if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
        res.status(404).json({ success: false, error: "Agent not found" });
        return;
      }

      // Call AI service to generate FAQs
      const aiServiceUrl = `${env.AI_SERVICE_URL}/crawl/generate-faqs`;
      const response = await fetch(aiServiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: req.params.agentId,
          source_id: req.params.sourceId,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI service FAQ generation error:", errText);
        res.status(502).json({ success: false, error: "FAQ generation service unavailable" });
        return;
      }

      const result = await response.json();
      res.json({ success: true, data: result });
    } catch (err) {
      console.error("Generate FAQs error:", err);
      res.status(500).json({ success: false, error: "Failed to generate FAQs" });
    }
  }
);
