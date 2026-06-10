import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

export const agentsRouter = Router();

// All routes require authentication
agentsRouter.use(authMiddleware);

const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
  system_prompt: z.string().optional().nullable(),
  welcome_message: z.string().optional().nullable(),
  model: z
    .enum(["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"])
    .default("llama-3.3-70b-versatile"),
  temperature: z.number().min(0).max(1).default(0.7),
});

const updateAgentSchema = createAgentSchema.partial().extend({
  is_active: z.boolean().optional(),
  configurations: z.record(z.unknown()).optional(),
});

// GET /api/agents - List agents for user's company
agentsRouter.get("/", async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found for user" });
      return;
    }

    const { data: agents, error } = await supabaseAdmin
      .from("agents")
      .select("*")
      .eq("company_id", req.companyId)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: "Failed to fetch agents" });
      return;
    }

    // Get FAQ counts per agent
    const agentIds = agents.map((a) => a.id);
    let faqCounts: Record<string, number> = {};

    if (agentIds.length > 0) {
      const { data: faqs } = await supabaseAdmin
        .from("faqs")
        .select("agent_id")
        .in("agent_id", agentIds);

      if (faqs) {
        for (const faq of faqs) {
          faqCounts[faq.agent_id] = (faqCounts[faq.agent_id] || 0) + 1;
        }
      }
    }

    const agentsWithCounts = agents.map((agent) => ({
      ...agent,
      faq_count: faqCounts[agent.id] || 0,
    }));

    res.json({ success: true, data: agentsWithCounts });
  } catch (err) {
    console.error("List agents error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch agents" });
  }
});

// POST /api/agents - Create agent
agentsRouter.post("/", async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found for user" });
      return;
    }

    const body = createAgentSchema.parse(req.body);

    const { data: agent, error } = await supabaseAdmin
      .from("agents")
      .insert({
        company_id: req.companyId,
        name: body.name,
        description: body.description || null,
        system_prompt: body.system_prompt || null,
        welcome_message: body.welcome_message || null,
        model: body.model,
        temperature: body.temperature,
      })
      .select()
      .single();

    if (error) {
      console.error("Create agent error:", error);
      res.status(500).json({ success: false, error: "Failed to create agent" });
      return;
    }

    res.status(201).json({ success: true, data: agent });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      return;
    }
    console.error("Create agent error:", err);
    res.status(500).json({ success: false, error: "Failed to create agent" });
  }
});

// GET /api/agents/:id - Get agent by ID
agentsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found for user" });
      return;
    }

    const { data: agent, error } = await supabaseAdmin
      .from("agents")
      .select("*")
      .eq("id", req.params.id)
      .eq("company_id", req.companyId)
      .maybeSingle();

    if (error || !agent) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    // Get FAQ count
    const { count: faqCount } = await supabaseAdmin
      .from("faqs")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agent.id);

    // Get conversation count
    const { count: conversationCount } = await supabaseAdmin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agent.id);

    res.json({
      success: true,
      data: {
        ...agent,
        faq_count: faqCount ?? 0,
        conversation_count: conversationCount ?? 0,
      },
    });
  } catch (err) {
    console.error("Get agent error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch agent" });
  }
});

// PUT /api/agents/:id - Update agent
agentsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found for user" });
      return;
    }

    const body = updateAgentSchema.parse(req.body);

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("id", req.params.id)
      .eq("company_id", req.companyId)
      .maybeSingle();

    if (!existing) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.system_prompt !== undefined) updateData.system_prompt = body.system_prompt;
    if (body.welcome_message !== undefined) updateData.welcome_message = body.welcome_message;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.temperature !== undefined) updateData.temperature = body.temperature;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.configurations !== undefined) updateData.configurations = body.configurations;

    const { data: agent, error } = await supabaseAdmin
      .from("agents")
      .update(updateData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: "Failed to update agent" });
      return;
    }

    res.json({ success: true, data: agent });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      return;
    }
    console.error("Update agent error:", err);
    res.status(500).json({ success: false, error: "Failed to update agent" });
  }
});

// DELETE /api/agents/:id - Delete agent
agentsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found for user" });
      return;
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("id", req.params.id)
      .eq("company_id", req.companyId)
      .maybeSingle();

    if (!existing) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const { error } = await supabaseAdmin
      .from("agents")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      res.status(500).json({ success: false, error: "Failed to delete agent" });
      return;
    }

    res.json({ success: true, message: "Agent deleted" });
  } catch (err) {
    console.error("Delete agent error:", err);
    res.status(500).json({ success: false, error: "Failed to delete agent" });
  }
});
