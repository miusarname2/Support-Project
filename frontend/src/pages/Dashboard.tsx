import { useAuth } from "../context/AuthContext";
import { Header } from "../components/Layout/Header";
import { Link } from "react-router-dom";

const statCards = [
  { key: "agents", label: "AI Agents", icon: "🤖", color: "bg-primary-50 text-primary-700" },
  { key: "faqs", label: "FAQs", icon: "❓", color: "bg-green-50 text-green-700" },
  { key: "conversations", label: "Conversations", icon: "💬", color: "bg-blue-50 text-blue-700" },
  { key: "widgets", label: "Widgets", icon: "🔌", color: "bg-orange-50 text-orange-700" },
] as const;

export function Dashboard() {
  const { stats, company } = useAuth();

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome to {company?.name || "Own Lovi"}
          </h2>
          <p className="text-sm text-gray-500">
            Manage your AI support agents, knowledge base, and chat widgets.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.key} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {stats?.[card.key] ?? 0}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/agents"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Agent
            </Link>
            <Link
              to="/agents"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View All Agents
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
