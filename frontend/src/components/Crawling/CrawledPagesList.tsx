interface CrawledPage {
  id: string;
  url: string;
  title: string | null;
  content: string | null;
  status: string;
  created_at: string;
}

interface CrawledPagesListProps {
  pages: CrawledPage[];
}

export function CrawledPagesList({ pages }: CrawledPagesListProps) {
  if (pages.length === 0) {
    return <p className="text-sm text-gray-400">No pages crawled yet.</p>;
  }

  return (
    <div className="space-y-2">
      {pages.map((page) => (
        <div key={page.id} className="rounded border bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-600 hover:underline truncate max-w-md"
            >
              {page.title || page.url}
            </a>
            <span className={`text-xs ${page.status === "scraped" ? "text-green-600" : "text-red-500"}`}>
              {page.status}
            </span>
          </div>
          {page.content && (
            <p className="mt-1 text-xs text-gray-400 line-clamp-2">
              {page.content.substring(0, 200)}...
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
