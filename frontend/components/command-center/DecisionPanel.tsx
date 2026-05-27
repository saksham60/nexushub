"use client";

import { useMemo, useState } from "react";
import { ActionItem } from "@/features/command-center/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, ExternalLink, Mail, Sparkles, Scale } from "lucide-react";
import { useApproveAction } from "@/features/approvals/hooks";
import {
  useCreateOutlookDraft,
  useGenerateDraftReply,
  useSendOutlookDraft,
} from "@/features/mail/hooks";
import { DraftCreateResponse, DraftReplyResponse, DraftSendResponse } from "@/features/mail/types";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/features/canvas/CanvasContext";

interface DecisionPanelProps {
  item: ActionItem | null;
}

export function DecisionPanel({ item }: DecisionPanelProps) {
  const { openCanvas } = useCanvas();
  const approveAction = useApproveAction();
  const generateDraftReply = useGenerateDraftReply();
  const createOutlookDraft = useCreateOutlookDraft({ toastOnSuccess: false, toastOnError: false });
  const sendOutlookDraft = useSendOutlookDraft({ toastOnSuccess: false, toastOnError: false });
  const [mailActionMode, setMailActionMode] = useState<"save" | "send" | null>(null);
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
    const replyTo = Array.isArray(metadata.replyTo) ? metadata.replyTo.map(String).filter(Boolean) : [];
    const email = replyTo[0] || metadata.from;
    return email && String(email).includes("@") ? [String(email)] : [];
  }, [item, metadata.from, metadata.replyTo]);

  if (!item) {
    return (
      <div className="flex flex-col gap-4">
        {/* Mock Decision Cards from Screenshot */}
        <div className="rounded-xl border border-white/5 bg-card/50 p-4 hover:bg-card transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Needs Approval</span>
            <span className="text-xs text-muted-foreground">Finance Team</span>
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Q3 Budget Proposal</h3>
          <p className="text-xs text-muted-foreground mb-4">Total requested: $245,000. Changes require your sign-off by EOD.</p>
          <div className="flex gap-2">
            <Button size="sm" className="w-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30"><Check className="h-3 w-3 mr-1"/> Approve</Button>
            <Button size="sm" variant="outline" className="w-full bg-transparent border-white/10 text-muted-foreground" onClick={() => openCanvas("document", { id: "budget", type: "document", title: "Q3 Budget Proposal", priority: "high", status: "pending", description: "Total requested: $245,000.", source: "NexusHub" })}>Review</Button>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-card/50 p-4 hover:bg-card transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Needs Approval</span>
            <span className="text-xs text-muted-foreground">Marketing</span>
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Marketing Campaign Launch</h3>
          <p className="text-xs text-muted-foreground mb-4">Final creative assets for 'NexusHub Launch'. Ready for execution.</p>
          <div className="flex gap-2">
            <Button size="sm" className="w-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30"><Check className="h-3 w-3 mr-1"/> Approve</Button>
            <Button size="sm" variant="outline" className="w-full bg-transparent border-white/10 text-muted-foreground" onClick={() => openCanvas("document", { id: "marketing", type: "document", title: "Marketing Campaign Launch", priority: "high", status: "pending", description: "Final creative assets.", source: "NexusHub" })}>Review</Button>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-card/50 p-4 hover:bg-card transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Needs Approval</span>
            <span className="text-xs text-muted-foreground">Legal</span>
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Vendor Contract Renewal</h3>
          <p className="text-xs text-muted-foreground mb-4">Contoso annual renewal. 5% price increase. Standard terms.</p>
          <div className="flex gap-2">
            <Button size="sm" className="w-full bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30"><Check className="h-3 w-3 mr-1"/> Approve</Button>
            <Button size="sm" variant="outline" className="w-full bg-transparent border-white/10 text-muted-foreground" onClick={() => openCanvas("document", { id: "vendor", type: "document", title: "Vendor Contract Renewal", priority: "high", status: "pending", description: "Contoso annual renewal.", source: "NexusHub" })}>Review</Button>
          </div>
        </div>
      </div>
    );
  }

  // Implementation of standard selected item logic...
  const generateDraft = async () => { /* ... */ };
  const saveDraftToOutlook = async () => { /* ... */ };
  const sendEmail = async () => { /* ... */ };
  const approveExistingApproval = async () => { /* ... */ };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/50 shadow-2xl backdrop-blur-sm">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-white/10">
            {item.type}
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
            item.priority === "high" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-white/5 text-muted-foreground border-white/10"
          )}>
            {item.priority}
          </span>
        </div>
        <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
        {item.person && <p className="text-xs text-muted-foreground mt-1">From: {item.person}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-none space-y-4">
        {draftError && <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{draftError}</div>}
        
        <section className="bg-white/5 rounded-xl border border-white/10 p-4">
          <h4 className="mb-2 text-xs font-semibold text-primary flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> AI Summary
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.description || "NexusHub selected this item because it needs your attention."}
          </p>
        </section>

        {/* Action button */}
        <Button 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(139,92,246,0.3)] h-12 rounded-xl text-base" 
          onClick={() => {
            if (item.type === "email") openCanvas("email", item);
            else if (item.type === "calendar") openCanvas("meeting", item);
            else if (item.type === "document") openCanvas("document", item);
            else openCanvas("document", item); // Fallback for approvals/teams
          }}
        >
          <Scale className="mr-2 h-5 w-5" />
          Take Action
        </Button>
      </div>
    </div>
  );
}
