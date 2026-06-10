import type { WidgetConfig, Message } from "./types";

const VISITOR_ID_KEY = "own_lovi_visitor_id";

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = "v_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export async function fetchWidgetConfig(apiUrl: string, accessKey: string): Promise<WidgetConfig> {
  const response = await fetch(`${apiUrl}/api/widget/${accessKey}/config`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Failed to load widget");
  return data.data;
}

export async function sendMessage(
  apiUrl: string,
  accessKey: string,
  message: string,
  conversationId: string | null,
  visitorId: string
): Promise<{ message: string; conversation_id: string }> {
  const response = await fetch(`${apiUrl}/api/widget/${accessKey}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      visitor_id: visitorId,
    }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Failed to send message");
  return data.data;
}

export async function getMessages(
  apiUrl: string,
  accessKey: string,
  conversationId: string
): Promise<Message[]> {
  const response = await fetch(
    `${apiUrl}/api/widget/${accessKey}/chat/${conversationId}/messages`
  );
  const data = await response.json();
  if (!data.success) return [];
  return data.data;
}

export async function startNewConversation(
  apiUrl: string,
  accessKey: string,
  visitorId: string
): Promise<{ conversation_id: string; welcome_message: string }> {
  const response = await fetch(`${apiUrl}/api/widget/${accessKey}/chat/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitor_id: visitorId }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Failed to start conversation");
  return data.data;
}
