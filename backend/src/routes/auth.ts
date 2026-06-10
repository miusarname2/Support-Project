import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(1, "Company name is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

    if (authError) {
      res.status(400).json({ success: false, error: authError.message });
      return;
    }

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({ name: body.companyName, owner_user_id: authData.user.id })
      .select()
      .single();

    if (companyError) {
      // Rollback: delete user if company creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      res.status(500).json({ success: false, error: "Failed to create company" });
      return;
    }

    // Sign in to get a session token
    const { data: session, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

    if (signInError) {
      res.status(500).json({ success: false, error: "Account created but login failed" });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        company: {
          id: company.id,
          name: company.name,
        },
        token: session.session?.access_token,
        refresh_token: session.session?.refresh_token,
      },
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    // Get company info
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("owner_user_id", data.user.id)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        company: company
          ? { id: company.id, name: company.name }
          : null,
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ success: false, error: "Validation error", details: err.errors });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// POST /api/auth/logout
authRouter.post("/logout", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.substring(7);
      await supabaseAdmin.auth.admin.signOut(token);
    }
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    res.json({ success: true, message: "Logged out" });
  }
});

// GET /api/auth/me
authRouter.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name, created_at")
      .eq("owner_user_id", req.userId!)
      .maybeSingle();

    // Count agents and conversations for dashboard stats
    let agentCount = 0;
    let faqCount = 0;
    let conversationCount = 0;
    let widgetCount = 0;

    if (company) {
      const [agentsRes, widgetsRes] = await Promise.all([
        supabaseAdmin
          .from("agents")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id),
        supabaseAdmin
          .from("widgets")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id),
      ]);

      agentCount = agentsRes.count ?? 0;
      widgetCount = widgetsRes.count ?? 0;

      // Count FAQs across all agents
      const { data: agentIds } = await supabaseAdmin
        .from("agents")
        .select("id")
        .eq("company_id", company.id);

      if (agentIds && agentIds.length > 0) {
        const ids = agentIds.map((a) => a.id);
        const [faqsRes, convsRes] = await Promise.all([
          supabaseAdmin
            .from("faqs")
            .select("id", { count: "exact", head: true })
            .in("agent_id", ids),
          supabaseAdmin
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .in("agent_id", ids),
        ]);
        faqCount = faqsRes.count ?? 0;
        conversationCount = convsRes.count ?? 0;
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.userId,
          email: req.userEmail,
        },
        company: company
          ? { id: company.id, name: company.name, created_at: company.created_at }
          : null,
        stats: {
          agents: agentCount,
          faqs: faqCount,
          conversations: conversationCount,
          widgets: widgetCount,
        },
      },
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
});
