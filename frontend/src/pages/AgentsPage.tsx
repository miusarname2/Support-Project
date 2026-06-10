import { Header } from "../components/Layout/Header";
import { AgentList } from "../components/Agents/AgentList";

export function AgentsPage() {
  return (
    <>
      <Header title="Agents" />
      <div className="p-6">
        <AgentList />
      </div>
    </>
  );
}
