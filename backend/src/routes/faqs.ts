import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

export const faqsRouter = Router();

const createFaqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  category: z.string().optional().nullable(),
});

const updateFaqSchema = createFaqSchema.partial().extend({
  is_active: z.boolean().optional(),
});

const bulkCreateSchema = z.object({
  faqs: z.array(createFaqSchema).min(1).max(100),
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

// GET /api/agents/:agentId/faqs
faqsRouter.get("/agents/:agentId/faqs", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found" });
      return;
    }

    if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let query = supabaseAdmin
      .from("faqs")
      .select("*", { count: "exact" })
      .eq("agent_id", req.params.agentId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
    }

    const { data: faqs, error, count } = await query;

    if (error) {
      res.status(500).json({ success: false, error: "Failed to fetch FAQs" });
      return;
    }

    res.json({ success: true, data: faqs, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error("List FAQs error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch FAQs" });
  }
});

// POST /api/agents/:agentId/faqs
faqsRouter.post("/agents/:agentId/faqs", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found" });
      return;
    }

    if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const body = createFaqSchema.parse(req.body);

    const { data: faq, error } = await supabaseAdmin
      .from("faqs")
      .insert({
        agent_id: req.params.agentId,
        question: body.question,
        answer: body.answer,
        category: body.category || null,
        source: "manual",
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: "Failed to create FAQ" });
      return;
    }

    res.status(201).json({ success: true, data: faq });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      return;
    }
    console.error("Create FAQ error:", err);
    res.status(500).json({ success: false, error: "Failed to create FAQ" });
  }
});

// PUT /api/agents/:agentId/faqs/:id
faqsRouter.put("/agents/:agentId/faqs/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found" });
      return;
    }

    if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const body = updateFaqSchema.parse(req.body);

    const updateData: Record<string, unknown> = {};
    if (body.question !== undefined) updateData.question = body.question;
    if (body.answer !== undefined) updateData.answer = body.answer;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: faq, error } = await supabaseAdmin
      .from("faqs")
      .update(updateData)
      .eq("id", req.params.id)
      .eq("agent_id", req.params.agentId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: "Failed to update FAQ" });
      return;
    }

    res.json({ success: true, data: faq });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      return;
    }
    console.error("Update FAQ error:", err);
    res.status(500).json({ success: false, error: "Failed to update FAQ" });
  }
});

// DELETE /api/agents/:agentId/faqs/:id
faqsRouter.delete("/agents/:agentId/faqs/:id", authMiddleware, async (req: Request, res: Response) => {
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
      .from("faqs")
      .delete()
      .eq("id", req.params.id)
      .eq("agent_id", req.params.agentId);

    if (error) {
      res.status(500).json({ success: false, error: "Failed to delete FAQ" });
      return;
    }

    res.json({ success: true, message: "FAQ deleted" });
  } catch (err) {
    console.error("Delete FAQ error:", err);
    res.status(500).json({ success: false, error: "Failed to delete FAQ" });
  }
});

// POST /api/agents/:agentId/faqs/bulk
faqsRouter.post("/agents/:agentId/faqs/bulk", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.companyId) {
      res.status(400).json({ success: false, error: "No company found" });
      return;
    }

    if (!(await verifyAgentOwnership(req.params.agentId, req.companyId))) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const body = bulkCreateSchema.parse(req.body);

    const faqsToInsert = body.faqs.map((f) => ({
      agent_id: req.params.agentId,
      question: f.question,
      answer: f.answer,
      category: f.category || null,
      source: "manual" as const,
    }));

    const { data: faqs, error } = await supabaseAdmin
      .from("faqs")
      .insert(faqsToInsert)
      .select();

    if (error) {
      res.status(500).json({ success: false, error: "Failed to bulk create FAQs" });
      return;
    }

    res.status(201).json({ success: true, data: faqs, count: faqs.length });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      return;
    }
    console.error("Bulk create FAQs error:", err);
    res.status(500).json({ success: false, error: "Failed to bulk create FAQs" });
  }
});
