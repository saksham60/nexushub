"use client";

import { MicrosoftConnectionCard } from "@/components/settings/MicrosoftConnectionCard";
import { AgentPreferencesCard } from "@/components/settings/AgentPreferencesCard";
import { SecurityCard } from "@/components/settings/SecurityCard";

export function SettingsContent() {
  return (
    <div className="space-y-4">
      <MicrosoftConnectionCard />
      <AgentPreferencesCard />
      <SecurityCard />
    </div>
  );
}
