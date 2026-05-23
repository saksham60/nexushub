import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({ title = "Something went wrong", message, onRetry, className }: { 
  title?: string; 
  message?: string; 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-lg border border-red-100", className)}>
      <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-red-800">{title}</h3>
      {message && <p className="mt-2 text-sm text-red-600 max-w-sm">{message}</p>}
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-4 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800">
          Try Again
        </Button>
      )}
    </div>
  );
}
