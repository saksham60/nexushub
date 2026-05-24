"use client";

import { AgentCommandBar } from "@/components/agent/AgentCommandBar";
import { SuggestedPromptChips } from "@/components/agent/SuggestedPromptChips";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecentFile } from "@/features/docs/types";
import { useUploadDocument } from "@/features/uploads/hooks";
import { queryKeys } from "@/lib/query/queryKeys";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FileText, FileUp } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const reportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  prompt: z.string().min(10, "Please provide more details for the report"),
});

export default function DocsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uploadMutation = useUploadDocument();

  const reportForm = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { title: "", prompt: "" },
  });

  const { data: results } = useQuery<{ kind: string; items: RecentFile[]; summary?: string }>({
    queryKey: queryKeys.agent.result("docs_list_recent_files"),
    enabled: true,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File is too large. Max size is 25MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile, {
      onSuccess: () => setSelectedFile(null),
    });
  };

  const onReportSubmit = () => {
    toast.success("Report request queued for generation.");
    reportForm.reset();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Doc Insights"
        description="Upload documents or find recent files to generate insights and reports."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <SectionCard title="Ask NexusHub">
            <AgentCommandBar />
            <SuggestedPromptChips
              prompts={[
                "List my recent OneDrive files",
                "Summarize the Q2 report",
                "Find documents shared by Sarah",
              ]}
              onSelect={(prompt) => {
                const input = document.querySelector<HTMLInputElement>('input[name="command"]');
                if (input) input.value = prompt;
              }}
            />
          </SectionCard>

          <SectionCard title="Recent Files">
            {!results || !results.items || results.items.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-10 w-10 text-zinc-400" />}
                title="No recent files found"
                description="Use the command bar to list your recent files from OneDrive or SharePoint."
              />
            ) : (
              <div className="space-y-3">
                {results.items.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{file.name}</p>
                        <p className="text-xs text-zinc-500">
                          {file.source || "onedrive"} - {Math.round((file.size_bytes || 0) / 1000)} KB
                        </p>
                      </div>
                    </div>
                    {file.web_url && (
                      <a
                        href={file.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline shrink-0 ml-4"
                      >
                        Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-8">
          <SectionCard title="Upload Document">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 text-center">
                <FileUp className="mx-auto h-8 w-8 text-zinc-400 mb-3" />
                <p className="text-sm text-zinc-600 mb-2">Select a PDF, DOCX, XLSX, or CSV file</p>
                <p className="text-xs text-zinc-500 mb-4">Max size: 25 MB</p>
                <Input
                  type="file"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.xlsx,.csv"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  {selectedFile ? "Change File" : "Browse Files"}
                </Button>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-sm text-blue-900 truncate font-medium">{selectedFile.name}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="bg-blue-600 text-white shrink-0 ml-2"
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Report Builder">
            <form onSubmit={reportForm.handleSubmit(onReportSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  placeholder="E.g. Q3 Performance Summary"
                  {...reportForm.register("title")}
                />
                {reportForm.formState.errors.title && (
                  <p className="text-sm text-red-500">{reportForm.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Instructions</Label>
                <Textarea
                  id="prompt"
                  placeholder="What should NexusHub analyze or summarize in this report?"
                  className="resize-none min-h-[100px]"
                  {...reportForm.register("prompt")}
                />
                {reportForm.formState.errors.prompt && (
                  <p className="text-sm text-red-500">{reportForm.formState.errors.prompt.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">Generate Report</Button>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
