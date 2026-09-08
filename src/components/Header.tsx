import { FileText } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <FileText className="h-5 w-5 text-slate-700" aria-hidden="true" />
          <span>DraftSpace</span>
        </div>
        {/* User switcher will be wired up once seeded demo users exist. */}
        <div
          className="h-9 w-40 animate-pulse rounded-md bg-slate-100"
          aria-hidden="true"
        />
      </div>
    </header>
  );
}
