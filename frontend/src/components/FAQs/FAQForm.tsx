import React, { useState, useEffect } from "react";
import { Button } from "../common/Button";
import type { FAQ } from "../../hooks/useFAQs";

interface FAQFormProps {
  faq?: FAQ;
  onSubmit: (data: { question: string; answer: string; category?: string }) => Promise<void>;
  loading?: boolean;
}

export function FAQForm({ faq, onSubmit, loading }: FAQFormProps) {
  const [question, setQuestion] = useState(faq?.question || "");
  const [answer, setAnswer] = useState(faq?.answer || "");
  const [category, setCategory] = useState(faq?.category || "");

  useEffect(() => {
    if (faq) {
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setCategory(faq.category || "");
    }
  }, [faq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ question, answer, category: category || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Question *</label>
        <textarea
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="What is your return policy?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Answer *</label>
        <textarea
          required
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="You can return items within 30 days..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g. Shipping, Returns, Pricing"
        />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        {faq ? "Update FAQ" : "Add FAQ"}
      </Button>
    </form>
  );
}
