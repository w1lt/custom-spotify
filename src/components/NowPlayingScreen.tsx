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
import { usePalette } from "color-thief-react";

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
    rotationAngle,
  } = playerState;

  // Add ref for the album image rotation
  const albumImageRef = useRef<HTMLImageElement>(null);
  // Add ref to track animation state
  const animationStateRef = useRef({
    startAngle: rotationAngle,
    startTime: 0,
    currentAngle: rotationAngle,
  });

  // Add listener for our custom rotation event
  useEffect(() => {
    const handleRotationEvent = (
      event: CustomEvent<{
        isPlaying: boolean;
        timestamp: number;
        currentAngle: number;
      }>
    ) => {
      const { isPlaying, timestamp, currentAngle } = event.detail;

      if (!albumImageRef.current) return;

      console.log(
        `Rotation event: isPlaying=${isPlaying}, currentAngle=${currentAngle}`
      );

      // When playing, always start the animation
      if (isPlaying) {
        // Starting or resuming playback
        console.log("Starting rotation animation");

        // Use the angle from context if available, otherwise use our tracked angle
        animationStateRef.current.currentAngle =
          currentAngle || animationStateRef.current.currentAngle;
        animationStateRef.current.startAngle =
          animationStateRef.current.currentAngle;
        animationStateRef.current.startTime = timestamp;

        // Dynamically create animation starting from exact current angle
        updateRotationAnimation(animationStateRef.current.currentAngle);

        // Apply animation - force a style recalculation by removing and setting in separate operations
        albumImageRef.current.style.animation = "none";
        // Force a reflow to ensure the animation reset takes effect
        void albumImageRef.current.offsetWidth;
        // Now apply the new animation
        albumImageRef.current.style.animation =
          "album-rotate 20s linear infinite";
        albumImageRef.current.style.transform = `rotate(${animationStateRef.current.currentAngle}deg)`;
      } else {
        // Pausing playback - calculate and save exact current angle
        console.log("Stopping rotation animation");

        if (animationStateRef.current.startTime > 0) {
          const elapsedMs = timestamp - animationStateRef.current.startTime;
          const degreesPerMs = 360 / (20 * 1000); // 360° every 20 seconds
          const rotationDelta = (elapsedMs * degreesPerMs) % 360;

          // Save the precise current angle for when we resume
          animationStateRef.current.currentAngle =
            (animationStateRef.current.startAngle + rotationDelta) % 360;

          // Stop animation but set transform to exact current angle
          albumImageRef.current.style.animation = "none";
          albumImageRef.current.style.transform = `rotate(${animationStateRef.current.currentAngle}deg)`;

          // When pausing, update the rotation angle in the shared state so other components know
          // This won't cause skipping because we've already removed the animation
          controls.setRotationAngle(animationStateRef.current.currentAngle);
        }
      }
    };

    // TypeScript type assertion for CustomEvent
    window.addEventListener(
      "album-rotation",
      handleRotationEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "album-rotation",
        handleRotationEvent as EventListener
      );
    };
  }, [controls]);

  // Function to update the keyframes animation
  const updateRotationAnimation = (startAngle: number) => {
    // Remove old style if exists
    const oldStyle = document.getElementById("album-rotation-style");
    if (oldStyle) {
      oldStyle.remove();
    }

    // Create new keyframes starting from current angle
    const styleElement = document.createElement("style");
    styleElement.id = "album-rotation-style";
    styleElement.textContent = `
      @keyframes album-rotate {
        from { transform: rotate(${startAngle}deg); }
        to { transform: rotate(${startAngle + 360}deg); }
      }
    `;
    document.head.appendChild(styleElement);
  };

  // Initial animation setup
  useEffect(() => {
    // Initialize the animation
    updateRotationAnimation(rotationAngle);

    // Set the initial reference angle
    animationStateRef.current.currentAngle = rotationAngle;

    return () => {
      const styleElement = document.getElementById("album-rotation-style");
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

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

  // Also respond to playback state changes directly
  useEffect(() => {
    if (!albumImageRef.current) return;

    // Ensure we reflect the correct playback state
    if (effectiveIsPlaying) {
      console.log("Playback state changed to playing - starting animation");

      // Make sure we have the current angle
      const currentAngle = animationStateRef.current.currentAngle;

      // Create fresh animation keyframes
      updateRotationAnimation(currentAngle);

      // Restart animation with current angle
      albumImageRef.current.style.animation = "none";
      void albumImageRef.current.offsetWidth; // Force reflow
      albumImageRef.current.style.animation =
        "album-rotate 20s linear infinite";
      albumImageRef.current.style.transform = `rotate(${currentAngle}deg)`;

      // Update timestamp for future pause calculations
      animationStateRef.current.startTime = Date.now();
      animationStateRef.current.startAngle = currentAngle;
    } else {
      // Stop animation when paused
      console.log("Playback state changed to paused - stopping animation");
      albumImageRef.current.style.animation = "none";
      // Make sure we save the current angle
      if (animationStateRef.current.startTime > 0) {
        const elapsed = Date.now() - animationStateRef.current.startTime;
        const degreesPerMs = 360 / (20 * 1000);
        const rotationDelta = (elapsed * degreesPerMs) % 360;
        animationStateRef.current.currentAngle =
          (animationStateRef.current.startAngle + rotationDelta) % 360;
        albumImageRef.current.style.transform = `rotate(${animationStateRef.current.currentAngle}deg)`;
      }
    }
  }, [effectiveIsPlaying]);

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

  // Use color-thief-react to extract dominant colors from the album art
  const { data: palette } = usePalette(
    albumArtUrl || showArtUrl || "",
    3,
    "hex",
    {
      crossOrigin: "anonymous",
      quality: 10,
    }
  );

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    // Remove # if present
    hex = hex.replace("#", "");

    // Parse the hex values to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return rgba string
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Set fallback colors for gradient if palette not available
  const colorPrimary = palette?.[0] || "#1e1e1e";
  const colorSecondary = palette?.[1] || "#121212";

  // Create gradient background style with proper color formatting using rgba
  const backgroundStyle = palette
    ? {
        background: `linear-gradient(to bottom, ${hexToRgba(
          colorPrimary,
          1.0
        )}, ${hexToRgba(colorSecondary, 0.9)}, #121212)`,
      }
    : {
        background: "linear-gradient(to bottom, #1e1e1e, #171717, #121212)",
      };

  // Determine animation class based on isOpen state
  const animationClass = isOpen
    ? "translate-y-0 opacity-100"
    : "translate-y-full opacity-0";

  return (
    <div
      className={`fixed inset-0 z-[100] text-white flex flex-col items-center transition-all duration-500 ease-in-out ${animationClass} overflow-hidden`}
      style={backgroundStyle}
    >
      {/* Top Bar (Close Button) */}
      <div className="w-full flex justify-end p-4 sticky top-0 z-10 bg-gradient-to-b from-black/20 to-transparent">
        <Button variant="ghost" size="icon" onClick={close}>
          <ChevronDown size={24} />
        </Button>
      </div>

      {/* Main Content Area with album art centered - height constrained */}
      <div className="flex flex-col items-center justify-center w-full px-4 max-w-xl py-0 md:py-4 flex-1">
        {/* Album Art / Show Art - smaller size */}
        <div className="aspect-square w-48 sm:w-52 md:w-56 lg:w-64 relative mb-4 sm:mb-6">
          {albumArtUrl ? (
            <Image
              ref={albumImageRef}
              src={albumArtUrl}
              alt={albumName ?? "Album art"}
              fill
              sizes="(max-width: 640px) 192px, (max-width: 768px) 208px, (max-width: 1024px) 224px, 256px"
              className="object-cover rounded-full shadow-lg"
              style={{
                willChange: "transform",
              }}
              priority
            />
          ) : showArtUrl ? (
            <Image
              src={showArtUrl}
              alt={showName ?? "Show art"}
              fill
              sizes="(max-width: 640px) 192px, (max-width: 768px) 208px, (max-width: 1024px) 224px, 256px"
              className="object-cover rounded-lg shadow-lg"
              priority
            />
          ) : (
            // Placeholder if no art
            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
              <Podcast size={96} className="text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Track Info - visible on mobile, hidden on desktop */}
        <div className="text-center mb-4 md:hidden">
          <h2 className="text-xl font-bold truncate max-w-sm">
            {effectiveTrack?.name ?? "--"}
          </h2>
          <p className="text-sm text-neutral-400 truncate max-w-xs">
            {effectiveTrack && "artists" in effectiveTrack
              ? effectiveTrack.artists
                  ?.map((a: Spotify.Artist) => a.name)
                  .join(", ")
              : showName
              ? showName
              : "-"}
          </p>
        </div>
      </div>

      {/* Fixed bottom controls - always visible */}
      <div className="w-full p-4 sm:p-6 sticky bottom-0 bg-gradient-to-t from-black/20 to-transparent">
        <div className="max-w-xl mx-auto">
          {/* Track Info in row format - desktop only */}
          <div className="hidden md:flex items-center justify-between w-full mb-2">
            <div className="overflow-hidden">
              <h2 className="text-xl font-bold truncate max-w-xs">
                {effectiveTrack?.name ?? "--"}
              </h2>
              <p className="text-sm text-neutral-400 truncate max-w-xs">
                {effectiveTrack && "artists" in effectiveTrack
                  ? effectiveTrack.artists
                      ?.map((a: Spotify.Artist) => a.name)
                      .join(", ")
                  : showName
                  ? showName
                  : "-"}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            ref={progressContainerRef}
            className={`w-full mb-4 group ${
              sdkIsActiveGlobally ? "cursor-pointer" : "cursor-default"
            }`}
            title={sdkIsActiveGlobally ? "Seek" : ""}
            onClick={handleProgressClick}
          >
            <Progress
              value={effectiveProgressPercent}
              className="w-full h-1.5 bg-gray-700 [&>div]:bg-white group-hover:[&>div]:bg-green-500 mb-1"
              aria-label="Seek progress bar"
            />
            <div className="flex justify-between text-xs text-neutral-400">
              <span>{formatDuration(effectiveProgressMs)}</span>
              <span>{formatDuration(effectiveDurationMs)}</span>
            </div>
          </div>

          {/* Playback Controls - consistently sized */}
          <div className="flex items-center justify-center space-x-5 w-full">
            <Button
              variant="ghost"
              size="icon"
              className={`${
                (playerState.globalPlaybackState as any)?.shuffle_state
                  ? "text-green-500"
                  : "text-neutral-400"
              } hover:text-white`}
              onClick={controls.toggleShuffle}
              disabled={!sdkIsActiveGlobally}
            >
              <Shuffle size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={controls.previousTrack}
              disabled={!sdkIsActiveGlobally}
              className="text-white disabled:opacity-50"
            >
              <SkipBack size={20} fill="currentColor" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={controls.togglePlay}
              disabled={!sdkIsActiveGlobally}
              className="bg-white text-black rounded-full w-12 h-12 flex items-center justify-center hover:scale-105 disabled:opacity-50"
            >
              {effectiveIsPlaying ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" className="ml-1" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={controls.nextTrack}
              disabled={!sdkIsActiveGlobally}
              className="text-white disabled:opacity-50"
            >
              <SkipForward size={20} fill="currentColor" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-400 hover:text-white"
            >
              <Repeat size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
