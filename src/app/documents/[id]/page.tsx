import { notFound } from "next/navigation";
import { DocumentEditorClient } from "@/components/DocumentEditorClient";
import { documentIdSchema } from "@/validation/documents";

interface DocumentPageProps {
  params: { id: string };
}

export default function DocumentPage({ params }: DocumentPageProps) {
  const idResult = documentIdSchema.safeParse(params.id);
  if (!idResult.success) {
    notFound();
  }

  return <DocumentEditorClient documentId={idResult.data} />;
}
