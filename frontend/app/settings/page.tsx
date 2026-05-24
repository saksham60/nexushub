import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/command-center?settings=1");
}
