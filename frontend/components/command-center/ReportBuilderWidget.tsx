"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUp, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ReportBuilderWidget() {
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
    <Card className="p-5 border-zinc-200 shadow-sm bg-white">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-zinc-900">Create Report</h3>
      </div>
      
      <div className="space-y-3">
        <Input placeholder="Report title (e.g., Q3 Summary)" className="bg-zinc-50" />
        
        <div className="border-2 border-dashed border-zinc-200 rounded-lg p-4 text-center cursor-pointer hover:bg-zinc-50 transition-colors" onClick={() => document.getElementById('compact-file-upload')?.click()}>
          <Input 
            type="file" 
            id="compact-file-upload" 
            className="hidden" 
            onChange={handleFileChange}
            accept=".pdf,.docx,.xlsx,.csv"
          />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium">
              <FileText className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <FileUp className="h-6 w-6 text-zinc-400 mb-1" />
              <span className="text-sm text-zinc-500">Upload PDF, DOCX, XLSX</span>
            </div>
          )}
        </div>
        
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleGenerate}>
          Generate Report
        </Button>
      </div>
    </Card>
  );
}
