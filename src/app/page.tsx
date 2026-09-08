import { Header } from "@/components/Header";
import { DocumentListSkeleton } from "@/components/DocumentListSkeleton";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Your documents
          </h1>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <section aria-labelledby="owned-heading">
            <h2
              id="owned-heading"
              className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500"
            >
              Owned by you
            </h2>
            <DocumentListSkeleton />
          </section>

          <section aria-labelledby="shared-heading">
            <h2
              id="shared-heading"
              className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500"
            >
              Shared with you
            </h2>
            <DocumentListSkeleton />
          </section>
        </div>
      </main>
    </div>
  );
}
