"use client";

import { useState } from "react";
import { ArrowRight, FileText, FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AgentChatResponse } from "@/features/agent/types";

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleGenerate = () => {
    toast.success("Report generation started.");
    setSelectedFile(null);
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
            <Input placeholder="Report title" className="bg-white" />
            <button
              type="button"
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white px-3 text-sm text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => document.getElementById("action-hub-file-upload")?.click()}
            >
              <Input
                type="file"
                id="action-hub-file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.docx,.xlsx,.csv"
              />
              <FileUp className="h-4 w-4" />
              <span className="max-w-48 truncate">
                {selectedFile ? selectedFile.name : "Upload file"}
              </span>
            </button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700 sm:col-span-2 lg:col-span-1"
              onClick={handleGenerate}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
