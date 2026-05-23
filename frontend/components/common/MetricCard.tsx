import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MetricCard({ title, value, description, icon, className }: { 
  title: string; 
  value: ReactNode; 
  description?: string; 
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-zinc-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">{title}</CardTitle>
        {icon && <div className="text-zinc-400">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-900">{value}</div>
        {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}
