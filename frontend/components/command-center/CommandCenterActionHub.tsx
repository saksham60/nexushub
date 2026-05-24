"use client";

import { useState, type ChangeEvent } from "react";
import { ArrowRight, FileText, FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AgentChatResponse } from "@/features/agent/types";
import { useUploadDocument } from "@/features/uploads/hooks";
import { useCreateReport } from "@/features/reports/hooks";
import { ReportResponse } from "@/features/reports/types";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

const recommendations = [
  { title: "Draft urgent replies", action: "Generate", prompt: "Draft urgent replies" },
  { title: "Prepare next meeting", action: "Prepare", prompt: "Prepare my next meeting" },
  { title: "Summarize recent files", action: "Summarize", prompt: "Summarize recent files" },
];

export function CommandCenterActionHub({
  onRunPrompt,
}: {
  onRunPrompt?: (prompt: string) => Promise<AgentChatResponse | void> | AgentChatResponse | void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const uploadDocument = useUploadDocument();
  const createReport = useCreateReport();
  const isGenerating = uploadDocument.isPending || createReport.isPending;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setReportError(null);
    }
  };

  const handleGenerate = async () => {
    setReportError(null);
    if (!selectedFile) {
      setReportError("Upload a PDF, DOCX, XLSX, CSV, or TXT file first.");
      return;
    }

    try {
      const uploaded = await uploadDocument.mutateAsync(selectedFile);
      const generated = await createReport.mutateAsync({
        documentId: uploaded.documentId,
        reportTitle: reportTitle.trim() || `${uploaded.filename} summary`,
        instructions: instructions.trim(),
        format: "executive_summary",
      });
      setReport(generated);
      setSourceFilename(uploaded.filename);
    } catch (error) {
      setReportError(getFriendlyErrorMessage(error));
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-zinc-900">Next Moves</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {recommendations.map((rec) => (
              <button
                key={rec.prompt}
                type="button"
                onClick={() => void onRunPrompt?.(rec.prompt)}
                className="group flex min-h-24 flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
              >
                <span className="text-sm font-medium leading-5 text-zinc-900">{rec.title}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                  {rec.action}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50/70 p-5 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-zinc-900">Create Report</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1">
            <Input
              placeholder="Report title"
              className="bg-white"
              value={reportTitle}
              onChange={(event) => setReportTitle(event.target.value)}
              disabled={isGenerating}
            />
            <button
              type="button"
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white px-3 text-sm text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => document.getElementById("action-hub-file-upload")?.click()}
              disabled={isGenerating}
            >
              <Input
                type="file"
                id="action-hub-file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.docx,.xlsx,.csv,.txt"
              />
              <FileUp className="h-4 w-4" />
              <span className="max-w-48 truncate">
                {selectedFile ? selectedFile.name : "Upload file"}
              </span>
            </button>
            <Textarea
              placeholder="Instructions"
              className="min-h-20 resize-none bg-white sm:col-span-2 lg:col-span-1"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              disabled={isGenerating}
            />
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700 sm:col-span-2 lg:col-span-1"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
          </div>

          {reportError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {reportError}
            </div>
          )}

          {report && (
            <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-sm">
              <p className="mb-1 text-xs text-zinc-500">{sourceFilename}</p>
              <h3 className="font-semibold text-zinc-900">{report.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-zinc-700">{report.report}</p>
              {report.sections.length > 0 && (
                <div className="mt-3 space-y-3">
                  {report.sections.map((section, index) => (
                    <section key={`${section.heading}-${index}`}>
                      <h4 className="font-medium text-zinc-900">{section.heading}</h4>
                      <p className="mt-1 whitespace-pre-wrap text-zinc-700">{section.content}</p>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
