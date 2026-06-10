import { useState, useEffect, useRef } from "preact/hooks";
import type { WidgetConfig, Message } from "./types";
import {
  fetchWidgetConfig,
  sendMessage,
  startNewConversation,
  getVisitorId,
} from "./api";

interface WidgetProps {
  accessKey: string;
  apiUrl: string;
}

export function Widget({ accessKey, apiUrl }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorId = getVisitorId();

  const primaryColor = config?.config?.primaryColor || "#6366f1";

  // Load widget config
  useEffect(() => {
    fetchWidgetConfig(apiUrl, accessKey)
      .then(setConfig)
      .catch((err) => setError(err.message));
  }, [apiUrl, accessKey]);

  // Start conversation when widget opens
  useEffect(() => {
    if (isOpen && config && !conversationId) {
      startNewConversation(apiUrl, accessKey, visitorId)
        .then((data) => {
          setConversationId(data.conversation_id);
          setMessages([{ role: "assistant", content: data.welcome_message }]);
        })
        .catch((err) => setError(err.message));
    }
  }, [isOpen, config, conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const result = await sendMessage(apiUrl, accessKey, text, conversationId, visitorId);
      setConversationId(result.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: result.message }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (error && !config) return null;

  return (
    <>
      <style>{`
        .olw-container * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .olw-bubble { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99998; border: none; }
        .olw-bubble:hover { transform: scale(1.05); }
        .olw-window { position: fixed; bottom: 90px; right: 20px; width: 380px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 120px); background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); z-index: 99999; display: flex; flex-direction: column; overflow: hidden; }
        .olw-header { padding: 16px; display: flex; align-items: center; gap: 10px; color: white; }
        .olw-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
        .olw-header-info h3 { font-size: 14px; font-weight: 600; }
        .olw-header-info p { font-size: 11px; opacity: 0.8; }
        .olw-close { margin-left: auto; background: none; border: none; color: white; cursor: pointer; padding: 4px; border-radius: 6px; }
        .olw-close:hover { background: rgba(255,255,255,0.2); }
        .olw-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .olw-msg { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; word-wrap: break-word; }
        .olw-msg-user { align-self: flex-end; background: #f3f4f6; color: #374151; border-bottom-right-radius: 4px; }
        .olw-msg-assistant { align-self: flex-start; color: white; border-bottom-left-radius: 4px; }
        .olw-typing { align-self: flex-start; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; color: white; font-size: 13px; }
        .olw-typing span { animation: olw-blink 1.4s infinite; }
        .olw-typing span:nth-child(2) { animation-delay: 0.2s; }
        .olw-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes olw-blink { 0%, 20% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
        .olw-input-area { padding: 12px 16px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; align-items: center; }
        .olw-input { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; font-size: 13px; outline: none; }
        .olw-input:focus { border-color: #6366f1; }
        .olw-send { width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; }
        .olw-send:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 420px) { .olw-window { width: calc(100vw - 16px); right: 8px; bottom: 80px; height: calc(100vh - 100px); } .olw-bubble { bottom: 12px; right: 12px; } }
      `}</style>

      <div class="olw-container">
        {/* Chat Window */}
        {isOpen && config && (
          <div class="olw-window">
            <div class="olw-header" style={{ background: primaryColor }}>
              <div class="olw-avatar">AI</div>
              <div class="olw-header-info">
                <h3>{config.agent_name}</h3>
                <p>Online</p>
              </div>
              <button class="olw-close" onClick={() => setIsOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="olw-messages">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  class={`olw-msg ${msg.role === "user" ? "olw-msg-user" : "olw-msg-assistant"}`}
                  style={msg.role === "assistant" ? { background: primaryColor } : undefined}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div class="olw-typing" style={{ background: primaryColor }}>
                  <span>.</span><span>.</span><span>.</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div class="olw-input-area">
              <input
                ref={inputRef}
                class="olw-input"
                type="text"
                placeholder="Type a message..."
                value={input}
                onInput={(e: any) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                class="olw-send"
                style={{ background: primaryColor }}
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Bubble */}
        <button
          class="olw-bubble"
          style={{ background: primaryColor }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
