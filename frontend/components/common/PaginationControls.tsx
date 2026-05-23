import { Button } from "@/components/ui/button";
import { PageInfo } from "@/features/approvals/types"; // using the generic PageInfo from approvals for now
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationControls({ 
  pageInfo, 
  onNext, 
  onPrev 
}: { 
  pageInfo: PageInfo; 
  onNext: (cursor: string) => void; 
  onPrev?: (cursor: string) => void;
}) {
  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      {onPrev && pageInfo.prev_cursor && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPrev(pageInfo.prev_cursor!)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={!pageInfo.has_more || !pageInfo.next_cursor}
        onClick={() => {
          if (pageInfo.next_cursor) {
            onNext(pageInfo.next_cursor);
          }
        }}
      >
        Next
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
