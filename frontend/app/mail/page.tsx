import { redirect } from "next/navigation";

export default function MailPage() {
  redirect("/command-center?filter=email");
}
