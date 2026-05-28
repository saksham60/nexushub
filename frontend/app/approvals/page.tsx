import { ModulePage } from "@/components/modules/ModulePage";

export default function ApprovalsPage() {
  return (
    <ModulePage
      title="Approvals"
      description="Review pending decisions, approval-gated actions, and execution history."
      filter="approval"
      icon="approval"
      emptyTitle="No approvals pending"
      emptyDescription="Email drafts, calendar changes, document reviews, and automation approvals will appear here."
    />
  );
}
