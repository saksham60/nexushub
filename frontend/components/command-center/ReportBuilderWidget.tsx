"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUp, FileText } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { useUploadDocument } from "@/features/uploads/hooks";
import { useCreateReport } from "@/features/reports/hooks";
import { ReportResponse } from "@/features/reports/types";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export function ReportBuilderWidget() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadDocument = useUploadDocument();
  const createReport = useCreateReport();
  const isGenerating = uploadDocument.isPending || createReport.isPending;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    if (!selectedFile) {
      setError("Upload a PDF, DOCX, XLSX, CSV, or TXT file first.");
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
    } catch (caught) {
      setError(getFriendlyErrorMessage(caught));
    }
  };

  return (
    <Card className="p-5 border-zinc-200 shadow-sm bg-white">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-zinc-900">Create Report</h3>
      </div>
      
      <div className="space-y-3">
        <Input
          placeholder="Report title (e.g., Q3 Summary)"
          className="bg-zinc-50"
          value={reportTitle}
          onChange={(event) => setReportTitle(event.target.value)}
          disabled={isGenerating}
        />
        
        <div className="border-2 border-dashed border-zinc-200 rounded-lg p-4 text-center cursor-pointer hover:bg-zinc-50 transition-colors" onClick={() => document.getElementById('compact-file-upload')?.click()}>
          <Input 
            type="file" 
            id="compact-file-upload" 
            className="hidden" 
            onChange={handleFileChange}
            accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.md,.html,.htm"
            disabled={isGenerating}
          />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium">
              <FileText className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <FileUp className="h-6 w-6 text-zinc-400 mb-1" />
              <span className="text-sm text-zinc-500">Upload PDF, DOCX, PPTX, XLSX</span>
            </div>
          )}
        </div>

        <Textarea
          placeholder="Instructions"
          className="min-h-20 resize-none bg-zinc-50"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          disabled={isGenerating}
        />
        
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Report"}
        </Button>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {report && (
          <div className="max-h-72 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <p className="mb-1 text-xs text-zinc-500">{sourceFilename}</p>
            <p className="mb-2 text-xs text-zinc-500">
              {report.sourceStats?.charactersExtracted ?? 0} chars extracted
              {report.sourceStats?.parser ? ` via ${report.sourceStats.parser}` : ""}
              {" - "}
              LLM {report.llmStatus}
              {" - "}
              {new Date(report.createdAt).toLocaleString()}
            </p>
            <h4 className="font-semibold text-zinc-900">{report.title}</h4>
            <p className="mt-2 whitespace-pre-wrap text-zinc-700">{report.report}</p>
            {report.sections.length > 0 && (
              <div className="mt-3 space-y-3">
                {report.sections.map((section, index) => (
                  <section key={`${section.heading}-${index}`}>
                    <h5 className="font-medium text-zinc-900">{section.heading}</h5>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-700">{section.content}</p>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
