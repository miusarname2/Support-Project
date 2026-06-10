interface WidgetPreviewProps {
  primaryColor?: string;
  agentName?: string;
  welcomeMessage?: string;
}

export function WidgetPreview({
  primaryColor = "#6366f1",
  agentName = "Support Agent",
  welcomeMessage = "Hello! How can I help you today?",
}: WidgetPreviewProps) {
  return (
    <div className="relative h-[400px] w-[320px] rounded-xl border bg-gray-100 p-4">
      {/* Chat window preview */}
      <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            AI
          </div>
          <div>
            <p className="text-sm font-semibold">{agentName}</p>
            <p className="text-xs opacity-80">Online</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-auto p-3">
          <div className="flex justify-start">
            <div
              className="max-w-[80%] rounded-lg rounded-tl-none px-3 py-2 text-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {welcomeMessage}
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg rounded-tr-none bg-gray-100 px-3 py-2 text-xs text-gray-700">
              Hi, I have a question about...
            </div>
          </div>
          <div className="flex justify-start">
            <div
              className="max-w-[80%] rounded-lg rounded-tl-none px-3 py-2 text-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Of course! I'd be happy to help.
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t p-2">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-400">Type a message...</span>
          </div>
        </div>
      </div>

      {/* Bubble */}
      <div
        className="absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
        style={{ backgroundColor: primaryColor }}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
    </div>
  );
}
