import { ModulePage } from "@/components/modules/ModulePage";

export default function MailPage() {
  return (
    <ModulePage
      title="Mail"
      description="Review replies needed, approval-related messages, Outlook drafts, and send status."
      filter="email"
      icon="mail"
      emptyTitle="No email actions waiting"
      emptyDescription="Replies, drafts, and approval-related emails will appear here when Microsoft mail data is available."
    />
  );
}
