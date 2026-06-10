import React, { useState, useEffect } from "react";
import { Button } from "../common/Button";
import type { Agent, CreateAgentData } from "../../services/agentService";

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: CreateAgentData) => Promise<void>;
  loading?: boolean;
}

const MODELS = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Recommended)" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
];

export function AgentForm({ agent, onSubmit, loading }: AgentFormProps) {
  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [systemPrompt, setSystemPrompt] = useState(
    agent?.system_prompt ||
    "You are a helpful customer support assistant. Answer questions clearly and concisely based on the provided knowledge base. If you don't know the answer, say so politely and offer to connect the user with a human agent."
  );
  const [welcomeMessage, setWelcomeMessage] = useState(agent?.welcome_message || "Hello! How can I help you today?");
  const [model, setModel] = useState(agent?.model || "llama-3.3-70b-versatile");
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || "");
      setSystemPrompt(agent.system_prompt || "");
      setWelcomeMessage(agent.welcome_message || "");
      setModel(agent.model);
      setTemperature(agent.temperature);
    }
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      description: description || undefined,
      system_prompt: systemPrompt || undefined,
      welcome_message: welcomeMessage || undefined,
      model,
      temperature,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g. Customer Support Bot"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Brief description of what this agent does"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Instructions for the AI agent..."
        />
        <p className="mt-1 text-xs text-gray-400">
          This prompt defines how the agent behaves. FAQs from the knowledge base will be added automatically.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Welcome Message</label>
        <input
          type="text"
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Hello! How can I help you today?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Temperature: {temperature.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="mt-3 block w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full">
        {agent ? "Update Agent" : "Create Agent"}
      </Button>
    </form>
  );
}
