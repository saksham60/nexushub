import { SettingsContent } from "@/components/settings/SettingsContent";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage your Microsoft connection, local session, and NexusHub security posture.
        </p>
      </div>
      <SettingsContent />
    </div>
  );
}
