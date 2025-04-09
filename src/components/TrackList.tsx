"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Clock, Play, Loader2, Music } from "lucide-react"; // Added Music icon
import { useSWRConfig } from "swr"; // To trigger footer refresh
import { usePlayer } from "@/context/PlayerContext"; // Import usePlayer

// Types (can be shared or re-defined)
type PlaylistTrack = SpotifyApi.PlaylistTrackObject;

interface TrackListProps {
  tracks: PlaylistTrack[];
  playlistUri: string; // Pass the playlist context URI
}

// Helper (consider moving to utils)
function formatDuration(ms: number): string {
  if (!ms) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

export default function TrackList({ tracks, playlistUri }: TrackListProps) {
  const [currentlyPlayingUri, setCurrentlyPlayingUri] = useState<string | null>(
    null
  );
  const [loadingTrackUri, setLoadingTrackUri] = useState<string | null>(null);
  const { playerState, controls } = usePlayer(); // Get playerState and controls from context

  // Update currentlyPlayingUri when the global playback state changes
  useEffect(() => {
    const currentTrackUri = playerState.globalPlaybackState?.item?.uri ?? null;
    setCurrentlyPlayingUri(currentTrackUri);
  }, [playerState.globalPlaybackState]);

  const playTrack = async (trackUri: string, position: number) => {
    if (loadingTrackUri === trackUri) return; // Prevent multiple clicks on the same loading track

    console.log(
      `TrackList: Attempting to play track URI: ${trackUri} at position ${position} using context ${playlistUri}`
    );
    setLoadingTrackUri(trackUri);

    if (!playlistUri) {
      console.error("Playlist URI is missing, cannot play track.");
      alert("Error: Cannot determine the playlist context.");
      setLoadingTrackUri(null);
      return;
    }

    try {
      await controls.playContext(playlistUri, { uri: trackUri });
      console.log(
        "TrackList: Play command successful via context for:",
        trackUri
      );
      setCurrentlyPlayingUri(trackUri);
    } catch (error) {
      console.error("TrackList: Error calling playContext:", error);
    } finally {
      setLoadingTrackUri(null);
    }
  };

  return (
    <ul className="space-y-1">
      {tracks.map(
        (item, index) =>
          item.track && (
            <li
              key={`${item.track.id}-${index}`}
              onClick={() => playTrack(item.track!.uri, index)}
              // Use Flexbox layout with conditional background color for currently playing track
              className={`flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group cursor-pointer ${
                currentlyPlayingUri === item.track.uri ? "bg-muted/80" : ""
              }`}
            >
              {/* Left Group: Image + Title/Artist Column */}
              <div className="flex items-center space-x-3 overflow-hidden">
                {" "}
                {/* Add overflow-hidden here */}
                {/* Album Art Container */}
                <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded overflow-hidden">
                  {" "}
                  {/* Slightly smaller art */}
                  {loadingTrackUri === item.track.uri ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded z-10">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  ) : null}
                  {item.track.album.images?.[0]?.url ? (
                    <Image
                      src={item.track.album.images[0].url}
                      alt={item.track.album.name}
                      fill
                      sizes="(max-width: 768px) 40px, 48px" // Adjusted sizes
                      className={`object-cover transition-opacity duration-300 ${
                        loadingTrackUri === item.track.uri
                          ? "opacity-50"
                          : "opacity-100"
                      }`}
                    />
                  ) : (
                    // Placeholder
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Music size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                {/* Title/Artist Column */}
                <div className="flex flex-col overflow-hidden">
                  {" "}
                  {/* Keep overflow hidden */}
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.track.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.track.artists.map((artist) => artist.name).join(", ")}
                  </p>
                </div>
              </div>

              {/* Right Side: Duration (Desktop Only) */}
              <span className="text-xs md:text-sm text-muted-foreground tabular-nums flex-shrink-0 hidden md:block text-right ml-4">
                {" "}
                {/* Added ml-4 for spacing */}
                {formatDuration(item.track.duration_ms)}
              </span>
            </li>
          )
      )}
    </ul>
  );
}
