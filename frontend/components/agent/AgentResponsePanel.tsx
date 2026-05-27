"use client";

import { AgentChatResponse } from "@/features/agent/types";
import { AlertCircle, CheckCircle, Link as LinkIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useConnectMicrosoft } from "@/features/auth/hooks";

interface AgentResponsePanelProps {
  response: AgentChatResponse | null;
  isLoading?: boolean;
  error?: Error | null;
  onConnect?: () => void;
}

export function AgentResponsePanel({ response, isLoading, error, onConnect }: AgentResponsePanelProps) {
  const connectMicrosoft = useConnectMicrosoft();

  if (isLoading) {
    return (
      <Alert className="border-primary/20 bg-primary/5 text-primary">
        <AlertCircle className="h-4 w-4 animate-pulse" />
        <AlertTitle>Thinking...</AlertTitle>
        <AlertDescription>NexusHub is processing your request.</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Request failed</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!response) return null;

  if (response.type === "connect_required") {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Connect Microsoft 365</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col items-start gap-3 text-amber-700">
          {response.message}
          <Button onClick={onConnect || connectMicrosoft} variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
            <LinkIcon className="mr-2 h-4 w-4" />
            Connect Microsoft 365
          </Button>
          <ExecutionDetails response={response} />
        </AlertDescription>
      </Alert>
    );
  }

  if (response.type === "approval_required") {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Review required</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col items-start gap-3 text-blue-700">
          {response.message}
          {(response.approvalId || response.approval?.id) && (
            <Link href="/approvals">
              <Button variant="default" className="bg-blue-600 text-white hover:bg-blue-700">
                Review Approval
              </Button>
            </Link>
          )}
          <ExecutionDetails response={response} />
        </AlertDescription>
      </Alert>
    );
  }

  if (response.type === "clarification") {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Clarification needed</AlertTitle>
        <AlertDescription className="mt-2 text-amber-700">
          {response.message}
          <ExecutionDetails response={response} />
        </AlertDescription>
      </Alert>
    );
  }

  if (response.type === "not_implemented") {
    return (
      <Alert className="border-zinc-200 bg-white">
        <AlertCircle className="h-4 w-4 text-zinc-500" />
        <AlertTitle>Not available yet</AlertTitle>
        <AlertDescription>
          {response.message}
          <ExecutionDetails response={response} />
        </AlertDescription>
      </Alert>
    );
  }

  if (response.type === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Could not complete request</AlertTitle>
        <AlertDescription>
          {response.error.message}
          <ExecutionDetails response={response} />
        </AlertDescription>
      </Alert>
    );
  }

  const outcome = businessOutcome(response);

  return (
    <Alert className="border-blue-100 bg-blue-50/70">
      <CheckCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">{outcome.title}</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-3 text-blue-800">
        <span>{outcome.description}</span>
        {outcome.showFeedAction && (
          <div className="flex flex-wrap gap-2">
            <a href="#work-feed">
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                View in Feed
              </Button>
            </a>
          </div>
        )}
        <ExecutionDetails response={response} />
      </AlertDescription>
    </Alert>
  );
}

function businessOutcome(response: Extract<AgentChatResponse, { type: "agent_response" }>) {
  if (response.data.kind === "mail_results") {
    return {
      title: "Attention brief ready",
      description: response.data.summary || `${response.data.items.length} emails may need your attention.`,
      showFeedAction: true,
    };
  }
  if (response.data.kind === "calendar_agenda") {
    return {
      title: "Calendar brief ready",
      description: response.data.summary || `${response.data.items.length} meetings found for today.`,
      showFeedAction: true,
    };
  }
  if (response.data.kind === "recent_files") {
    return {
      title: "Document brief ready",
      description: response.data.summary || `${response.data.items.length} files are ready for review.`,
      showFeedAction: true,
    };
  }
  if (response.data.kind === "approvals") {
    return {
      title: "Approval brief ready",
      description: `${response.data.items.length} approval${response.data.items.length === 1 ? "" : "s"} need review.`,
      showFeedAction: true,
    };
  }
  return {
    title: "NexusHub response",
    description: response.data.message,
    showFeedAction: false,
  };
}

function ExecutionDetails({ response }: { response: AgentChatResponse }) {
  const routing = response.routing;
  if (!routing) return null;
  return (
    <details className="text-xs opacity-80">
      <summary className="cursor-pointer font-medium">Execution details</summary>
      <div className="mt-2 space-y-1">
        <p>Tool: {routing.selectedTool || "none"}</p>
        {typeof routing.confidence === "number" && <p>Confidence: {Math.round(routing.confidence * 100)}%</p>}
        {routing.reason && <p>Reason: {routing.reason}</p>}
        <p>Clarification needed: {routing.clarificationNeeded ? "yes" : "no"}</p>
        <p>Approval required: {routing.approvalRequired ? "yes" : "no"}</p>
      </div>
    </details>
  );
}
