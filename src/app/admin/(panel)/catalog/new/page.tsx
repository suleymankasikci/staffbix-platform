import { PageShell } from "@/components/app/PageShell";
import { CatalogRoleForm } from "@/components/admin/CatalogRoleForm";

export default function NewCatalogRolePage() {
  return (
    <PageShell
      title="New role"
      description="Add a new AI worker role to the platform catalog. Tenants will see it in their hire flow within 60 seconds."
      crumbs={[
        { label: "Catalog", href: "/admin/catalog" },
        { label: "New" },
      ]}
    >
      <CatalogRoleForm mode="create" cancelHref="/admin/catalog" />
    </PageShell>
  );
}
