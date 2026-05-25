import { SettingsContent } from "@/components/settings/SettingsContent";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage your Microsoft connection, local session, and NexusHub security posture.
          </p>
        </div>
        <Link href="/command-center">
          <Button variant="outline" className="bg-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Command Center
          </Button>
        </Link>
      </div>
      <SettingsContent />
    </div>
  );
}
