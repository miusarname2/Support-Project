import { useState } from "react";
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from "../../hooks/useAgents";
import { AgentCard } from "./AgentCard";
import { AgentForm } from "./AgentForm";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Loading } from "../common/Loading";
import type { CreateAgentData } from "../../services/agentService";
import toast from "react-hot-toast";

export function AgentList() {
  const { data: agents, isLoading, error } = useAgents();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = async (data: CreateAgentData) => {
    try {
      await createAgent.mutateAsync(data);
      setShowCreateModal(false);
      toast.success("Agent created successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to create agent");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent? This will also delete all its FAQs, crawl sources, and conversations.")) return;
    try {
      await deleteAgent.mutateAsync(id);
      toast.success("Agent deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete agent");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateAgent.mutateAsync({ id, data: { is_active: isActive } });
      toast.success(isActive ? "Agent activated" : "Agent deactivated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update agent");
    }
  };

  if (isLoading) return <Loading />;
  if (error) return <div className="py-12 text-center text-red-500">Failed to load agents</div>;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Agents</h2>
          <p className="text-sm text-gray-500">{agents?.length || 0} agent{(agents?.length || 0) !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Agent
        </Button>
      </div>

      {agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-white py-16 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900">No agents yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first AI support agent to get started.</p>
          <Button className="mt-4" onClick={() => setShowCreateModal(true)}>Create Agent</Button>
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Agent">
        <AgentForm onSubmit={handleCreate} loading={createAgent.isPending} />
      </Modal>
    </>
  );
}
