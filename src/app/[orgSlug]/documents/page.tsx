import { DocumentationPageShell } from "@/modules/documents/components/DocumentationPageShell";

export default async function DocumentsPage({
    params,
}: Readonly<{
    params: Promise<{ orgSlug: string }>;
}>) {
    const { orgSlug } = await params;

    return <DocumentationPageShell orgSlug={orgSlug} />;
}

