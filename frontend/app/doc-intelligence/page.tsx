import { ModulePage } from "@/components/modules/ModulePage";

export default function DocIntelligencePage() {
  return (
    <ModulePage
      title="Doc Intelligence"
      description="Analyze connected and uploaded documents, generate briefs, and connect related Teams or email context."
      filter="document"
      icon="document"
      emptyTitle="No documents need review"
      emptyDescription="Recent files, uploaded documents, analysis reports, and generated briefs will appear here."
    />
  );
}
