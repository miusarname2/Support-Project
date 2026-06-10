import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAgent, useUpdateAgent, useDeleteAgent } from "../hooks/useAgents";
import { Header } from "../components/Layout/Header";
import { AgentForm } from "../components/Agents/AgentForm";
import { FAQList } from "../components/FAQs/FAQList";
import { CrawlManager } from "../components/Crawling/CrawlManager";
import { WidgetConfig } from "../components/Widget/WidgetConfig";
import { Loading } from "../components/common/Loading";
import { Button } from "../components/common/Button";
import type { CreateAgentData } from "../services/agentService";
import toast from "react-hot-toast";

type Tab = "general" | "faqs" | "knowledge" | "widget";

const tabs: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "faqs", label: "FAQs" },
  { key: "knowledge", label: "Knowledge" },
  { key: "widget", label: "Widget" },
];

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("general");

  const { data: agent, isLoading, error } = useAgent(id!);
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();

  const handleUpdate = async (data: CreateAgentData) => {
    try {
      await updateAgent.mutateAsync({ id: id!, data });
      toast.success("Agent updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update agent");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    try {
      await deleteAgent.mutateAsync(id!);
      toast.success("Agent deleted");
      navigate("/agents");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete agent");
    }
  };

  if (isLoading) return <Loading fullPage />;
  if (error || !agent) {
    return (
      <>
        <Header title="Agent Not Found" />
        <div className="p-6 text-center">
          <p className="text-gray-500">Agent not found or you don't have access.</p>
          <Button className="mt-4" onClick={() => navigate("/agents")}>Back to Agents</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={agent.name} />
      <div className="p-6">
        {/* Tabs */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border bg-white p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === tab.key
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Delete Agent
          </Button>
        </div>

        {/* Tab content */}
        <div className="rounded-xl border bg-white p-6">
          {activeTab === "general" && (
            <AgentForm agent={agent} onSubmit={handleUpdate} loading={updateAgent.isPending} />
          )}
          {activeTab === "faqs" && <FAQList agentId={id!} />}
          {activeTab === "knowledge" && <CrawlManager agentId={id!} />}
          {activeTab === "widget" && (
            <WidgetConfig
              agentId={id!}
              agentName={agent.name}
              welcomeMessage={agent.welcome_message || undefined}
            />
          )}
        </div>
      </div>
    </>
  );
}
