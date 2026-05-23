"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { MicrosoftConnectionCard } from "@/components/settings/MicrosoftConnectionCard";
import { SecurityCard } from "@/components/settings/SecurityCard";
import { AgentPreferencesCard } from "@/components/settings/AgentPreferencesCard";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Settings"
        description="Manage your connections, security, and preferences."
      />

      <div className="grid gap-8 max-w-4xl">
        <MicrosoftConnectionCard />
        <SecurityCard />
        <AgentPreferencesCard />
      </div>
    </div>
  );
}
