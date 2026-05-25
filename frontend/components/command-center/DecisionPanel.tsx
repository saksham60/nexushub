"use client";

import { useMemo, useState } from "react";
import { ActionItem } from "@/features/command-center/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, ExternalLink, Mail, Sparkles } from "lucide-react";
import { useApproveAction } from "@/features/approvals/hooks";
import {
  useCreateOutlookDraft,
  useGenerateDraftReply,
  useSendOutlookDraft,
} from "@/features/mail/hooks";
import { DraftCreateResponse, DraftReplyResponse, DraftSendResponse } from "@/features/mail/types";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

interface DecisionPanelProps {
  item: ActionItem | null;
}

export function DecisionPanel({ item }: DecisionPanelProps) {
  const approveAction = useApproveAction();
  const generateDraftReply = useGenerateDraftReply();
  const createOutlookDraft = useCreateOutlookDraft();
  const sendOutlookDraft = useSendOutlookDraft();
  const [draftState, setDraftState] = useState<{
    itemId: string;
    preview: DraftReplyResponse;
    body: string;
  } | null>(null);
  const [draftErrorState, setDraftErrorState] = useState<{ itemId: string; message: string } | null>(null);
  const [createdDraftState, setCreatedDraftState] = useState<{
    itemId: string;
    draft: DraftCreateResponse;
  } | null>(null);
  const [sentDraftState, setSentDraftState] = useState<{
    itemId: string;
    sent: DraftSendResponse;
  } | null>(null);
  const [calendarUpdateState, setCalendarUpdateState] = useState<{
    itemId: string;
    event: {
      success?: boolean;
      subject?: string;
      mailboxEmail?: string;
      webLink?: string | null;
    };
  } | null>(null);

  const draft = item && draftState?.itemId === item.id ? draftState.preview : null;
  const draftBody = item && draftState?.itemId === item.id ? draftState.body : "";
  const draftError = item && draftErrorState?.itemId === item.id ? draftErrorState.message : null;
  const createdDraft = item && createdDraftState?.itemId === item.id ? createdDraftState.draft : null;
  const sentDraft = item && sentDraftState?.itemId === item.id ? sentDraftState.sent : null;
  const updatedCalendar = item && calendarUpdateState?.itemId === item.id ? calendarUpdateState.event : null;

  const metadata = (item?.metadata || {}) as Record<string, any>;
  const emailRecipients = useMemo(() => {
    if (!item || item.type !== "email") return [];
    const email = metadata.from;
    return email && String(email).includes("@") ? [String(email)] : [];
  }, [item, metadata.from]);

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-zinc-500">NexusHub will auto-select the highest priority decision here.</p>
      </div>
    );
  }

  const generateDraft = async () => {
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
    setSentDraftState(null);
    setCalendarUpdateState(null);
    try {
      const preview = await generateDraftReply.mutateAsync({
        messageId: String(metadata.messageId || item.id.replace(/^mail_/, "")),
        subject: String(metadata.subject || item.title),
        from: String(metadata.from || emailRecipients[0]),
        to: Array.isArray(metadata.to) ? metadata.to.map(String) : [],
        bodyPreview: String(metadata.bodyPreview || item.description || ""),
        body: String(metadata.body || metadata.bodyPreview || item.description || ""),
        mailboxEmail: String(metadata.mailboxEmail || ""),
        tone: "professional",
        userIntent: "draft a concise executive reply",
      });
      setDraftState({ itemId: item.id, preview, body: preview.draftBody });
    } catch {
      setDraftErrorState({
        itemId: item.id,
        message: "Could not generate draft. Please try again.",
      });
    }
  };

  const saveDraftToOutlook = async () => {
    if (!draft || item.type !== "email") return;
    setDraftErrorState(null);
    setSentDraftState(null);
    setCalendarUpdateState(null);
    try {
      const created = await createOutlookDraft.mutateAsync({
        originalMessageId: String(metadata.messageId || item.id.replace(/^mail_/, "")),
        subject: draft.draftSubject,
        recipients: emailRecipients,
        draftBody,
        mailboxEmail: String(metadata.mailboxEmail || ""),
        approvalId: null,
      });
      setCreatedDraftState({ itemId: item.id, draft: created });
    } catch (error) {
      setDraftErrorState({ itemId: item.id, message: getFriendlyErrorMessage(error) });
    }
  };

  const sendSavedDraft = async () => {
    if (!createdDraft?.outlookDraftId || item.type !== "email") return;
    setDraftErrorState(null);
    try {
      const sent = await sendOutlookDraft.mutateAsync({
        outlookDraftId: createdDraft.outlookDraftId,
      });
      setSentDraftState({ itemId: item.id, sent });
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
        setSentDraftState(null);
      }
      if (result?.calendarEvent) {
        setCalendarUpdateState({
          itemId: item.id,
          event: result.calendarEvent,
        });
      }
    } catch (error) {
      setDraftErrorState({ itemId: item.id, message: getFriendlyErrorMessage(error) });
    }
  };

  const primaryAction = async () => {
    if (item.type === "email") {
      if (!draft) await generateDraft();
      else if (!createdDraft) await saveDraftToOutlook();
      else if (!sentDraft) await sendSavedDraft();
      return;
    }
    if (item.type === "approval") await approveExistingApproval();
  };

  const primaryLabel = () => {
    if (item.type === "email" && sentDraft) return "Email sent";
    if (sendOutlookDraft.isPending) return "Sending...";
    if (item.type === "email" && createdDraft) return "Send Email";
    if (createdDraft) return "Draft saved";
    if (updatedCalendar) return "Meeting updated";
    if (createOutlookDraft.isPending) return "Saving...";
    if (generateDraftReply.isPending) return "Drafting...";
    if (item.type === "email" && draft) return "Save Draft to Outlook";
    if (item.type === "email") return "Draft Reply";
    if (item.type === "approval") return approvalPrimaryLabel(metadata.action_type);
    return item.primaryActionLabel;
  };

  const primaryDisabled =
    generateDraftReply.isPending ||
    createOutlookDraft.isPending ||
    sendOutlookDraft.isPending ||
    approveAction.isPending ||
    Boolean(sentDraft) ||
    Boolean(updatedCalendar) ||
    Boolean(item.type === "email" && createdDraft && !createdDraft.outlookDraftId);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Decision Desk</h2>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Auto-selected
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            {item.type}
          </span>
          <span className={item.priority === "high" ? "rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700" : "rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600"}>
            {item.priority} priority
          </span>
        </div>
        <h3 className="mt-2 truncate text-lg font-semibold text-zinc-900">{item.title}</h3>
        {item.person && <p className="text-xs text-zinc-500">From: {item.person}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {draftError && (
          <div className="mb-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{draftError}</span>
          </div>
        )}

        {sentDraft ? (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Email sent from Outlook for {sentDraft.mailboxEmail}.
          </div>
        ) : updatedCalendar ? (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Meeting updated in Outlook for {updatedCalendar.mailboxEmail}.
            {updatedCalendar.webLink && (
              <a
                href={updatedCalendar.webLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-medium text-green-900 hover:underline"
              >
                Open Meeting in Outlook <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : createdDraft ? (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Draft saved to Outlook. You can send it now or review it in Outlook.
            {createdDraft.webLink && (
              <a
                href={createdDraft.webLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-medium text-green-900 hover:underline"
              >
                Open Draft in Outlook <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : null}

        <div className="space-y-3">
          <section>
            <h4 className="mb-1 text-xs font-semibold text-zinc-500">Why this matters</h4>
            <p className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-700">
              {whyThisMatters(item, metadata)}
            </p>
          </section>

          <section>
            <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" /> AI Summary
            </h4>
            <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              {summaryFor(item)}
            </p>
          </section>

          {item.type === "email" && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <Mail className="h-3.5 w-3.5 text-blue-600" /> Draft your reply
                </h4>
                {draft && (
                  <details className="text-xs text-zinc-500">
                    <summary className="cursor-pointer">Details</summary>
                    <div className="mt-1 rounded-md border border-zinc-100 bg-zinc-50 p-2">
                      <p>Confidence: {Math.round(draft.confidence * 100)}%</p>
                      <p>{draft.rationale}</p>
                    </div>
                  </details>
                )}
              </div>

              {draft ? (
                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  <div className="border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                    <p>To: {emailRecipients.join(", ")}</p>
                    <p>Subject: {draft.draftSubject}</p>
                  </div>
                  <Textarea
                    value={draftBody}
                    disabled={Boolean(createdDraft)}
                    onChange={(event) =>
                      setDraftState((state) =>
                        state && state.itemId === item.id ? { ...state, body: event.target.value } : state,
                      )
                    }
                    className="min-h-44 resize-none border-0 bg-white text-sm leading-6 focus-visible:ring-0"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  Generate a concise reply draft from the original Outlook message. The email will not be sent.
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50 p-4">
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            size="lg"
            onClick={() => void primaryAction()}
            disabled={primaryDisabled}
          >
            <Check className="mr-2 h-4 w-4" />
            {primaryLabel()}
          </Button>
          {metadata.webLink && (
            <a href={String(metadata.webLink)} target="_blank" rel="noreferrer">
              <Button variant="outline" size="lg" className="bg-white">
                Open original
              </Button>
            </a>
          )}
          <Button variant="outline" size="lg" className="bg-white text-zinc-500">
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

function summaryFor(item: ActionItem): string {
  const metadata = (item.metadata || {}) as Record<string, any>;
  const preview = metadata.preview && typeof metadata.preview === "object" ? metadata.preview : {};
  if (item.type === "approval" && preview.kind === "calendar_reschedule") {
    return `${preview.subject || "This meeting"} is ready to move from ${preview.from} to ${preview.to}.`;
  }
  if (item.type === "email") {
    return item.description
      ? `${item.person || "The sender"} is asking for your input. ${item.description}`
      : "This email likely needs a concise reply or clarification.";
  }
  return item.description || "NexusHub selected this item because it may need your attention.";
}

function whyThisMatters(item: ActionItem, metadata: Record<string, any>): string {
  const preview = metadata.preview && typeof metadata.preview === "object" ? metadata.preview : {};
  if (item.type === "approval" && preview.kind === "calendar_reschedule") {
    return `This calendar change will update Outlook. Review before moving ${preview.subject || "the meeting"}.`;
  }
  return String(metadata.reason || item.description || "This item is in your priority feed and may need a decision.");
}

function approvalPrimaryLabel(actionType: unknown): string {
  if (actionType === "calendar.reschedule_event") return "Approve Reschedule";
  if (actionType === "mail.create_draft_reply") return "Create Outlook Draft";
  return "Approve Action";
}
