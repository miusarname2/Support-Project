import { useState } from "react";
import { Button } from "../common/Button";
import toast from "react-hot-toast";

interface WidgetCodeSnippetProps {
  accessKey: string;
  apiUrl?: string;
}

export function WidgetCodeSnippet({ accessKey, apiUrl }: WidgetCodeSnippetProps) {
  const widgetUrl = apiUrl || "https://your-domain.com";
  const snippet = `<script src="${widgetUrl}/widget.js" data-access-key="${accessKey}" data-api-url="${widgetUrl}"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Copied to clipboard");
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = snippet;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Embed Code</label>
      <div className="relative">
        <pre className="rounded-lg bg-gray-900 p-4 text-sm text-green-400 overflow-x-auto">
          <code>{snippet}</code>
        </pre>
        <Button
          variant="secondary"
          size="sm"
          className="absolute right-2 top-2"
          onClick={handleCopy}
        >
          Copy
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Paste this code before the closing &lt;/body&gt; tag on your website.
      </p>
    </div>
  );
}
