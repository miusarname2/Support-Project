import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

export const widgetsRouter = Router();

const createWidgetSchema = z.object({
  name: z.string().min(1).max(255).default("Widget Principal"),
  config: z
    .object({
      primaryColor: z.string().default("#6366f1"),
      position: z.enum(["bottom-right", "bottom-left"]).default("bottom-right"),
      bubbleSize: z.number().min(40).max(100).default(60),
    })
    .default({}),
});

const updateWidgetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

function generateAccessKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

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

// GET /api/agents/:agentId/widgets
widgetsRouter.get(
  "/agents/:agentId/widgets",
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

      const { data: widgets, error } = await supabaseAdmin
        .from("widgets")
        .select("*")
        .eq("agent_id", req.params.agentId)
        .eq("company_id", req.companyId)
        .order("created_at", { ascending: false });

      if (error) {
        res.status(500).json({ success: false, error: "Failed to fetch widgets" });
        return;
      }

      res.json({ success: true, data: widgets });
    } catch (err) {
      console.error("List widgets error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch widgets" });
    }
  }
);

// POST /api/agents/:agentId/widgets
widgetsRouter.post(
  "/agents/:agentId/widgets",
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

      const body = createWidgetSchema.parse(req.body);

      const { data: widget, error } = await supabaseAdmin
        .from("widgets")
        .insert({
          agent_id: req.params.agentId,
          company_id: req.companyId,
          name: body.name,
          access_key: generateAccessKey(),
          config: body.config,
        })
        .select()
        .single();

      if (error) {
        console.error("Create widget error:", error);
        res.status(500).json({ success: false, error: "Failed to create widget" });
        return;
      }

      res.status(201).json({ success: true, data: widget });
    } catch (err: any) {
      if (err.name === "ZodError") {
        res.status(400).json({ success: false, error: "Validation error", details: err.errors });
        return;
      }
      console.error("Create widget error:", err);
      res.status(500).json({ success: false, error: "Failed to create widget" });
    }
  }
);

// PUT /api/agents/:agentId/widgets/:id
widgetsRouter.put(
  "/agents/:agentId/widgets/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.companyId) {
        res.status(400).json({ success: false, error: "No company found" });
        return;
      }

      const body = updateWidgetSchema.parse(req.body);

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.config !== undefined) updateData.config = body.config;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;

      const { data: widget, error } = await supabaseAdmin
        .from("widgets")
        .update(updateData)
        .eq("id", req.params.id)
        .eq("agent_id", req.params.agentId)
        .eq("company_id", req.companyId)
        .select()
        .single();

      if (error) {
        res.status(500).json({ success: false, error: "Failed to update widget" });
        return;
      }

      res.json({ success: true, data: widget });
    } catch (err: any) {
      if (err.name === "ZodError") {
        res.status(400).json({ success: false, error: "Validation error", details: err.errors });
        return;
      }
      console.error("Update widget error:", err);
      res.status(500).json({ success: false, error: "Failed to update widget" });
    }
  }
);

// DELETE /api/agents/:agentId/widgets/:id
widgetsRouter.delete(
  "/agents/:agentId/widgets/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.companyId) {
        res.status(400).json({ success: false, error: "No company found" });
        return;
      }

      const { error } = await supabaseAdmin
        .from("widgets")
        .delete()
        .eq("id", req.params.id)
        .eq("agent_id", req.params.agentId)
        .eq("company_id", req.companyId);

      if (error) {
        res.status(500).json({ success: false, error: "Failed to delete widget" });
        return;
      }

      res.json({ success: true, message: "Widget deleted" });
    } catch (err) {
      console.error("Delete widget error:", err);
      res.status(500).json({ success: false, error: "Failed to delete widget" });
    }
  }
);

// POST /api/agents/:agentId/widgets/:id/regenerate-key
widgetsRouter.post(
  "/agents/:agentId/widgets/:id/regenerate-key",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.companyId) {
        res.status(400).json({ success: false, error: "No company found" });
        return;
      }

      const newKey = generateAccessKey();

      const { data: widget, error } = await supabaseAdmin
        .from("widgets")
        .update({ access_key: newKey })
        .eq("id", req.params.id)
        .eq("agent_id", req.params.agentId)
        .eq("company_id", req.companyId)
        .select()
        .single();

      if (error) {
        res.status(500).json({ success: false, error: "Failed to regenerate key" });
        return;
      }

      res.json({ success: true, data: widget });
    } catch (err) {
      console.error("Regenerate key error:", err);
      res.status(500).json({ success: false, error: "Failed to regenerate key" });
    }
  }
);
