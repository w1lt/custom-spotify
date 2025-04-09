"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Volume2,
  MonitorSpeaker,
  Smartphone,
  Speaker,
  Loader2,
  Laptop,
  Podcast,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePlayer } from "@/context/PlayerContext";
import type { Spotify } from "@/types/spotify-sdk";

// Helper Functions (Keep or move to utils)
function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

function getDeviceIcon(
  deviceType: string | undefined,
  isActive?: boolean,
  isSdkDevice?: boolean
): React.ReactElement {
  if (isSdkDevice && isActive)
    return <Laptop size={18} className="text-green-500" />;
  switch (deviceType?.toLowerCase()) {
    case "computer":
      return <MonitorSpeaker size={18} />;
    case "smartphone":
      return <Smartphone size={18} />;
    case "speaker":
      return <Speaker size={18} />;
    default:
      return <Speaker size={18} />;
  }
}

export default function PlayerFooter() {
  const { playerState, controls, mutatePlayback, mutateDevices } = usePlayer();
  const {
    isSdkReady,
    sdkDeviceId,
    sdkPlayerState,
    globalPlaybackState,
    devices,
    isTransferring,
    playbackError,
    devicesError,
  } = playerState;

  // Determine if the SDK is the *globally* active Spotify device
  const sdkIsActiveGlobally = Boolean(
    globalPlaybackState?.device?.id &&
      globalPlaybackState?.device?.id === sdkDeviceId
  );

  // --- Determine Effective State (Prioritize SDK if ready and active) ---
  // Use SDK state if it's ready AND it's the globally active device OR if global state is missing
  const useSdkState =
    isSdkReady &&
    sdkPlayerState &&
    (sdkIsActiveGlobally || !globalPlaybackState);

  const effectiveTrack = useSdkState
    ? sdkPlayerState?.track_window?.current_track
    : globalPlaybackState?.item;
  const effectiveIsPlaying = useSdkState
    ? !sdkPlayerState?.paused
    : globalPlaybackState?.is_playing ?? false;
  const effectiveDurationMs = useSdkState
    ? sdkPlayerState?.duration ?? 0
    : globalPlaybackState?.item?.duration_ms ?? 0;

  // --- Progress Calculation ---
  const [liveProgressMs, setLiveProgressMs] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (useSdkState && effectiveIsPlaying) {
      // Use SDK's initial position and update locally
      setLiveProgressMs(sdkPlayerState?.position ?? 0);
      interval = setInterval(() => {
        setLiveProgressMs((prev) => {
          const next = prev + 1000;
          // Prevent exceeding duration
          return effectiveDurationMs > 0
            ? Math.min(next, effectiveDurationMs)
            : next;
        });
      }, 1000);
    } else if (globalPlaybackState?.is_playing) {
      // Use global state's progress and estimate locally between polls
      const initialProgress = globalPlaybackState.progress_ms ?? 0;
      const timestamp = globalPlaybackState.timestamp ?? Date.now();
      setLiveProgressMs(initialProgress + (Date.now() - timestamp)); // Estimate current progress

      interval = setInterval(() => {
        setLiveProgressMs((prev) => {
          const estimatedTimestamp =
            globalPlaybackState.timestamp ?? Date.now(); // Use latest timestamp if available
          const estimatedInitial = globalPlaybackState.progress_ms ?? prev; // Use latest progress if available, else continue from prev
          const next = estimatedInitial + (Date.now() - estimatedTimestamp);
          // Prevent exceeding duration
          return effectiveDurationMs > 0
            ? Math.min(next, effectiveDurationMs)
            : next;
        });
      }, 1000);
    } else {
      // Use static progress if paused
      setLiveProgressMs(
        useSdkState
          ? sdkPlayerState?.position ?? 0
          : globalPlaybackState?.progress_ms ?? 0
      );
    }

    return () => {
      if (interval) clearInterval(interval);
    };
    // Re-run effect when the primary state source or playing status changes
  }, [
    useSdkState,
    effectiveIsPlaying,
    sdkPlayerState?.position,
    globalPlaybackState?.progress_ms,
    globalPlaybackState?.timestamp,
    effectiveDurationMs,
  ]);

  const effectiveProgressMs = liveProgressMs;
  const effectiveProgressPercent =
    effectiveDurationMs > 0
      ? (effectiveProgressMs / effectiveDurationMs) * 100
      : 0;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isArtEnlarged, setIsArtEnlarged] = useState(false);
  const progressContainerRef = useRef<HTMLDivElement>(null);

  const currentDevice = globalPlaybackState?.device;
  const displayState = sdkIsActiveGlobally ? sdkPlayerState : null;
  const fallbackState = globalPlaybackState;

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      !progressContainerRef.current ||
      effectiveDurationMs <= 0 ||
      !sdkIsActiveGlobally
    )
      return;

    const rect = progressContainerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    if (width === 0) return; // Avoid division by zero
    const percentage = clickX / width;
    const seekPositionMs = Math.max(
      0,
      Math.floor(percentage * effectiveDurationMs)
    );

    controls.seek(seekPositionMs);
  };

  const handleTransferClick = (deviceId: string) => {
    controls.transferPlayback(deviceId).then(() => {
      setPopoverOpen(false);
    });
  };

  if (playbackError) {
    return (
      <footer className="fixed bottom-4 left-4 right-4 z-50 h-16 md:h-20 bg-neutral-900/80 backdrop-blur-lg rounded-xl shadow-2xl text-white grid grid-cols-3 items-center px-4 sm:px-6 md:px-8 gap-4">
        <p className="text-red-500">Error loading player state</p>
      </footer>
    );
  }

  if (globalPlaybackState === undefined && !sdkPlayerState) {
    return (
      <footer className="fixed bottom-4 left-4 right-4 z-50 h-16 md:h-20 bg-neutral-900/80 backdrop-blur-lg rounded-xl shadow-2xl text-white grid grid-cols-3 items-center px-4 sm:px-6 md:px-8 gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </footer>
    );
  }

  if (
    (!globalPlaybackState || !globalPlaybackState.item) &&
    !sdkPlayerState?.track_window?.current_track
  ) {
    return (
      <footer className="fixed bottom-4 left-4 right-4 z-50 h-16 md:h-20 bg-neutral-900/80 backdrop-blur-lg rounded-xl shadow-2xl text-white grid grid-cols-3 items-center px-4 sm:px-6 md:px-8 gap-4">
        <p className="text-gray-400 mr-4">Nothing currently playing</p>
      </footer>
    );
  }

  return (
    <Dialog open={isArtEnlarged} onOpenChange={setIsArtEnlarged}>
      <footer className="fixed bottom-4 left-4 right-4 z-50 h-16 md:h-20 bg-neutral-900/80 backdrop-blur-lg rounded-xl shadow-2xl text-white grid grid-cols-3 items-center px-4 sm:px-6 md:px-8 gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          {effectiveTrack &&
            "album" in effectiveTrack &&
            effectiveTrack.album?.images?.[0]?.url && (
              <DialogTrigger asChild>
                <button className="flex-shrink-0 focus:outline-none rounded">
                  <Image
                    src={effectiveTrack.album.images[0].url}
                    alt={effectiveTrack.album.name ?? "Album art"}
                    width={64}
                    height={64}
                    className="w-14 h-14 md:w-16 md:h-16 rounded hidden sm:block cursor-pointer hover:scale-105 transition-transform"
                    unoptimized
                  />
                </button>
              </DialogTrigger>
            )}
          {effectiveTrack && "show" in effectiveTrack && (
            <div className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded bg-muted hidden sm:flex items-center justify-center">
              <Podcast size={32} className="text-muted-foreground" />
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate hover:underline cursor-pointer">
              {effectiveTrack?.name ?? "--"}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {effectiveTrack && "artists" in effectiveTrack
                ? effectiveTrack.artists
                    ?.map((a: Spotify.Artist) => a.name)
                    .join(", ")
                : effectiveTrack && "show" in effectiveTrack
                ? effectiveTrack.show?.name
                : "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 sm:space-x-4 mb-1">
            <Button
              variant="ghost"
              size="icon"
              title="Previous"
              onClick={controls.previousTrack}
              disabled={!sdkIsActiveGlobally}
              className="text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack size={18} fill="currentColor" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title={effectiveIsPlaying ? "Pause" : "Play"}
              onClick={controls.togglePlay}
              disabled={!sdkIsActiveGlobally}
              className="bg-white text-black rounded-full w-8 h-8 flex items-center justify-center hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {effectiveIsPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" className="ml-[2px]" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Next"
              onClick={controls.nextTrack}
              disabled={!sdkIsActiveGlobally}
              className="text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward size={18} fill="currentColor" />
            </Button>
          </div>
          <div
            ref={progressContainerRef}
            onClick={handleProgressClick}
            className={`flex items-center w-full max-w-sm md:max-w-md space-x-2 group ${
              sdkIsActiveGlobally ? "cursor-pointer" : "cursor-default"
            }`}
            title={sdkIsActiveGlobally ? "Seek" : ""}
          >
            <span className="text-[11px] text-gray-400 w-9 text-right tabular-nums">
              {formatDuration(effectiveProgressMs)}
            </span>
            <Progress
              value={effectiveProgressPercent}
              key={`${effectiveTrack?.id}-${effectiveProgressMs}`}
              className="w-full h-1 bg-gray-700 [&>div]:bg-white group-hover:[&>div]:bg-green-500"
            />
            <span className="text-[11px] text-gray-400 w-9 text-left tabular-nums">
              {formatDuration(effectiveDurationMs)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 sm:space-x-3">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white data-[state=open]:text-green-500 cursor-pointer"
                title="Device"
                onClick={mutateDevices}
              >
                {getDeviceIcon(
                  currentDevice?.type,
                  currentDevice?.is_active,
                  sdkIsActiveGlobally
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0 mb-2" align="end">
              <Command>
                <CommandInput placeholder="Select device..." />
                <CommandList>
                  <CommandEmpty>
                    {devicesError ? (
                      <span className="text-red-500 text-xs px-4 py-2">
                        Error
                      </span>
                    ) : devices === undefined ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "No devices"
                    )}
                  </CommandEmpty>
                  {playerState.isSdkReady && sdkDeviceId && (
                    <CommandGroup heading="This Browser">
                      <CommandItem
                        key={sdkDeviceId}
                        onSelect={() => handleTransferClick(sdkDeviceId)}
                        disabled={isTransferring || sdkIsActiveGlobally}
                        className={`cursor-pointer ${
                          sdkIsActiveGlobally ? "opacity-70" : ""
                        }`}
                      >
                        <Laptop
                          size={18}
                          className={
                            sdkIsActiveGlobally ? "text-green-500" : ""
                          }
                        />
                        <span className="ml-2">Web Player</span>
                        {sdkIsActiveGlobally && (
                          <span className="text-xs ml-auto text-green-500">
                            Active
                          </span>
                        )}
                        {isTransferring && (
                          <Loader2 className="animate-spin ml-auto" />
                        )}
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {devices &&
                    devices.filter((d) => d.id !== sdkDeviceId).length > 0 && (
                      <CommandGroup heading="Other Devices">
                        {devices
                          .filter((d) => d.id !== sdkDeviceId)
                          .map((d) => (
                            <CommandItem
                              key={d.id}
                              onSelect={() => handleTransferClick(d.id!)}
                              disabled={isTransferring || d.is_active}
                              className={`cursor-pointer ${
                                d.is_active ? "opacity-70" : ""
                              }`}
                            >
                              {getDeviceIcon(d.type, d.is_active)}
                              <span className="ml-2">{d.name}</span>
                              {d.is_active && (
                                <span className="text-xs ml-auto text-green-500">
                                  Active
                                </span>
                              )}
                              {isTransferring && (
                                <Loader2 className="animate-spin ml-auto" />
                              )}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div className="flex items-center space-x-1 group">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 cursor-pointer"
              title="Volume"
            >
              <Volume2 size={20} />
            </Button>
            <div
              className="w-16 sm:w-20 h-1 bg-gray-600 rounded-full cursor-pointer"
              title="Volume"
            >
              <div
                className="bg-white h-1 rounded-full group-hover:bg-green-500"
                style={{ width: `${currentDevice?.volume_percent ?? 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </footer>

      <DialogContent
        className="max-w-md p-0 bg-transparent border-none shadow-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {effectiveTrack && "album" in effectiveTrack
            ? `Album Art: ${effectiveTrack.album.name ?? ""}`
            : effectiveTrack?.name ?? "Media Artwork"}
        </DialogTitle>
        {effectiveTrack &&
          "album" in effectiveTrack &&
          effectiveTrack.album?.images?.[0]?.url && (
            <Image
              src={effectiveTrack.album.images[0].url}
              alt={effectiveTrack.album.name ?? "Album art enlarged"}
              width={500}
              height={500}
              className="w-full h-auto rounded-lg"
              unoptimized
            />
          )}
        {effectiveTrack && "show" in effectiveTrack && (
          <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
            <Podcast size={128} className="text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
