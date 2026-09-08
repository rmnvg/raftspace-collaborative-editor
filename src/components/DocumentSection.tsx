import { AlertCircle, FileX2 } from "lucide-react";
import { DocumentCard } from "@/components/DocumentCard";
import { DocumentListSkeleton } from "@/components/DocumentListSkeleton";
import type { DocumentSummary } from "@/types/document";

export type AsyncStatus = "loading" | "error" | "ready";

interface DocumentSectionProps {
  id: string;
  title: string;
  status: AsyncStatus;
  documents: DocumentSummary[];
  emptyMessage: string;
  onRetry: () => void;
}

export function DocumentSection({
  id,
  title,
  status,
  documents,
  emptyMessage,
  onRetry,
}: DocumentSectionProps) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
        {title}
      </h2>

      {status === "loading" && <DocumentListSkeleton />}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Couldn&apos;t load documents.</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          >
            Retry
          </button>
        </div>
      )}

      {status === "ready" && documents.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          <FileX2 className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <span>{emptyMessage}</span>
        </div>
      )}

      {status === "ready" && documents.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          {documents.map((document) => (
            <li key={document.id}>
              <DocumentCard document={document} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
