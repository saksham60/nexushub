"use client";

import { useMicrosoftStatus, useConnectMicrosoft, useDisconnectMicrosoft } from "@/features/auth/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Unlink, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function MicrosoftConnectionCard() {
  const { data: status, isLoading } = useMicrosoftStatus();
  const connect = useConnectMicrosoft();
  const disconnect = useDisconnectMicrosoft();
  const scopes = status?.connected ? status.scopes || [] : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Microsoft 365 Connection</CardTitle>
            <CardDescription>Connect your account to enable Mail, Calendar, and Docs.</CardDescription>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-24 rounded-full" />
          ) : status?.connected ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-zinc-500">
              Disconnected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : status?.connected ? (
          <div className="space-y-6">
            <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900">{status.display_name || "Microsoft 365"}</p>
                <p className="text-sm text-zinc-500">{status.email || "Connected account"}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Unlink className="w-4 h-4 mr-2" /> Disconnect
              </Button>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-zinc-900 mb-2">Granted Permissions</h4>
              <div className="flex flex-wrap gap-2">
                {scopes.length ? scopes.map(scope => (
                  <Badge key={scope} variant="secondary" className="font-normal text-xs bg-zinc-100 text-zinc-600">
                    {scope}
                  </Badge>
                )) : (
                  <span className="text-xs text-zinc-500">No granted scopes were returned by the backend.</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                NexusHub needs access to your Microsoft 365 account to read emails, manage your calendar, and analyze documents.
              </p>
            </div>
            <Button onClick={() => connect()} className="w-full sm:w-auto bg-[#0078D4] hover:bg-[#005A9E] text-white">
              <Link2 className="w-4 h-4 mr-2" /> Connect Microsoft 365
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
