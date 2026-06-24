import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted flex items-center justify-center", className)} {...props}>
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
    </div>
  );
}

export { Skeleton };
