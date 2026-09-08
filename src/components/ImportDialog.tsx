"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AlertCircle, Upload, X } from "lucide-react";
import { IMPORT_ACCEPT, validateImportFile } from "@/validation/import";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (documentId: string) => void;
}

export function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl.open) {
      dialogEl.close();
    }
  }, [open]);

  const clientValidation = useMemo(() => {
    if (!selectedFile) return null;
    return validateImportFile({ name: selectedFile.name, size: selectedFile.size });
  }, [selectedFile]);

  const clientError =
    clientValidation && !clientValidation.ok ? clientValidation.message : null;
  const displayError = clientError ?? serverError;

  function resetAndClose() {
    setSelectedFile(null);
    setServerError(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setServerError(null);
  }

  async function handleImport() {
    if (!selectedFile || !clientValidation?.ok) return;
    setIsUploading(true);
    setServerError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/documents/import", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | { document: { id: string } }
        | { error: string }
        | null;

      if (!response.ok || !data || !("document" in data)) {
        const message = data && "error" in data ? data.error : "Import failed. Please try again.";
        throw new Error(message);
      }

      onImported(data.document.id);
      resetAndClose();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Import failed. Please try again.");
      setIsUploading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={resetAndClose}
      onClose={resetAndClose}
      aria-labelledby="import-dialog-title"
      className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 id="import-dialog-title" className="text-base font-semibold text-slate-900">
          Import a document
        </h2>
        <button
          type="button"
          onClick={resetAndClose}
          aria-label="Close"
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-slate-500">
          Supports plain text (.txt) and Markdown (.md) files, up to 1 MB. One file per import.
        </p>

        <label
          htmlFor="import-file-input"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/50"
        >
          <Upload className="h-5 w-5 text-slate-400" aria-hidden="true" />
          {selectedFile ? (
            <span className="font-medium text-slate-700">{selectedFile.name}</span>
          ) : (
            <span>Click to choose a .txt or .md file</span>
          )}
        </label>
        <input
          id="import-file-input"
          ref={fileInputRef}
          type="file"
          accept={IMPORT_ACCEPT}
          className="sr-only"
          onChange={handleFileChange}
        />

        {displayError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{displayError}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <button
          type="button"
          onClick={resetAndClose}
          className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={!selectedFile || !clientValidation?.ok || isUploading}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Importing…" : "Import"}
        </button>
      </div>
    </dialog>
  );
}
