"use client";

import { useMemo, useState } from "react";
import { ActionItem } from "@/features/command-center/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Calendar, Check, ExternalLink } from "lucide-react";
import { useApproveAction } from "@/features/approvals/hooks";
import { useCreateDraftPreview, useCreateOutlookDraft } from "@/features/mail/hooks";
import { DraftCreateResponse, DraftPreviewResponse } from "@/features/mail/types";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

interface DecisionPanelProps {
  item: ActionItem | null;
}

export function DecisionPanel({ item }: DecisionPanelProps) {
  const approveAction = useApproveAction();
  const createDraftPreview = useCreateDraftPreview();
  const createOutlookDraft = useCreateOutlookDraft();
  const [draftState, setDraftState] = useState<{
    itemId: string;
    preview: DraftPreviewResponse;
    body: string;
  } | null>(null);
  const [draftErrorState, setDraftErrorState] = useState<{ itemId: string; message: string } | null>(null);
  const [createdDraftState, setCreatedDraftState] = useState<{
    itemId: string;
    draft: DraftCreateResponse;
  } | null>(null);

  const draft = item && draftState?.itemId === item.id ? draftState.preview : null;
  const draftBody = item && draftState?.itemId === item.id ? draftState.body : "";
  const draftError = item && draftErrorState?.itemId === item.id ? draftErrorState.message : null;
  const createdDraft = item && createdDraftState?.itemId === item.id ? createdDraftState.draft : null;

  const emailDraftPreview = item?.type === "approval" && item.originalItem?.preview?.kind === "email_draft"
    ? item.originalItem.preview
    : null;

  const emailRecipients = useMemo(() => {
    if (!item || item.type !== "email") return [];
    const email = item.originalItem?.from?.email;
    return email && String(email).includes("@") ? [String(email)] : [];
  }, [item]);

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed">
        <p className="text-zinc-500">Select an item from the feed to view details and take action.</p>
      </div>
    );
  }

  const createPreview = async () => {
    if (item.type !== "email") return;
    if (emailRecipients.length === 0) {
      setDraftErrorState({
        itemId: item.id,
        message: "This email does not include a sender email address, so NexusHub cannot create an Outlook draft.",
      });
      return;
    }

    setDraftErrorState(null);
    setCreatedDraftState(null);
    try {
      const preview = await createDraftPreview.mutateAsync({
        original_message_id: item.originalItem?.id || item.id.replace(/^mail_/, ""),
        subject: item.title,
        recipients: emailRecipients,
        context: item.description || item.originalItem?.preview || "",
        tone: "professional",
        intent: "replying with the requested input",
      });
      setDraftState({ itemId: item.id, preview, body: preview.draftBody });
    } catch (error) {
      setDraftErrorState({ itemId: item.id, message: getFriendlyErrorMessage(error) });
    }
  };

  const approveAndCreateDraft = async () => {
    if (!draft) return;
    setDraftErrorState(null);
    try {
      const result = await createOutlookDraft.mutateAsync({
        approval_id: draft.approvalId,
        original_message_id: draft.originalMessageId,
        subject: draft.subject,
        recipients: draft.recipients,
        draft_body: draftBody,
      });
      setCreatedDraftState({ itemId: item.id, draft: result });
    } catch (error) {
      setDraftErrorState({ itemId: item.id, message: getFriendlyErrorMessage(error) });
    }
  };

  const approveExistingApproval = async () => {
    const approvalId = item.id.replace("app_", "");
    setDraftErrorState(null);
    try {
      const result: any = await approveAction.mutateAsync(approvalId);
      if (result?.draft) {
        setCreatedDraftState({
          itemId: item.id,
          draft: {
            success: Boolean(result.draft.success),
            outlookDraftId: result.draft.outlookDraftId,
            mailboxEmail: result.draft.mailboxEmail,
            createdAt: result.draft.createdAt,
            webLink: result.draft.webLink,
            simulated: result.draft.simulated,
            approvalId,
          },
        });
      }
    } catch (error) {
      setDraftErrorState({ itemId: item.id, message: getFriendlyErrorMessage(error) });
    }
  };

  const handleAction = () => {
    if (item.type === "email") {
      void createPreview();
      return;
    }
    if (item.type === "approval") {
      void approveExistingApproval();
    }
  };

  const primaryLabel = () => {
    if (item.type === "email" && draft) return "Approve & Create Outlook Draft";
    if (item.type === "email") return "Draft Reply";
    if (item.type === "approval" && item.originalItem?.action_type === "mail.create_draft_reply") {
      return "Create Outlook Draft";
    }
    return item.primaryActionLabel;
  };

  const primaryDisabled =
    createDraftPreview.isPending ||
    createOutlookDraft.isPending ||
    approveAction.isPending ||
    Boolean(createdDraft);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden sticky top-24">
      <div className="px-6 py-5 border-b border-zinc-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
            {item.type}
          </span>
          {item.priority === "high" && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              High Priority
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 leading-tight">{item.title}</h2>
        {item.person && (
          <p className="text-sm text-zinc-500 mt-1">
            From: <span className="font-medium text-zinc-700">{item.person}</span>
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {draftError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{draftError}</span>
          </div>
        )}

        {createdDraft && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Draft created in Outlook for {createdDraft.mailboxEmail}
            {createdDraft.webLink && (
              <a
                href={createdDraft.webLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-medium text-green-900 hover:underline"
              >
                Open draft <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">AI Summary</h3>
          <p className="text-sm text-zinc-800 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
            {item.description || "No summary available for this item."}
          </p>
        </div>

        {item.type === "calendar" && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Meeting Details</h3>
            <div className="flex items-center gap-2 text-sm text-zinc-700 mb-1">
              <Calendar className="h-4 w-4" /> {item.timeLabel}
            </div>
            {item.originalItem?.preparation_notes?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-zinc-800 mb-1">Preparation Notes:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600">
                  {item.originalItem.preparation_notes.map((note: string, idx: number) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {item.type === "email" && item.originalItem?.reason && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Why this matters</h3>
            <p className="text-sm text-zinc-700">{item.originalItem.reason}</p>
          </div>
        )}

        {draft && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Draft Preview</h3>
            <Textarea
              value={draftBody}
              onChange={(event) =>
                setDraftState((state) =>
                  state && state.itemId === item.id ? { ...state, body: event.target.value } : state
                )
              }
              className="min-h-56 resize-none bg-white text-sm leading-6"
            />
          </div>
        )}

        {emailDraftPreview && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Draft Preview</h3>
            <p className="whitespace-pre-wrap rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800">
              {emailDraftPreview.body || emailDraftPreview.body_preview}
            </p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-100 bg-zinc-50">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Suggested Action</h3>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
            onClick={draft ? approveAndCreateDraft : handleAction}
            disabled={primaryDisabled}
          >
            <Check className="h-4 w-4 mr-2" />
            {createdDraft
              ? "Draft Created"
              : createDraftPreview.isPending
                ? "Generating..."
                : createOutlookDraft.isPending || approveAction.isPending
                  ? "Creating..."
                  : primaryLabel()}
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-white" disabled={!draft || Boolean(createdDraft)}>
              Edit Draft
            </Button>
            <Button variant="outline" className="flex-1 bg-white text-zinc-500 hover:text-red-600">
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
