"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { getInitials } from "@/lib/format";
import type { AppUser } from "@/services/users";
import type { DocumentCollaborator } from "@/types/sharing";

interface ShareDialogProps {
  documentId: string;
  ownerId: string;
  open: boolean;
  onClose: () => void;
}

type LoadStatus = "loading" | "error" | "ready";

export function ShareDialog({ documentId, ownerId, open, onClose }: ShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [collaborators, setCollaborators] = useState<DocumentCollaborator[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmingRemovalId, setConfirmingRemovalId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl.open) {
      dialogEl.close();
    }
  }, [open]);

  const load = useCallback(async () => {
    setStatus("loading");
    setActionError(null);
    try {
      const [sharesResponse, sessionResponse] = await Promise.all([
        fetch(`/api/documents/${documentId}/shares`),
        fetch("/api/session"),
      ]);
      if (!sharesResponse.ok || !sessionResponse.ok) {
        throw new Error("Failed to load sharing info");
      }
      const sharesData = (await sharesResponse.json()) as {
        collaborators: DocumentCollaborator[];
      };
      const sessionData = (await sessionResponse.json()) as { users: AppUser[] };
      setCollaborators(sharesData.collaborators);
      setAllUsers(sessionData.users);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [documentId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const availableUsers = useMemo(() => {
    const sharedIds = new Set(collaborators.map((collaborator) => collaborator.userId));
    return allUsers.filter((user) => user.id !== ownerId && !sharedIds.has(user.id));
  }, [allUsers, collaborators, ownerId]);

  useEffect(() => {
    if (availableUsers.length === 0) {
      setSelectedUserId("");
      return;
    }
    if (!availableUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(availableUsers[0]?.id ?? "");
    }
  }, [availableUsers, selectedUserId]);

  function handleClose() {
    setConfirmingRemovalId(null);
    setActionError(null);
    onClose();
  }

  async function handleGrant() {
    if (!selectedUserId) return;
    setIsGranting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Couldn't share the document");
      }
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Couldn't share the document");
    } finally {
      setIsGranting(false);
    }
  }

  async function handleRemove(targetUserId: string) {
    setRemovingUserId(targetUserId);
    setActionError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/shares/${targetUserId}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Couldn't remove access");
      }
      setConfirmingRemovalId(null);
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Couldn't remove access");
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleClose}
      onClose={handleClose}
      aria-labelledby="share-dialog-title"
      className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 id="share-dialog-title" className="text-base font-semibold text-slate-900">
          Share document
        </h2>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-4">
        {status === "loading" && (
          <div className="h-28 animate-pulse rounded-md bg-slate-100" aria-hidden="true" />
        )}

        {status === "error" && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">Couldn&apos;t load sharing info.</span>
            <button
              type="button"
              onClick={() => void load()}
              className="shrink-0 rounded border border-red-300 bg-white px-2 py-0.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {status === "ready" && (
          <>
            <div>
              <label
                htmlFor="share-user-select"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Add a collaborator
              </label>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Every seeded user already has access to this document.
                </p>
              ) : (
                <div className="flex gap-2">
                  <select
                    id="share-user-select"
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleGrant()}
                    disabled={isGranting}
                    className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGranting ? "Sharing…" : "Share"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-1.5 text-sm font-medium text-slate-700">People with access</h3>
              {collaborators.length === 0 ? (
                <p className="text-sm text-slate-500">Only you have access right now.</p>
              ) : (
                <ul className="space-y-1.5">
                  {collaborators.map((collaborator) => (
                    <li
                      key={collaborator.userId}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: collaborator.avatarColor }}
                          aria-hidden="true"
                        >
                          {getInitials(collaborator.name)}
                        </span>
                        <span className="truncate">{collaborator.name}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Editor
                        </span>
                      </div>

                      {confirmingRemovalId === collaborator.userId ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-xs text-slate-500">Remove?</span>
                          <button
                            type="button"
                            onClick={() => void handleRemove(collaborator.userId)}
                            disabled={removingUserId === collaborator.userId}
                            className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {removingUserId === collaborator.userId ? "Removing…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingRemovalId(null)}
                            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingRemovalId(collaborator.userId)}
                          className="shrink-0 text-xs font-medium text-slate-500 transition hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {actionError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{actionError}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end border-t border-slate-200 px-5 py-4">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}
