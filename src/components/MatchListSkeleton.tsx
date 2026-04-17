import { Skeleton } from "@/components/ui/skeleton";

export function MatchCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border">
      <Skeleton className="w-10 h-3" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-3 flex-1 max-w-[140px]" />
          <Skeleton className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-3 flex-1 max-w-[140px]" />
          <Skeleton className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export function LeagueGroupSkeleton() {
  return (
    <div className="mb-4 rounded-lg border border-border overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <Skeleton className="w-5 h-5 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
    </div>
  );
}

export function MatchListSkeleton({ groups = 3 }: { groups?: number }) {
  return (
    <div>
      {Array.from({ length: groups }).map((_, i) => (
        <LeagueGroupSkeleton key={i} />
      ))}
    </div>
  );
}
