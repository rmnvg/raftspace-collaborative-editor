"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, FileX2, Share2 } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Header } from "@/components/Header";
import { ShareDialog } from "@/components/ShareDialog";
import { formatRelativeTime, getInitials } from "@/lib/format";
import type { DocumentDetail, TiptapDocument } from "@/types/document";

type PageStatus = "loading" | "not-found" | "error" | "ready";
type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const AUTOSAVE_DELAY_MS = 800;

export function DocumentEditorClient({ documentId }: { documentId: string }) {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const titleRef = useRef("");
  const contentRef = useRef<TiptapDocument | null>(null);
  const dirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setPageStatus("loading");
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (response.status === 404 || response.status === 403) {
        setPageStatus("not-found");
        return;
      }
      if (!response.ok) throw new Error("Failed to load document");

      const data = (await response.json()) as { document: DocumentDetail };
      setDocument(data.document);
      setTitle(data.document.title);
      titleRef.current = data.document.title;
      contentRef.current = data.document.content;
      dirtyRef.current = false;
      setSaveStatus("saved");
      setPageStatus("ready");
    } catch {
      setPageStatus("error");
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const performSave = useCallback(async () => {
    if (isSavingRef.current || !dirtyRef.current) return;
    isSavingRef.current = true;
    dirtyRef.current = false;
    setSaveStatus("saving");

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleRef.current, content: contentRef.current }),
      });
      if (!response.ok) throw new Error("Save failed");

      isSavingRef.current = false;
      if (dirtyRef.current) {
        setSaveStatus("unsaved");
        scheduleSave();
      } else {
        setSaveStatus("saved");
      }
    } catch {
      isSavingRef.current = false;
      dirtyRef.current = true;
      setSaveStatus("error");
    }
    // scheduleSave is stable (defined below with useCallback and no changing deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void performSave();
    }, AUTOSAVE_DELAY_MS);
    // performSave is stable (defined above with useCallback and no changing deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function markDirty() {
    dirtyRef.current = true;
    if (!isSavingRef.current) {
      setSaveStatus("unsaved");
    }
    scheduleSave();
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setTitle(value);
    titleRef.current = value;
    markDirty();
  }

  function handleContentChange(content: TiptapDocument) {
    contentRef.current = content;
    markDirty();
  }

  function handleRetry() {
    dirtyRef.current = true;
    void performSave();
  }

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (saveStatus !== "saved") {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  if (pageStatus === "loading") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-[28rem] animate-pulse rounded-lg border border-slate-200 bg-white" />
        </main>
      </div>
    );
  }

  if (pageStatus === "not-found") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
          <FileX2 className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-slate-900">Document not found</h1>
          <p className="max-w-sm text-sm text-slate-500">
            This document doesn&apos;t exist, or you don&apos;t have access to it.
          </p>
          <BackLink />
        </main>
      </div>
    );
  }

  if (pageStatus === "error") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
          <AlertCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
          <p className="max-w-sm text-sm text-slate-500">
            We couldn&apos;t load this document. Please try again.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
              Retry
            </button>
            <BackLink />
          </div>
        </main>
      </div>
    );
  }

  if (!document) return null;

  const isOwner = document.relationship === "owner";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <BackLink />
          <SaveStatusIndicator status={saveStatus} onRetry={handleRetry} />
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="sr-only" htmlFor="document-title">
                Document title
              </label>
              <input
                id="document-title"
                value={title}
                onChange={handleTitleChange}
                disabled={!document.canEdit}
                placeholder="Untitled document"
                className="min-w-0 flex-1 border-none bg-transparent text-xl font-semibold text-slate-900 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-slate-500"
              />
              <div className="flex items-center gap-2">
                <span
                  className={
                    isOwner
                      ? "shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                      : "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                  }
                >
                  {isOwner ? "Owner" : "Editor"}
                </span>
                {document.canManageSharing && (
                  <button
                    type="button"
                    onClick={() => setIsShareDialogOpen(true)}
                    title="Share this document"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Share
                  </button>
                )}
              </div>
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
          </div>

          <RichTextEditor
            initialContent={document.content}
            editable={document.canEdit}
            onChange={handleContentChange}
          />
        </div>
      </main>

      {document.canManageSharing && (
        <ShareDialog
          documentId={documentId}
          ownerId={document.owner.id}
          open={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to documents
    </Link>
  );
}

function SaveStatusIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return <span className="text-xs font-medium text-slate-500">Saving…</span>;
  }
  if (status === "unsaved") {
    return <span className="text-xs font-medium text-slate-500">Unsaved changes</span>;
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-2 text-xs font-medium text-red-600">
        Save failed
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-red-300 bg-white px-2 py-0.5 text-red-700 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
        >
          Retry
        </button>
      </span>
    );
  }
  return <span className="text-xs font-medium text-slate-400">Saved</span>;
}
