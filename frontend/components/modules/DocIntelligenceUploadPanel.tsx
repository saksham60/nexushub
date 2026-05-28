"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadDocument } from "@/features/uploads/hooks";
import { UploadResponse } from "@/features/uploads/types";
import { useCanvas } from "@/features/canvas/CanvasContext";
import { ActionItem } from "@/features/command-center/types";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const ACCEPTED_DOCUMENT_TYPES = ".pdf,.docx,.pptx,.xlsx,.csv,.txt,.md,.html,.htm";

export function DocIntelligenceUploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastUpload, setLastUpload] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadDocument = useUploadDocument();
  const { openCanvas } = useCanvas();

  const isUploading = uploadDocument.isPending;

  const setPendingFile = (file: File) => {
    setSelectedFile(file);
    setLastUpload(null);
    setError(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setPendingFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) setPendingFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Choose a document first.");
      return;
    }
    setError(null);
    try {
      const uploaded = await uploadDocument.mutateAsync(selectedFile);
      setLastUpload(uploaded);
      openCanvas("document", actionItemFromUpload(uploaded), documentPayloadFromUpload(uploaded));
    } catch (caught) {
      setError(getFriendlyErrorMessage(caught));
    }
  };

  return (
    <section className="grid gap-4 rounded-2xl border border-white/10 bg-card/50 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Upload Document</h2>
            <p className="text-xs text-muted-foreground">PDF, Word, PowerPoint, Excel, CSV, TXT, Markdown, or HTML.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          disabled={isUploading}
          className={cn(
            "flex min-h-28 w-full items-center justify-center rounded-xl border border-dashed p-4 text-left transition-colors",
            isDragging
              ? "border-primary/60 bg-primary/10"
              : "border-white/15 bg-white/[0.03] hover:border-primary/40 hover:bg-white/[0.05]",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_DOCUMENT_TYPES}
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <div className="flex max-w-full items-center gap-3">
            <FileText className="h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {selectedFile ? selectedFile.name : "Drop a file here or browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedFile ? formatBytes(selectedFile.size) : "Upload opens the document in the intelligence canvas."}
              </p>
            </div>
          </div>
        </button>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lastUpload && !error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{lastUpload.filename} is ready for Doc Intelligence.</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 md:w-48">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isUploading || !selectedFile}
          onClick={handleUpload}
        >
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          {isUploading ? "Uploading..." : "Upload & Analyze"}
        </Button>
        {lastUpload && (
          <Button
            variant="outline"
            className="border-white/10 bg-white/5"
            onClick={() => openCanvas("document", actionItemFromUpload(lastUpload), documentPayloadFromUpload(lastUpload))}
          >
            Reopen Canvas
          </Button>
        )}
      </div>
    </section>
  );
}

function actionItemFromUpload(upload: UploadResponse): ActionItem {
  return {
    id: `uploaded-doc-${upload.documentId}`,
    type: "document",
    title: upload.filename,
    description: "Uploaded document ready for analysis.",
    source: "Upload",
    priority: "high",
    status: "new",
    primaryActionLabel: "Analyze",
    metadata: documentPayloadFromUpload(upload),
  };
}

function documentPayloadFromUpload(upload: UploadResponse): Record<string, unknown> {
  return {
    documentId: upload.documentId,
    id: upload.documentId,
    filename: upload.filename,
    name: upload.filename,
    contentType: upload.contentType,
    sizeBytes: upload.sizeBytes,
    createdAt: upload.createdAt,
    backendStatus: "ready",
  };
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
