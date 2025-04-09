import { Skeleton } from "@/components/ui/skeleton";

export default function TrackListItemSkeleton() {
  return (
    <div className="grid grid-cols-[auto,1fr,auto] md:grid-cols-[2rem,4fr,2fr,1fr,auto] gap-3 items-center px-2 md:px-4 rounded-md group">
      {/* Mobile "button" placeholder */}
      <Skeleton className="md:hidden w-8 h-8 rounded" />

      {/* Desktop Index/Button placeholder */}
      <div className="text-right hidden md:flex justify-end items-center h-full w-full">
        <Skeleton className="w-8 h-8 rounded" />
      </div>

      {/* Track Info placeholder */}
      <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
        <Skeleton className="w-8 h-8 rounded flex-shrink-0" />
        <div className="flex-grow overflow-hidden space-y-1.5">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>

      {/* Album placeholder */}
      <div className="hidden md:block">
        <Skeleton className="h-4 w-5/6 rounded" />
      </div>

      {/* Duration placeholder */}
      <div className="justify-self-end hidden md:block">
        <Skeleton className="h-4 w-10 rounded" />
      </div>

      {/* Empty col placeholder */}
      <div className="hidden md:block"></div>
    </div>
  );
}
