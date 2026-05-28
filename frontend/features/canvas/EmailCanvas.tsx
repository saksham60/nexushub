"use client";

import { useState, useEffect, useRef } from "react";
import { useCanvas } from "./CanvasContext";
import { Mail, Sparkles, Send, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenerateDraftReply, useCreateOutlookDraft, useSendOutlookDraft } from "@/features/mail/hooks";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { normalizeApprovalId } from "@/features/approvals/ids";
import { CanvasStatusBanner } from "./CanvasStatusBanner";

export function EmailCanvas() {
  const { actionItem, canvasPayload, closeCanvas } = useCanvas();
  const generateDraft = useGenerateDraftReply();
  const createDraft = useCreateOutlookDraft();
  const sendDraft = useSendOutlookDraft();

  const metadata = {
    ...((actionItem?.metadata || {}) as Record<string, any>),
    ...((canvasPayload || {}) as Record<string, any>),
  };
  const subject = metadata.subject || metadata.title || actionItem?.title || "No Subject";
  const from = actionItem?.person || senderLabel(metadata.from) || "Unknown Sender";
  const originalBody = metadata.bodyPreview || actionItem?.description || "No preview available.";
  
  // Extract recipients safely
  const recipients = firstStringList(metadata.recipients || metadata.to || metadata.replyTo);
  const primaryRecipient = recipients[0] || senderEmail(metadata.from);
  
  const mailboxEmail = typeof metadata.mailboxEmail === 'string' ? metadata.mailboxEmail : "";
  const originalMessageId = typeof metadata.messageId === 'string' ? metadata.messageId : undefined;
  const itemId = actionItem?.id || originalMessageId || subject;
  const initialDraftBody = String(metadata.draftBody || metadata.body || "");
  const approvalId = normalizeApprovalId(metadata.approvalId || metadata.approval_id || "");
  const [draftState, setDraftState] = useState<{
    itemId: string;
    body: string;
    outlookDraftId: string | null;
  }>({ itemId: "", body: "", outlookDraftId: null });
  const body = draftState.itemId === itemId ? draftState.body : initialDraftBody;
  const outlookDraftId = draftState.itemId === itemId ? draftState.outlookDraftId : null;
  const autoDraftedItemId = useRef<string | null>(null);

  // Initialize draft when opened if metadata exists
  useEffect(() => {
    if (
      originalMessageId &&
      metadata.bodyPreview &&
      !body &&
      !generateDraft.isPending &&
      !generateDraft.isSuccess &&
      autoDraftedItemId.current !== itemId
    ) {
      autoDraftedItemId.current = itemId;
      // Auto-generate draft on open
      generateDraft.mutate({
        messageId: originalMessageId || "",
        subject: subject,
        from: primaryRecipient,
        bodyPreview: originalBody,
        body: originalBody,
        tone: "professional",
        mailboxEmail: mailboxEmail,
        to: [primaryRecipient],
        userIntent: "Approve and proceed",
      }, {
        onSuccess: (data) => {
          if (data.draftBody) {
            setDraftState({ itemId, body: data.draftBody, outlookDraftId: null });
          }
        }
      });
    }
  }, [body, generateDraft, itemId, mailboxEmail, metadata.bodyPreview, originalBody, originalMessageId, primaryRecipient, subject]);

  const handleSaveDraft = () => {
    createDraft.mutate({
      subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
        draftBody: body,
      recipients: primaryRecipient ? [primaryRecipient] : [],
      mailboxEmail: mailboxEmail,
      originalMessageId: originalMessageId,
      approvalId: approvalId || null,
    }, {
      onSuccess: (data) => {
        if (data.outlookDraftId) {
          setDraftState({ itemId, body, outlookDraftId: data.outlookDraftId });
        }
      }
    });
  };

  const handleSend = () => {
    if (!outlookDraftId) return;
    sendDraft.mutate({
      outlookDraftId: outlookDraftId,
    });
  };

  const isWorking = generateDraft.isPending || createDraft.isPending || sendDraft.isPending;
  const anyError = generateDraft.error || createDraft.error || sendDraft.error;
  const missingRecipient = !primaryRecipient;

  return (
    <div className="flex h-full bg-background/50 text-foreground">
      {/* Left side: Original Thread */}
      <div className="w-1/3 border-r border-white/10 p-6 flex flex-col bg-white/[0.02]">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4" /> Original Thread
        </h3>
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-none space-y-6">
          <div className="space-y-1">
            <h4 className="text-lg font-medium text-foreground">{subject}</h4>
            <p className="text-sm text-muted-foreground">From: {from}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{from}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {originalBody}
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Composer */}
      <div className="w-2/3 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Draft Reply
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Tone: Professional
            </span>
          </div>
        </div>

        {anyError && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex gap-2 items-center">
            <AlertCircle className="h-4 w-4" />
            <span>{getFriendlyErrorMessage(anyError)}</span>
          </div>
        )}
        <CanvasStatusBanner status={metadata.backendStatus} message={metadata.backendError} />
        {missingRecipient && (
          <div className="mb-4 text-sm text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex gap-2 items-center">
            <AlertCircle className="h-4 w-4" />
            <span>Add a recipient before saving this draft to Outlook.</span>
          </div>
        )}
        {sendDraft.isSuccess && (
          <div className="mb-4 text-sm text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex gap-2 items-center">
            <span>Email sent successfully.</span>
          </div>
        )}
        {createDraft.isSuccess && !sendDraft.isSuccess && (
          <div className="mb-4 text-sm text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex gap-2 items-center">
            <span>Draft saved to Outlook. Ready to send.</span>
          </div>
        )}

        {/* Text Editor */}
        <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-card overflow-hidden shadow-sm">
          {/* Toolbar */}
          <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 gap-4">
            <div className="flex gap-2">
              <span className="text-muted-foreground font-serif font-bold text-sm cursor-pointer hover:text-foreground">B</span>
              <span className="text-muted-foreground font-serif italic text-sm cursor-pointer hover:text-foreground">I</span>
              <span className="text-muted-foreground font-serif underline text-sm cursor-pointer hover:text-foreground">U</span>
            </div>
          </div>
          
          {/* Textarea */}
          <textarea 
            className="flex-1 w-full bg-transparent p-4 text-sm leading-relaxed resize-none focus:outline-none text-foreground"
            value={generateDraft.isPending ? "Generating draft..." : body}
            onChange={(e) => setDraftState({ itemId, body: e.target.value, outlookDraftId })}
            disabled={isWorking || sendDraft.isSuccess}
            placeholder="Type your reply here..."
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" disabled={isWorking} onClick={closeCanvas}>
            Discard
          </Button>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-white/10 bg-white/5 hover:bg-white/10"
              onClick={handleSaveDraft}
              disabled={isWorking || sendDraft.isSuccess || !body || missingRecipient}
            >
              <Save className="mr-2 h-4 w-4" /> 
              {createDraft.isPending ? "Saving..." : "Save as Draft"}
            </Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
              onClick={handleSend}
              disabled={isWorking || !outlookDraftId || sendDraft.isSuccess}
            >
              <Send className="mr-2 h-4 w-4" /> 
              {sendDraft.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function firstStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function senderLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const sender = value as { name?: unknown; email?: unknown };
    return String(sender.name || sender.email || "");
  }
  return "";
}

function senderEmail(value: unknown): string {
  if (typeof value === "string" && value.includes("@")) return value;
  if (value && typeof value === "object") {
    const sender = value as { email?: unknown; address?: unknown };
    return String(sender.email || sender.address || "");
  }
  return "";
}
