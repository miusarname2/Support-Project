export interface WidgetConfig {
  widget_id: string;
  widget_name: string;
  agent_name: string;
  welcome_message: string;
  config: {
    primaryColor?: string;
    position?: string;
    bubbleSize?: number;
  };
}

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  status: string;
}
