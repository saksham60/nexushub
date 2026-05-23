"use client";

import { Badge } from "@/components/ui/badge";

export function SuggestedPromptChips({ prompts, onSelect }: { prompts: string[]; onSelect: (prompt: string) => void }) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <span className="text-sm text-zinc-500 self-center mr-2">Suggested:</span>
      {prompts.map((prompt, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="cursor-pointer hover:bg-zinc-200 transition-colors bg-zinc-100 text-zinc-700 font-normal px-3 py-1"
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </Badge>
      ))}
    </div>
  );
}
