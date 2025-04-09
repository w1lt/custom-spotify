import { Skeleton } from "@/components/ui/skeleton";
import TrackListItemSkeleton from "./TrackListItemSkeleton";

interface PlaylistDetailSkeletonProps {
  trackCount?: number; // Optional: Number of track skeletons to show
}

export default function PlaylistDetailSkeleton({
  trackCount = 15, // Default to showing 15 track skeletons
}: PlaylistDetailSkeletonProps) {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="container mx-auto px-4 pt-8 pb-6 flex flex-col md:flex-row items-center gap-6">
        <Skeleton className="w-32 h-32 md:w-48 md:h-48 rounded flex-shrink-0" />
        <div className="flex flex-col gap-2 items-center md:items-start text-center md:text-left">
          <Skeleton className="h-4 w-24 mb-1 rounded" /> {/* Playlist type */}
          <Skeleton className="h-10 w-64 md:w-96 rounded" /> {/* Title */}
          <Skeleton className="h-5 w-48 mt-1 rounded" />{" "}
          {/* Description/Owner */}
          <Skeleton className="h-4 w-32 mt-1 rounded" />{" "}
          {/* Meta (likes/tracks/duration) */}
        </div>
      </div>

      {/* Track List Header Skeleton (Optional but good for consistency) */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 mb-4">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-[auto,1fr,auto] md:grid-cols-[2rem,4fr,2fr,1fr,auto] gap-3 items-center p-1 px-2 md:px-4 border-b border-border text-muted-foreground text-sm">
            <span className="hidden md:inline-block text-right">#</span>
            <span className="md:hidden"></span> {/* Spacer for mobile */}
            <span>Title</span>
            <span className="hidden md:inline-block">Album</span>
            <span className="hidden md:inline-block justify-self-end pr-2">
              Duration
            </span>
            <span className="hidden md:inline-block"></span> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Track List Body Skeleton */}
      <div className="container mx-auto px-4 pb-8">
        <div className="space-y-1">
          {Array.from({ length: trackCount }).map((_, index) => (
            <TrackListItemSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
