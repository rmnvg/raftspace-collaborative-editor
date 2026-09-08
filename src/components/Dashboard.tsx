"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Upload } from "lucide-react";
import { Header } from "@/components/Header";
import { UserSwitcher } from "@/components/UserSwitcher";
import { DocumentSection, type AsyncStatus } from "@/components/DocumentSection";
import type { AppUser } from "@/services/users";
import type { DocumentSummary } from "@/types/document";

interface DocumentsState {
  owned: DocumentSummary[];
  shared: DocumentSummary[];
}

const EMPTY_DOCUMENTS: DocumentsState = { owned: [], shared: [] };

export function Dashboard() {
  const router = useRouter();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [sessionStatus, setSessionStatus] = useState<AsyncStatus>("loading");

  const [documents, setDocuments] = useState<DocumentsState>(EMPTY_DOCUMENTS);
  const [documentsStatus, setDocumentsStatus] = useState<AsyncStatus>("loading");

  const [isSwitchingUser, setIsSwitchingUser] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setSessionStatus("loading");
    try {
      const response = await fetch("/api/session");
      if (!response.ok) throw new Error("Failed to load session");
      const data = (await response.json()) as { currentUser: AppUser; users: AppUser[] };
      setCurrentUser(data.currentUser);
      setUsers(data.users);
      setSessionStatus("ready");
    } catch {
      setSessionStatus("error");
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    setDocumentsStatus("loading");
    try {
      const response = await fetch("/api/documents");
      if (!response.ok) throw new Error("Failed to load documents");
      const data = (await response.json()) as DocumentsState;
      setDocuments(data);
      setDocumentsStatus("ready");
    } catch {
      setDocumentsStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (sessionStatus === "ready") {
      void loadDocuments();
    }
  }, [sessionStatus, currentUser?.id, loadDocuments]);

  async function handleSwitchUser(userId: string) {
    if (userId === currentUser?.id) return;
    setActionError(null);
    setIsSwitchingUser(true);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error("Failed to switch user");
      await loadSession();
    } catch {
      setActionError("Couldn't switch users. Please try again.");
    } finally {
      setIsSwitchingUser(false);
    }
  }

  async function handleCreateDocument() {
    setActionError(null);
    setIsCreating(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled document" }),
      });
      if (!response.ok) throw new Error("Failed to create document");
      const data = (await response.json()) as { document: { id: string } };
      router.push(`/documents/${data.document.id}`);
    } catch {
      setActionError("Couldn't create the document. Please try again.");
      setIsCreating(false);
    }
  }

  const isBusy = sessionStatus !== "ready" || isSwitchingUser;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header>
        <UserSwitcher
          users={users}
          currentUser={currentUser}
          onSwitch={handleSwitchUser}
          disabled={isBusy}
        />
      </Header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Your documents
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create, edit, and share rich-text documents with your team.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateDocument}
              disabled={isBusy || isCreating}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {isCreating ? "Creating…" : "New document"}
            </button>
            <button
              type="button"
              disabled
              title="Coming in the next step"
              aria-label="Import file — coming in the next step"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-500 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import file
            </button>
          </div>
        </div>

        {sessionStatus === "error" && (
          <div className="mb-6 flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Couldn&apos;t load the demo session. Check your Supabase configuration.</span>
            </div>
            <button
              type="button"
              onClick={() => void loadSession()}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              Retry
            </button>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        {sessionStatus !== "error" && (
          <div className="grid gap-8 md:grid-cols-2">
            <DocumentSection
              id="owned-heading"
              title="Owned by me"
              status={documentsStatus}
              documents={documents.owned}
              emptyMessage="No documents yet — create one to get started."
              onRetry={() => void loadDocuments()}
            />
            <DocumentSection
              id="shared-heading"
              title="Shared with me"
              status={documentsStatus}
              documents={documents.shared}
              emptyMessage="Nothing has been shared with you yet."
              onRetry={() => void loadDocuments()}
            />
          </div>
        )}
      </main>
    </div>
  );
}
