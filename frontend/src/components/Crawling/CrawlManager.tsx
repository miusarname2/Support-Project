import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { Button } from "../common/Button";
import { Loading } from "../common/Loading";
import { CrawledPagesList } from "./CrawledPagesList";
import toast from "react-hot-toast";

interface CrawlManagerProps {
  agentId: string;
}

interface CrawlSource {
  id: string;
  url: string;
  status: string;
  pages_found: number;
  error_message: string | null;
  created_at: string;
}

export function CrawlManager({ agentId }: CrawlManagerProps) {
  const [newUrl, setNewUrl] = useState("");
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: sourcesData, isLoading } = useQuery({
    queryKey: ["crawl-sources", agentId],
    queryFn: () => api.get<{ success: boolean; data: CrawlSource[] }>(`/agents/${agentId}/crawl`),
    refetchInterval: (query) => {
      const sources = query.state.data?.data;
      if (sources?.some((s: CrawlSource) => s.status === "crawling" || s.status === "pending")) return 5000;
      return false;
    },
  });

  const { data: pagesData } = useQuery({
    queryKey: ["crawled-pages", agentId, expandedSource],
    queryFn: () => api.get<{ success: boolean; data: any[] }>(`/agents/${agentId}/crawl/${expandedSource}/pages`),
    enabled: !!expandedSource,
  });

  const startCrawl = useMutation({
    mutationFn: (url: string) =>
      api.post(`/agents/${agentId}/crawl`, { url, max_pages: 10 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawl-sources", agentId] });
      setNewUrl("");
      toast.success("Crawling started");
    },
    onError: (err: any) => toast.error(err.message || "Failed to start crawling"),
  });

  const deleteCrawl = useMutation({
    mutationFn: (sourceId: string) => api.del(`/agents/${agentId}/crawl/${sourceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawl-sources", agentId] });
      toast.success("Source deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  });

  const generateFaqs = useMutation({
    mutationFn: (sourceId: string) =>
      api.post(`/agents/${agentId}/crawl/${sourceId}/generate-faqs`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["faqs", agentId] });
      toast.success(`Generated ${data?.data?.generated || 0} FAQs`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to generate FAQs"),
  });

  const handleStartCrawl = () => {
    if (!newUrl.trim()) return;
    try {
      new URL(newUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    startCrawl.mutate(newUrl.trim());
  };

  const sources = sourcesData?.data || [];

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    crawling: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add Website URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            onKeyDown={(e) => e.key === "Enter" && handleStartCrawl()}
          />
          <Button onClick={handleStartCrawl} loading={startCrawl.isPending}>
            Start Crawling
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          We'll crawl up to 10 pages from this URL and extract content for your knowledge base.
        </p>
      </div>

      {isLoading ? (
        <Loading />
      ) : sources.length > 0 ? (
        <div className="space-y-3">
          {sources.map((source: CrawlSource) => (
            <div key={source.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{source.url}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[source.status] || "bg-gray-100"}`}>
                      {source.status === "crawling" && "⏳ "}
                      {source.status}
                    </span>
                    {source.pages_found > 0 && (
                      <span className="text-xs text-gray-400">{source.pages_found} pages</span>
                    )}
                    {source.error_message && (
                      <span className="text-xs text-red-500">{source.error_message}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  {source.status === "completed" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
                      >
                        {expandedSource === source.id ? "Hide" : "Pages"}
                      </Button>
                      <Button
                        size="sm"
                        loading={generateFaqs.isPending}
                        onClick={() => generateFaqs.mutate(source.id)}
                      >
                        Generate FAQs
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => deleteCrawl.mutate(source.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {expandedSource === source.id && pagesData?.data && (
                <div className="mt-3 border-t pt-3">
                  <CrawledPagesList pages={pagesData.data} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white py-12 text-center text-gray-500">
          No crawl sources yet. Add a URL above to start building your knowledge base.
        </div>
      )}
    </div>
  );
}
