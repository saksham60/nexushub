import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { 
  icon?: ReactNode; 
  title: string; 
  description?: string; 
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-zinc-300", className)}>
      {icon && <div className="mb-4 text-zinc-400">{icon}</div>}
      <h3 className="text-lg font-medium text-zinc-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-zinc-500 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
