import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession, useLogout } from "@/features/session/hooks";
import { Button } from "@/components/ui/button";

export function AgentPreferencesCard() {
  const { data: session } = useSession();
  const logout = useLogout();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences & Account</CardTitle>
        <CardDescription>Manage your local session and agent settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
          <div>
            <h4 className="font-medium text-sm text-zinc-900">Current Session</h4>
            <p className="text-xs text-zinc-500">Signed in as {session?.status === "ok" ? session.user.email : "Unknown"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
