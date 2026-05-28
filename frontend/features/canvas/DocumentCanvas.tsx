"use client";

import { useCanvas } from "./CanvasContext";
import { AlertCircle, FileText, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanvasStatusBanner } from "./CanvasStatusBanner";
import { useAnalyzeDocument } from "@/features/reports/hooks";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export function DocumentCanvas() {
  const { actionItem, canvasPayload } = useCanvas();
  const analyzeDocument = useAnalyzeDocument();

  const metadata = {
    ...((actionItem?.metadata || {}) as Record<string, any>),
    ...((canvasPayload || {}) as Record<string, any>),
  };
  const title = metadata.name || metadata.title || actionItem?.title || "Unknown Document";
  const webUrl = (metadata.webUrl || metadata.web_url) as string | undefined;
  const documentId = String(metadata.documentId || metadata.document_id || metadata.id || "");
  const analysis = analyzeDocument.data;

  return (
    <div className="flex h-full bg-background/50 text-foreground">
      {/* Left side: Document Preview */}
      <div className="w-1/2 border-r border-white/10 flex flex-col bg-white/[0.02]">
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate pr-4">
            <FileText className="h-5 w-5 text-blue-400 shrink-0" />
            <span className="font-medium text-sm truncate">{title}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
            disabled={!webUrl}
            onClick={() => {
              if (webUrl) window.open(webUrl, "_blank");
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open Source
          </Button>
        </div>
        <div className="flex-1 p-8 flex items-center justify-center bg-black/20">
          {/* Mock Document Render */}
          <div className="w-full max-w-md aspect-[1/1.4] bg-white rounded shadow-2xl flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-4 bg-blue-600/20" />
            <FileText className="h-16 w-16 text-zinc-300 mb-4" />
            <h3 className="text-zinc-800 font-serif text-xl mb-2 line-clamp-2">{title}</h3>
            <div className="w-3/4 h-2 bg-zinc-100 rounded mb-2" />
            <div className="w-full h-2 bg-zinc-100 rounded mb-2" />
            <div className="w-5/6 h-2 bg-zinc-100 rounded mb-6" />
            
            <div className="w-full space-y-2 mt-auto">
              <div className="w-full h-2 bg-zinc-100 rounded" />
              <div className="w-full h-2 bg-zinc-100 rounded" />
              <div className="w-2/3 h-2 bg-zinc-100 rounded" />
            </div>
            <p className="text-xs text-zinc-400 mt-8 font-medium">DOCUMENT PREVIEW</p>
          </div>
        </div>
      </div>

      {/* Right side: Intelligence */}
      <div className="w-1/2 p-6 flex flex-col h-full overflow-y-auto scrollbar-none">
        <h2 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Document Intelligence
        </h2>
        <CanvasStatusBanner status={metadata.backendStatus} message={metadata.backendError} />
        {analyzeDocument.error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{getFriendlyErrorMessage(analyzeDocument.error)}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* AI Summary */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Summary</h3>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {analysis?.summary || metadata.summary || actionItem?.description || "No detailed summary available for this document."}
            </div>
          </section>
          {analysis && hasAnalysisDetails(analysis) && (
            <section className="grid gap-4 md:grid-cols-3">
              <InsightList title="Key Points" items={analysis.keyPoints} />
              <InsightList title="Risks" items={analysis.risks} />
              <InsightList title="Actions" items={analysis.actionItems} />
            </section>
          )}
        </div>

        {/* Action Input */}
        <div className="mt-auto pt-6">
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!documentId || analyzeDocument.isPending}
            onClick={() =>
              analyzeDocument.mutate({
                documentId,
                analysisType: "executive_brief",
                instructions: String(metadata.analysisGoal || metadata.prompt || ""),
              })
            }
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {analyzeDocument.isPending ? "Generating brief..." : "Generate Backend Brief"}
          </Button>
          {!documentId && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Backend analysis needs an uploaded document id. Connected OneDrive previews can still be reviewed here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function hasAnalysisDetails(
  analysis:
    | {
        keyPoints?: string[];
        risks?: string[];
        actionItems?: string[];
      }
    | undefined,
) {
  return Boolean(
    analysis?.keyPoints?.length ||
      analysis?.risks?.length ||
      analysis?.actionItems?.length,
  );
}

function InsightList({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {items?.length ? (
        <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
          {items.slice(0, 5).map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No items returned.</p>
      )}
    </div>
  );
}
