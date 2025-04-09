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
  Volume1,
  Volume,
  VolumeX,
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
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/utils";
import NowPlayingScreen from "./NowPlayingScreen";

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
    localProgress,
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
  const effectiveTrackUri = effectiveTrack?.uri;

  // --- Use localProgress from context rather than calculating our own ---
  // This ensures consistent progress display across components
  const effectiveProgressMs =
    localProgress ??
    (useSdkState
      ? sdkPlayerState?.position ?? 0
      : globalPlaybackState?.progress_ms ?? 0);

  const effectiveProgressPercent =
    effectiveDurationMs > 0
      ? (effectiveProgressMs / effectiveDurationMs) * 100
      : 0;

  // --- Component State (Hooks must be called before conditional returns) ---
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isArtEnlarged, setIsArtEnlarged] = useState(false);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const [volumePopoverOpen, setVolumePopoverOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);

  // --- Check if anything is playable ---
  if (!effectiveTrack) {
    // Render nothing or a minimal placeholder if nothing is loaded
    return null; // Don't show the footer
  }

  // Now it's safe to use component state and refs
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

    event.stopPropagation();

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
    <>
      <footer
        className="fixed bottom-4 left-4 right-4 z-50 h-16 md:h-20 bg-neutral-900/80 backdrop-blur-lg rounded-xl shadow-2xl text-white flex items-center justify-between md:grid md:grid-cols-3 px-4 sm:px-6 md:px-8 gap-4 cursor-pointer md:cursor-default md:pointer-events-none"
        onClick={() => setIsNowPlayingOpen(true)}
      >
        <div className="flex items-center space-x-3 min-w-0 md:pointer-events-auto">
          {effectiveTrack &&
            "album" in effectiveTrack &&
            effectiveTrack.album?.images?.[0]?.url && (
              <Image
                src={effectiveTrack.album.images[0].url}
                alt={effectiveTrack.album.name ?? "Album art"}
                width={48}
                height={48}
                className="flex-shrink-0 w-12 h-12 rounded cursor-pointer hover:scale-105 transition-transform md:w-16 md:h-16"
                unoptimized
              />
            )}
          {effectiveTrack && "show" in effectiveTrack && (
            <div className="flex-shrink-0 w-12 h-12 rounded bg-muted flex items-center justify-center md:w-16 md:h-16">
              <Podcast size={24} className="text-muted-foreground md:size-32" />
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

        <div className="hidden md:flex flex-col items-center md:pointer-events-auto">
          <div className="flex items-center space-x-2 sm:space-x-4 mb-1">
            <Button
              variant="ghost"
              size="icon"
              title="Previous"
              onClick={(e) => {
                e.stopPropagation();
                controls.previousTrack();
              }}
              disabled={!sdkIsActiveGlobally}
              className="text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack size={18} fill="currentColor" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title={effectiveIsPlaying ? "Pause" : "Play"}
              onClick={(e) => {
                e.stopPropagation();
                controls.togglePlay();
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                controls.nextTrack();
              }}
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
              className="w-full h-1 bg-gray-700 [&>div]:bg-white group-hover:[&>div]:bg-green-500"
            />
            <span className="text-[11px] text-gray-400 w-9 text-left tabular-nums">
              {formatDuration(effectiveDurationMs)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 sm:space-x-3 md:pointer-events-auto">
          <div className="flex items-center space-x-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              title={effectiveIsPlaying ? "Pause" : "Play"}
              onClick={(e) => {
                e.stopPropagation();
                controls.togglePlay();
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                controls.nextTrack();
              }}
              disabled={!sdkIsActiveGlobally}
              className="text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward size={18} fill="currentColor" />
            </Button>
          </div>
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
            <Popover
              open={volumePopoverOpen}
              onOpenChange={setVolumePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white"
                  title="Volume"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(currentDevice?.volume_percent ?? 0) > 66 ? (
                    <Volume2 size={18} />
                  ) : (currentDevice?.volume_percent ?? 0) > 33 ? (
                    <Volume1 size={18} />
                  ) : (currentDevice?.volume_percent ?? 0) > 0 ? (
                    <Volume size={18} />
                  ) : (
                    <VolumeX size={18} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="center"
                className="w-auto p-2 mb-2 h-32"
              >
                <Slider
                  orientation="vertical"
                  defaultValue={[currentDevice?.volume_percent ?? 0]}
                  max={100}
                  step={1}
                  className="h-full data-[orientation=vertical]:w-2"
                  onValueCommit={(value: number[]) =>
                    controls.setVolume(value[0])
                  }
                />
              </PopoverContent>
            </Popover>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white data-[state=open]:text-green-500 cursor-pointer"
                  title="Device"
                  onClick={(e) => {
                    e.stopPropagation();
                    mutateDevices();
                  }}
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
                      Array.isArray(devices) &&
                      devices.filter((d) => d.id !== sdkDeviceId).length >
                        0 && (
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
          </div>
        </div>
      </footer>

      <NowPlayingScreen
        isOpen={isNowPlayingOpen}
        close={() => setIsNowPlayingOpen(false)}
      />
    </>
  );
}
