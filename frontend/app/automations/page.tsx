import { ModulePage } from "@/components/modules/ModulePage";
import { AutomationTemplatesPanel } from "@/components/modules/AutomationTemplatesPanel";

export default function AutomationsPage() {
  return (
    <ModulePage
      title="Automations"
      description="Configure reusable workflows, review active automations, and inspect run status."
      filter="report"
      icon="automation"
      emptyTitle="No active automations"
      emptyDescription="Automation runs and approval-gated workflows will appear here after they are created."
    >
      <AutomationTemplatesPanel />
    </ModulePage>
  );
}
