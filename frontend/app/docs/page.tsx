import { redirect } from "next/navigation";

export default function DocsPage() {
  redirect("/command-center?filter=document");
}
