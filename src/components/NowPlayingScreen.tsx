"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Podcast,
  Volume2, // Assuming we might want volume control here later
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; // <-- Add this
import { formatDuration } from "@/lib/utils"; // Assuming you have this helper
import type { Spotify } from "@/types/spotify-sdk";

interface NowPlayingScreenProps {
  isOpen: boolean;
  close: () => void;
}

export default function NowPlayingScreen({
  isOpen,
  close,
}: NowPlayingScreenProps) {
  const { playerState, controls } = usePlayer();
  const {
    isSdkReady,
    sdkDeviceId,
    sdkPlayerState,
    globalPlaybackState,
    localProgress,
  } = playerState;

  // Determine effective state (copied logic from PlayerFooter for consistency)
  const sdkIsActiveGlobally = Boolean(
    globalPlaybackState?.device?.id &&
      globalPlaybackState?.device?.id === sdkDeviceId
  );
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

  // Use localProgress from context rather than calculating our own
  const effectiveProgressMs =
    localProgress ??
    (useSdkState
      ? sdkPlayerState?.position ?? 0
      : globalPlaybackState?.progress_ms ?? 0);

  // ... effective state logic ...
  const effectiveTrackUri = effectiveTrack?.uri;

  // We can remove the custom progress tracking since we now use the shared localProgress from context
  const progressContainerRef = useRef<HTMLDivElement>(null); // <-- Keep this for Progress container

  // Calculate progress percentage for Progress component
  const effectiveProgressPercent =
    effectiveDurationMs > 0
      ? (effectiveProgressMs / effectiveDurationMs) * 100
      : 0;

  // Add handleProgressClick logic for seeking
  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      !progressContainerRef.current ||
      effectiveDurationMs <= 0 ||
      !sdkIsActiveGlobally
    )
      return;

    // No need for stopPropagation here as it's the main screen
    const rect = progressContainerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    if (width === 0) return; // Avoid division by zero
    const percentage = clickX / width;
    const seekPositionMs = Math.max(
      0,
      Math.floor(percentage * effectiveDurationMs)
    );

    console.log(
      `[NowPlayingScreen] handleProgressClick seeking to ${seekPositionMs}ms (${(
        percentage * 100
      ).toFixed(1)}%)`
    );
    controls.seek(seekPositionMs);
  };

  // Use type guards for accessing track/show specific properties
  const albumArtUrl =
    effectiveTrack && "album" in effectiveTrack
      ? effectiveTrack.album?.images?.[0]?.url
      : null;
  const showArtUrl =
    effectiveTrack && "show" in effectiveTrack
      ? effectiveTrack.show?.images?.[0]?.url
      : null;
  const albumName =
    effectiveTrack && "album" in effectiveTrack
      ? effectiveTrack.album?.name
      : null;
  const showName =
    effectiveTrack && "show" in effectiveTrack
      ? effectiveTrack.show?.name
      : null;

  // Determine animation class based on isOpen state
  const animationClass = isOpen
    ? "translate-y-0 opacity-100"
    : "translate-y-full opacity-0";

  return (
    <div
      className={`fixed inset-0 z-[100] bg-gradient-to-b from-neutral-800 to-neutral-900 text-white flex flex-col items-center p-6 transition-all duration-500 ease-in-out ${animationClass} overflow-hidden`}
    >
      {/* Top Bar (Close Button) */}
      <div className="w-full flex justify-end flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={close}>
          <ChevronDown size={24} />
        </Button>
      </div>

      {/* Main Content Area - Allow this to grow and push controls down */}
      <div className="flex flex-col items-center justify-center flex-grow w-full max-w-md pt-8 pb-4 min-h-0">
        {/* Album Art / Show Art */}
        <div className="mb-8 w-64 h-64 md:w-80 md:h-80 relative">
          {albumArtUrl ? (
            <Image
              src={albumArtUrl}
              alt={albumName ?? "Album art"}
              fill
              sizes="(max-width: 768px) 256px, 320px"
              className={`object-cover rounded-full shadow-lg ${
                effectiveIsPlaying ? "animate-spin-slow" : ""
              }`}
              style={{
                animationPlayState: effectiveIsPlaying ? "running" : "paused",
              }}
              priority // Prioritize loading the main image
            />
          ) : showArtUrl ? (
            <Image
              src={showArtUrl}
              alt={showName ?? "Show art"}
              fill
              sizes="(max-width: 768px) 256px, 320px"
              className="object-cover rounded-lg shadow-lg" // Shows are square
              priority
            />
          ) : (
            // Placeholder if no art
            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
              <Podcast size={128} className="text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold truncate max-w-sm">
            {effectiveTrack?.name ?? "--"}
          </h2>
          <p className="text-lg text-neutral-400 truncate max-w-xs">
            {effectiveTrack && "artists" in effectiveTrack
              ? effectiveTrack.artists
                  ?.map((a: Spotify.Artist) => a.name)
                  .join(", ")
              : showName
              ? showName
              : "-"}
          </p>
        </div>

        {/* Spacer to push progress/controls down */}
        <div className="flex-grow"></div>

        {/* Progress Bar (using Progress component) */}
        <div
          ref={progressContainerRef}
          className={`w-full max-w-sm mb-6 flex-shrink-0 group ${
            sdkIsActiveGlobally ? "cursor-pointer" : "cursor-default"
          }`}
          title={sdkIsActiveGlobally ? "Seek" : ""}
          onClick={handleProgressClick}
        >
          <Progress
            value={effectiveProgressPercent}
            className="w-full h-1 bg-gray-700 [&>div]:bg-white group-hover:[&>div]:bg-green-500 mb-1"
            aria-label="Seek progress bar"
          />
          <div className="flex justify-between text-xs text-neutral-400">
            <span>{formatDuration(effectiveProgressMs)}</span>
            <span>{formatDuration(effectiveDurationMs)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-6 w-full max-w-sm flex-shrink-0">
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <Shuffle size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={controls.previousTrack}
            disabled={!sdkIsActiveGlobally}
            className="text-white disabled:opacity-50"
          >
            <SkipBack size={28} fill="currentColor" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={controls.togglePlay}
            disabled={!sdkIsActiveGlobally}
            className="bg-white text-black rounded-full w-16 h-16 flex items-center justify-center hover:scale-105 disabled:opacity-50"
          >
            {effectiveIsPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={controls.nextTrack}
            disabled={!sdkIsActiveGlobally}
            className="text-white disabled:opacity-50"
          >
            <SkipForward size={28} fill="currentColor" />
          </Button>
          <Button variant="ghost" size="icon" className="text-neutral-400">
            <Repeat size={20} />
          </Button>
        </div>
      </div>

      {/* Bottom Spacer/Area (Adjust as needed) */}
      {/* <div className="h-10 flex-shrink-0"></div> */}
      {/* Removed fixed bottom spacer, using flex-grow above */}
    </div>
  );
}
