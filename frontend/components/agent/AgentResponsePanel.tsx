"use client";

import { AgentChatResponse } from "@/features/agent/types";
import { AlertCircle, CheckCircle, Link as LinkIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useConnectMicrosoft } from "@/features/auth/hooks";

export function AgentResponsePanel({ response }: { response: AgentChatResponse | null }) {
  const connectMicrosoft = useConnectMicrosoft();

  if (!response) return null;

  if (response.type === "connect_required") {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Connection Required</AlertTitle>
        <AlertDescription className="text-amber-700 mt-2 flex flex-col gap-3 items-start">
          {response.message}
          <Button onClick={() => connectMicrosoft()} variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
            <LinkIcon className="h-4 w-4 mr-2" />
            Connect Microsoft 365
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (response.type === "approval_required") {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Approval Required</AlertTitle>
        <AlertDescription className="text-blue-700 mt-2 flex flex-col gap-3 items-start">
          {response.message}
          <Link href="/approvals">
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
              Review Approval
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (response.type === "not_implemented") {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Implemented</AlertTitle>
        <AlertDescription>{response.message}</AlertDescription>
      </Alert>
    );
  }

  if (response.type === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error {response.error.code}</AlertTitle>
        <AlertDescription>{response.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (response.type === "agent_response") {
    if (response.data.kind === "message") {
      return (
        <Alert className="border-blue-200 bg-blue-50">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">NexusHub</AlertTitle>
          <AlertDescription className="text-blue-700 mt-2">
            {response.data.message}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Agent Finished</AlertTitle>
        <AlertDescription className="text-green-700 mt-2">
          {("summary" in response.data && response.data.summary) || `Completed action: ${response.tool_used}. Check the relevant dashboard for results.`}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
