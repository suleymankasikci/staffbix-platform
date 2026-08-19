import { redirect } from "next/navigation";

export default function AdminPanelRoot() {
  redirect("/admin/dashboard");
}
