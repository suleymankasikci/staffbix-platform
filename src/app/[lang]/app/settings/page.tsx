import { redirect } from "next/navigation";

export default function SettingsRoot() {
  redirect("/app/settings/profile");
}
