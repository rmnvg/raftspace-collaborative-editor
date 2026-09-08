import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { getCurrentUserId } from "@/services/session";
import { getDocumentDetailForUser } from "@/services/documents";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { documentIdSchema } from "@/validation/documents";

interface DocumentPageProps {
  params: { id: string };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const idResult = documentIdSchema.safeParse(params.id);
  if (!idResult.success) {
    notFound();
  }

  const userId = await getCurrentUserId();
  const document = await getDocumentDetailForUser(idResult.data, userId);
  if (!document) {
    notFound();
  }

  const isOwner = document.relationship === "owner";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to documents
        </Link>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{document.title}</h1>
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

          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: document.owner.avatarColor }}
              aria-hidden="true"
            >
              {getInitials(document.owner.name)}
            </span>
            <span>{document.owner.name}</span>
            <span aria-hidden="true">·</span>
            <span>Updated {formatRelativeTime(document.updatedAt)}</span>
          </div>

          <div className="mt-6 flex min-h-[16rem] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Rich text editor coming in the next step.
          </div>
        </div>
      </main>
    </div>
  );
}
