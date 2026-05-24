import { redirect } from "next/navigation";

export default function ApprovalsPage() {
  redirect("/command-center?filter=approval");
}
