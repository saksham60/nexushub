import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" | "executed" }) {
  const variantMap = {
    pending: "secondary",
    approved: "default", // or custom green
    rejected: "destructive",
    executed: "outline",
  } as const;

  return (
    <Badge variant={variantMap[status] || "secondary"} className="capitalize">
      {status}
    </Badge>
  );
}
