import { notFound } from "next/navigation";
import { PageShell } from "@/components/app/PageShell";
import { CatalogRoleForm } from "@/components/admin/CatalogRoleForm";
import { loadCatalogRole } from "@/lib/roles-server";

// Loads the role from Postgres on render → server-rendered on demand,
// never statically prerendered (DB unreachable at build time).
export const dynamic = "force-dynamic";

export default async function EditCatalogRolePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const role = await loadCatalogRole(slug);
  if (!role) notFound();

  return (
    <PageShell
      title={`Edit ${role.title}`}
      description="Changes propagate to all tenants within 60 seconds."
      crumbs={[
        { label: "Catalog", href: "/admin/catalog" },
        { label: role.title },
      ]}
    >
      <CatalogRoleForm mode="edit" initial={role} cancelHref="/admin/catalog" />
    </PageShell>
  );
}
