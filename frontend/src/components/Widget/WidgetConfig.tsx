import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { Button } from "../common/Button";
import { Loading } from "../common/Loading";
import { WidgetCodeSnippet } from "./WidgetCodeSnippet";
import { WidgetPreview } from "./WidgetPreview";
import toast from "react-hot-toast";

interface WidgetConfigProps {
  agentId: string;
  agentName?: string;
  welcomeMessage?: string;
}

interface Widget {
  id: string;
  name: string;
  access_key: string;
  config: { primaryColor?: string; position?: string; bubbleSize?: number };
  is_active: boolean;
}

export function WidgetConfig({ agentId, agentName, welcomeMessage }: WidgetConfigProps) {
  const queryClient = useQueryClient();

  const { data: widgetsData, isLoading } = useQuery({
    queryKey: ["widgets", agentId],
    queryFn: () => api.get<{ success: boolean; data: Widget[] }>(`/agents/${agentId}/widgets`),
  });

  const createWidget = useMutation({
    mutationFn: () => api.post(`/agents/${agentId}/widgets`, { name: "Main Widget" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgets", agentId] });
      toast.success("Widget created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create widget"),
  });

  const regenerateKey = useMutation({
    mutationFn: (widgetId: string) =>
      api.post(`/agents/${agentId}/widgets/${widgetId}/regenerate-key`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgets", agentId] });
      toast.success("Access key regenerated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to regenerate key"),
  });

  const toggleWidget = useMutation({
    mutationFn: ({ widgetId, isActive }: { widgetId: string; isActive: boolean }) =>
      api.put(`/agents/${agentId}/widgets/${widgetId}`, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgets", agentId] });
    },
  });

  const updateColor = useMutation({
    mutationFn: ({ widgetId, color }: { widgetId: string; color: string }) =>
      api.put(`/agents/${agentId}/widgets/${widgetId}`, { config: { primaryColor: color, position: "bottom-right", bubbleSize: 60 } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgets", agentId] });
    },
  });

  const deleteWidget = useMutation({
    mutationFn: (widgetId: string) => api.del(`/agents/${agentId}/widgets/${widgetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgets", agentId] });
      toast.success("Widget deleted");
    },
  });

  const widgets = widgetsData?.data || [];

  if (isLoading) return <Loading />;

  return (
    <div>
      {widgets.length === 0 ? (
        <div className="rounded-lg border bg-white py-12 text-center">
          <div className="text-3xl mb-3">🔌</div>
          <h3 className="font-semibold text-gray-900">No widgets yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create a widget to embed a chat on your website.</p>
          <Button className="mt-4" onClick={() => createWidget.mutate()} loading={createWidget.isPending}>
            Create Widget
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {widgets.map((widget) => (
            <div key={widget.id} className="rounded-xl border bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{widget.name}</h3>
                  <span className={`text-xs ${widget.is_active ? "text-green-600" : "text-gray-400"}`}>
                    {widget.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleWidget.mutate({ widgetId: widget.id, isActive: !widget.is_active })}
                  >
                    {widget.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => deleteWidget.mutate(widget.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Access Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Key</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded border bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 truncate">
                        {widget.access_key}
                      </code>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => regenerateKey.mutate(widget.id)}
                        loading={regenerateKey.isPending}
                      >
                        Regenerate
                      </Button>
                    </div>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={widget.config.primaryColor || "#6366f1"}
                        onChange={(e) => updateColor.mutate({ widgetId: widget.id, color: e.target.value })}
                        className="h-10 w-10 rounded border cursor-pointer"
                      />
                      <span className="text-sm text-gray-500">{widget.config.primaryColor || "#6366f1"}</span>
                    </div>
                  </div>

                  {/* Embed code */}
                  <WidgetCodeSnippet accessKey={widget.access_key} />
                </div>

                <div className="flex justify-center">
                  <WidgetPreview
                    primaryColor={widget.config.primaryColor}
                    agentName={agentName}
                    welcomeMessage={welcomeMessage}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button variant="secondary" onClick={() => createWidget.mutate()} loading={createWidget.isPending}>
            Add Another Widget
          </Button>
        </div>
      )}
    </div>
  );
}
