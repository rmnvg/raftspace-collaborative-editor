import Link from "next/link";
import { formatRelativeTime, getInitials } from "@/lib/format";
import type { DocumentSummary } from "@/types/document";

export function DocumentCard({ document }: { document: DocumentSummary }) {
  const isOwner = document.relationship === "owner";

  return (
    <Link
      href={`/documents/${document.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-medium text-slate-900 group-hover:text-indigo-700">
          {document.title}
        </h3>
        <span
          className={
            isOwner
              ? "shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
              : "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
          }
        >
          {isOwner ? "Owner" : "Shared"}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: document.owner.avatarColor }}
            aria-hidden="true"
          >
            {getInitials(document.owner.name)}
          </span>
          <span>{document.owner.name}</span>
        </div>
        <span>Updated {formatRelativeTime(document.updatedAt)}</span>
      </div>
    </Link>
  );
}
