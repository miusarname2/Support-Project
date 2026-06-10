import { useState } from "react";
import { useFAQs, useCreateFAQ, useUpdateFAQ, useDeleteFAQ, type FAQ } from "../../hooks/useFAQs";
import { FAQForm } from "./FAQForm";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Loading } from "../common/Loading";
import toast from "react-hot-toast";

interface FAQListProps {
  agentId: string;
}

export function FAQList({ agentId }: FAQListProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  const { data, isLoading } = useFAQs(agentId, search || undefined, page);
  const createFAQ = useCreateFAQ();
  const updateFAQ = useUpdateFAQ();
  const deleteFAQ = useDeleteFAQ();

  const handleCreate = async (formData: { question: string; answer: string; category?: string }) => {
    try {
      await createFAQ.mutateAsync({ agentId, data: formData });
      setShowCreateModal(false);
      toast.success("FAQ created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create FAQ");
    }
  };

  const handleUpdate = async (formData: { question: string; answer: string; category?: string }) => {
    if (!editingFaq) return;
    try {
      await updateFAQ.mutateAsync({ agentId, faqId: editingFaq.id, data: formData });
      setEditingFaq(null);
      toast.success("FAQ updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update FAQ");
    }
  };

  const handleDelete = async (faqId: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await deleteFAQ.mutateAsync({ agentId, faqId });
      toast.success("FAQ deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete FAQ");
    }
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <Button onClick={() => setShowCreateModal(true)} size="sm">Add FAQ</Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : data && data.faqs.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.faqs.map((faq) => (
              <div key={faq.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{faq.question}</p>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{faq.answer}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {faq.category && (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {faq.category}
                        </span>
                      )}
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${faq.source === "crawled" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                        {faq.source}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${faq.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                        {faq.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingFaq(faq)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(faq.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border bg-white py-12 text-center text-gray-500">
          {search ? "No FAQs match your search" : "No FAQs yet. Add one or crawl a website to generate them automatically."}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add FAQ">
        <FAQForm onSubmit={handleCreate} loading={createFAQ.isPending} />
      </Modal>

      <Modal isOpen={!!editingFaq} onClose={() => setEditingFaq(null)} title="Edit FAQ">
        {editingFaq && <FAQForm faq={editingFaq} onSubmit={handleUpdate} loading={updateFAQ.isPending} />}
      </Modal>
    </>
  );
}
