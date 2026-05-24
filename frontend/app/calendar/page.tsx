import { redirect } from "next/navigation";

export default function CalendarPage() {
  redirect("/command-center?filter=calendar");
}
