import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({ text = "Loading...", className }: { text?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      <p className="mt-4 text-sm text-zinc-500">{text}</p>
    </div>
  );
}
