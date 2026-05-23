import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Server, Lock } from "lucide-react";

export function SecurityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security & Architecture</CardTitle>
        <CardDescription>How NexusHub handles your data and permissions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-sm text-zinc-900">Zero Browser Storage</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Microsoft tokens are never stored in the browser. The frontend only talks to the NexusHub backend using secure HTTP-only cookies.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-sm text-zinc-900">Backend Orchestration</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              The backend owns the encrypted token vault and agent orchestration. MCP is used securely by backend agents, never directly by the frontend.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-sm text-zinc-900">Approval-Gated</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              All write actions (sending emails, scheduling events, modifying files) are strictly approval-gated and require your explicit consent.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
