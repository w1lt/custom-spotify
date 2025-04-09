import { Skeleton } from "@/components/ui/skeleton";

export default function PlaylistCardSkeleton() {
  return (
    <div className="bg-card p-4 rounded-lg shadow animate-pulse">
      {/* Placeholder for image */}
      <Skeleton className="aspect-square mb-3 rounded w-full" />
      {/* Placeholder for title */}
      <Skeleton className="h-4 w-3/4 mb-2 rounded" />
      {/* Placeholder for owner */}
      <Skeleton className="h-3 w-1/2 mb-3 rounded" />
      {/* Placeholder for track count/badge */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-1/4 rounded" />
      </div>
    </div>
  );
}
