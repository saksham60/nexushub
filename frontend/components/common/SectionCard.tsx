import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({ title, description, children, action, className, contentClassName }: { 
  title: string; 
  description?: string; 
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("border-zinc-200 shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-zinc-100">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className={cn("pt-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
