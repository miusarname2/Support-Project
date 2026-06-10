import { groqClient } from "../config/groq.js";
import { supabaseAdmin } from "../config/supabase.js";
import type { Agent, FAQ, Message } from "../types/index.js";

/**
 * Find FAQs relevant to the user's message using keyword matching.
 * Uses PostgreSQL ILIKE for simple text search.
 */
export async function findRelevantFaqs(
  agentId: string,
  userMessage: string
): Promise<FAQ[]> {
  // Extract meaningful keywords (3+ chars, skip common words)
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "shall", "to", "of",
    "in", "for", "on", "with", "at", "by", "from", "as", "into",
    "que", "de", "la", "el", "en", "un", "una", "es", "los", "las",
    "por", "con", "para", "del", "al", "se", "no", "si", "su",
    "como", "mas", "pero", "sin", "sobre", "este", "esta",
  ]);

  const keywords = userMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (keywords.length === 0) {
    // Fallback: get most recent active FAQs
    const { data } = await supabaseAdmin
      .from("faqs")
      .select("*")
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .limit(5);
    return (data as FAQ[]) || [];
  }

  // Search with ILIKE for each keyword, combining with OR
  const searchPattern = keywords.slice(0, 5).map((k) => `%${k}%`);
  const orConditions = searchPattern
    .flatMap((p) => [`question.ilike.${p}`, `answer.ilike.${p}`])
    .join(",");

  const { data: faqs, error } = await supabaseAdmin
    .from("faqs")
    .select("*")
    .eq("agent_id", agentId)
    .eq("is_active", true)
    .or(orConditions)
    .limit(5);

  if (error) {
    console.error("FAQ search error:", error);
    return [];
  }

  return (faqs as FAQ[]) || [];
}

/**
 * Build the messages array for the Groq API call.
 */
export function buildChatContext(
  agent: Agent,
  faqs: FAQ[],
  recentMessages: Message[]
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  // System prompt with FAQ context
  let systemContent = agent.system_prompt ||
    "You are a helpful customer support assistant. Answer questions clearly and concisely.";

  if (faqs.length > 0) {
    systemContent += "\n\n## Knowledge Base (FAQ)\nUse the following information to answer questions:\n\n";
    for (const faq of faqs) {
      systemContent += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
    }
    systemContent +=
      "If the user's question is covered by the FAQ above, use that information. " +
      "If not, answer to the best of your ability or offer to connect them with a human agent.";
  }

  messages.push({ role: "system", content: systemContent });

  // Add recent conversation history (last 20 messages)
  for (const msg of recentMessages) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  return messages;
}

/**
 * Call Groq API and get the AI response.
 */
export async function getAIResponse(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string = "llama-3.3-70b-versatile",
  temperature: number = 0.7
): Promise<string> {
  try {
    const completion = await groqClient.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: 1024,
      top_p: 1,
    });

    return completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("Groq API error:", error);

    if (error?.status === 429) {
      return "I'm currently experiencing high demand. Please try again in a moment.";
    }

    return "I'm sorry, I encountered an error. Please try again later.";
  }
}

/**
 * Full chat message orchestration.
 */
export async function handleChatMessage(
  widgetInfo: {
    id: string;
    agent_id: string;
    company_id: string;
    config: Record<string, unknown>;
  },
  visitorId: string,
  userMessage: string,
  conversationId?: string
): Promise<{
  message: string;
  conversation_id: string;
}> {
  // 1. Get agent config
  const { data: agent, error: agentError } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("id", widgetInfo.agent_id)
    .eq("is_active", true)
    .maybeSingle();

  if (agentError || !agent) {
    throw new Error("Agent not found or inactive");
  }

  // 2. Find or create conversation
  let convId = conversationId;

  if (convId) {
    // Verify conversation exists and belongs to this widget/visitor
    const { data: existing } = await supabaseAdmin
      .from("conversations")
      .select("id, status")
      .eq("id", convId)
      .eq("widget_id", widgetInfo.id)
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (!existing || existing.status === "closed") {
      convId = undefined; // Create new if not found or closed
    }
  }

  if (!convId) {
    const { data: newConv, error: convError } = await supabaseAdmin
      .from("conversations")
      .insert({
        widget_id: widgetInfo.id,
        agent_id: widgetInfo.agent_id,
        visitor_id: visitorId,
        status: "active",
      })
      .select("id")
      .single();

    if (convError || !newConv) {
      throw new Error("Failed to create conversation");
    }
    convId = newConv.id;
  }

  // 3. Save user message
  await supabaseAdmin.from("messages").insert({
    conversation_id: convId,
    role: "user",
    content: userMessage,
  });

  // 4. Find relevant FAQs
  const relevantFaqs = await findRelevantFaqs(widgetInfo.agent_id, userMessage);

  // 5. Get recent messages for context
  const { data: recentMessages } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(20);

  // 6. Build context and get AI response
  const chatMessages = buildChatContext(
    agent as Agent,
    relevantFaqs,
    (recentMessages as Message[]) || []
  );

  const aiResponse = await getAIResponse(
    chatMessages,
    agent.model,
    parseFloat(agent.temperature)
  );

  // 7. Save assistant message
  await supabaseAdmin.from("messages").insert({
    conversation_id: convId,
    role: "assistant",
    content: aiResponse,
  });

  // 8. Update conversation updated_at
  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convId);

  return {
    message: aiResponse,
    conversation_id: convId,
  };
}
