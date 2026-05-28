import { ModulePage } from "@/components/modules/ModulePage";

export default function MeetingsPage() {
  return (
    <ModulePage
      title="Meetings"
      description="Manage schedule previews, pending meeting approvals, upcoming meetings, and prep briefs."
      filter="calendar"
      icon="meeting"
      emptyTitle="No meeting actions waiting"
      emptyDescription="Upcoming meetings, schedule approvals, and prep tasks will appear here."
    />
  );
}
