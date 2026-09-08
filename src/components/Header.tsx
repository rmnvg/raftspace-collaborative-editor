import { FileText } from "lucide-react";
import type { ReactNode } from "react";

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <div className="font-semibold text-slate-900">DraftSpace</div>
            <p className="hidden text-xs text-slate-500 sm:block">
              A lightweight collaborative rich-text document editor
            </p>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
