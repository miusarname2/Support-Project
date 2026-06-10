import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * JWT auth middleware - validates Bearer token from Supabase Auth.
 * Attaches userId, companyId, and userEmail to the request.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ success: false, error: "Invalid or expired token" });
      return;
    }

    // Get the user's company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (companyError) {
      console.error("Error fetching company:", companyError);
      res.status(500).json({ success: false, error: "Error fetching user data" });
      return;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.companyId = company?.id ?? undefined;

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ success: false, error: "Authentication error" });
  }
}

/**
 * Access key auth middleware for public widget endpoints.
 * Validates the access_key parameter against the widgets table.
 */
export async function accessKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accessKey = req.params.accessKey;

    if (!accessKey || accessKey.length < 10) {
      res.status(400).json({ success: false, error: "Invalid access key" });
      return;
    }

    const { data: widget, error } = await supabaseAdmin
      .from("widgets")
      .select("id, agent_id, company_id, config, is_active, name")
      .eq("access_key", accessKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !widget) {
      res.status(404).json({ success: false, error: "Widget not found or inactive" });
      return;
    }

    // Attach widget info to request for downstream use
    (req as any).widget = widget;

    next();
  } catch (err) {
    console.error("Access key auth error:", err);
    res.status(500).json({ success: false, error: "Authentication error" });
  }
}
