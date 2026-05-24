"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { AgentCommandBar } from "@/components/agent/AgentCommandBar";
import { SuggestedPromptChips } from "@/components/agent/SuggestedPromptChips";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/queryKeys";
import { MailItem } from "@/features/mail/types";
import { EmptyState } from "@/components/common/EmptyState";
import { Mail as MailIcon, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MailPage() {
  const { data: results } = useQuery<{ kind: string; items: MailItem[]; summary?: string }>({
    queryKey: queryKeys.agent.result("mail_find_needs_reply"),
    enabled: true,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Mail Pilot"
        description="Review and act on important emails identified by NexusHub."
      />

      <div className="max-w-3xl space-y-4">
        <AgentCommandBar />
        <SuggestedPromptChips 
          prompts={[
            "Find emails that need reply",
            "Show emails from my manager",
            "Draft a polite follow-up"
          ]}
          onSelect={(p) => {
            const input = document.querySelector<HTMLInputElement>('input[name="command"]');
            if (input) {
              input.value = p;
            }
          }}
        />
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-medium text-zinc-900 mb-6">Operational Queue</h2>
        
        {!results || !results.items || results.items.length === 0 ? (
          <EmptyState 
            icon={<MailIcon className="h-10 w-10" />}
            title="Your queue is empty"
            description="Use the command bar above to ask NexusHub to find emails that need your attention."
          />
        ) : (
          <div className="grid gap-4">
            {results.summary && (
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{results.summary}</p>
              </div>
            )}
            {results.items.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:border-blue-300 transition-colors cursor-pointer">
                <CardHeader className="bg-zinc-50 border-b border-zinc-100 py-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-zinc-900">{item.from.name || item.from.email}</span>
                    <span className="text-xs text-zinc-500">{new Date(item.received_at).toLocaleDateString()}</span>
                  </div>
                  {item.importance === "high" && <Badge variant="destructive">High Priority</Badge>}
                </CardHeader>
                <CardContent className="py-4">
                  <CardTitle className="text-base mb-2">{item.subject}</CardTitle>
                  <p className="text-sm text-zinc-600 line-clamp-2">{item.preview}</p>
                  
                  {item.reason && (
                    <div className="mt-4 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                        Agent Note
                      </Badge>
                      <span className="text-xs text-zinc-600 italic">{item.reason}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
