import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { accessKeyAuth } from "../middleware/auth.js";
import { handleChatMessage } from "../services/chatService.js";

export const chatRouter = Router();

// GET /api/widget/:accessKey/config - Get widget config (public)
chatRouter.get("/:accessKey/config", accessKeyAuth, async (req: Request, res: Response) => {
  try {
    const widget = (req as any).widget;

    // Get agent info for welcome message and name
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("name, welcome_message, is_active")
      .eq("id", widget.agent_id)
      .maybeSingle();

    if (!agent || !agent.is_active) {
      res.status(404).json({ success: false, error: "Agent not found or inactive" });
      return;
    }

    res.json({
      success: true,
      data: {
        widget_id: widget.id,
        widget_name: widget.name,
        agent_name: agent.name,
        welcome_message: agent.welcome_message || "Hello! How can I help you today?",
        config: widget.config,
      },
    });
  } catch (err) {
    console.error("Get widget config error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch config" });
  }
});

// POST /api/widget/:accessKey/chat - Send message and get AI response (public)
chatRouter.post("/:accessKey/chat", accessKeyAuth, async (req: Request, res: Response) => {
  try {
    const widget = (req as any).widget;
    const { message, conversation_id, visitor_id } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ success: false, error: "Message is required" });
      return;
    }

    if (!visitor_id || typeof visitor_id !== "string") {
      res.status(400).json({ success: false, error: "Visitor ID is required" });
      return;
    }

    const result = await handleChatMessage(
      widget,
      visitor_id,
      message.trim(),
      conversation_id
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({ success: false, error: err.message || "Chat failed" });
  }
});

// GET /api/widget/:accessKey/chat/:conversationId/messages - Get message history (public)
chatRouter.get(
  "/:accessKey/chat/:conversationId/messages",
  accessKeyAuth,
  async (req: Request, res: Response) => {
    try {
      const widget = (req as any).widget;

      // Verify conversation belongs to this widget
      const { data: conv } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("id", req.params.conversationId)
        .eq("widget_id", widget.id)
        .maybeSingle();

      if (!conv) {
        res.status(404).json({ success: false, error: "Conversation not found" });
        return;
      }

      const { data: messages, error } = await supabaseAdmin
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", req.params.conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        res.status(500).json({ success: false, error: "Failed to fetch messages" });
        return;
      }

      res.json({ success: true, data: messages });
    } catch (err) {
      console.error("Get messages error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch messages" });
    }
  }
);

// POST /api/widget/:accessKey/chat/new - Start new conversation (public)
chatRouter.post("/:accessKey/chat/new", accessKeyAuth, async (req: Request, res: Response) => {
  try {
    const widget = (req as any).widget;
    const { visitor_id } = req.body;

    if (!visitor_id || typeof visitor_id !== "string") {
      res.status(400).json({ success: false, error: "Visitor ID is required" });
      return;
    }

    const { data: conversation, error } = await supabaseAdmin
      .from("conversations")
      .insert({
        widget_id: widget.id,
        agent_id: widget.agent_id,
        visitor_id,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: "Failed to create conversation" });
      return;
    }

    // Get welcome message
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("welcome_message")
      .eq("id", widget.agent_id)
      .maybeSingle();

    const welcomeMsg = agent?.welcome_message || "Hello! How can I help you today?";

    // Save welcome message
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: welcomeMsg,
    });

    res.status(201).json({
      success: true,
      data: {
        conversation_id: conversation.id,
        welcome_message: welcomeMsg,
      },
    });
  } catch (err) {
    console.error("New conversation error:", err);
    res.status(500).json({ success: false, error: "Failed to start conversation" });
  }
});
