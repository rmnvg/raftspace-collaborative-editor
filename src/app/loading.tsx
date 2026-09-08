import { Header } from "@/components/Header";
import { DocumentListSkeleton } from "@/components/DocumentListSkeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-8 md:grid-cols-2">
          <DocumentListSkeleton />
          <DocumentListSkeleton />
        </div>
      </main>
    </div>
  );
}
