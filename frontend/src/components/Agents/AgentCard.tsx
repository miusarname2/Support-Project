import { Link } from "react-router-dom";
import { Button } from "../common/Button";
import type { Agent } from "../../services/agentService";

interface AgentCardProps {
  agent: Agent & { faq_count?: number };
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function AgentCard({ agent, onDelete, onToggleActive }: AgentCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <Link to={`/agents/${agent.id}`} className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 hover:text-primary-600">
            {agent.name}
          </h3>
        </Link>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            agent.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {agent.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {agent.description && (
        <p className="mb-3 text-sm text-gray-500 line-clamp-2">{agent.description}</p>
      )}

      <div className="mb-4 flex items-center gap-4 text-xs text-gray-400">
        <span>Model: {agent.model.split("-").slice(0, 2).join(" ")}</span>
        <span>FAQs: {agent.faq_count ?? 0}</span>
      </div>

      <div className="flex items-center gap-2">
        <Link to={`/agents/${agent.id}`}>
          <Button variant="secondary" size="sm">Configure</Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(agent.id, !agent.is_active)}
        >
          {agent.is_active ? "Deactivate" : "Activate"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(agent.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
