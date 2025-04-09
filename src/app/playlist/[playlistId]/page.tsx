"use client"; // Convert to Client Component

import React, { useEffect } from "react";
import useSWR from "swr";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation"; // Import useParams
import { Clock, Play, Loader2 } from "lucide-react";
import PlayerFooter from "@/components/PlayerFooter";
import UserProfileButton from "@/components/UserProfileButton";
import TrackList from "@/components/TrackList";
import PlaylistDetailSkeleton from "@/components/PlaylistDetailSkeleton"; // Import skeleton

// Type Definitions
type PlaylistDetails = SpotifyApi.SinglePlaylistResponse;
type UserProfile = SpotifyApi.CurrentUsersProfileResponse;

// Helper to format duration (can be moved to utils)
function formatDuration(ms: number): string {
  if (!ms) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

// Fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Get params via hook, not props
export default function PlaylistPage() {
  const params = useParams(); // Use the hook
  const playlistId = params.playlistId as string; // Get playlistId, assert as string

  const { data: session, status } = useSession();

  // --- Data Fetching with SWR (use playlistId from hook) ---
  const { data: playlist, error: playlistError } = useSWR<PlaylistDetails>(
    status === "authenticated" && playlistId
      ? `/api/spotify/playlists/${playlistId}` // Use playlistId variable
      : null,
    fetcher
  );

  // Fetch user profile (needed for header consistency)
  const { data: userProfile, error: profileError } = useSWR<UserProfile>(
    status === "authenticated" ? "/api/spotify/me" : null,
    fetcher
  );

  // --- Authentication Handling ---
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("spotify");
    }
  }, [status]);

  // Loading state for auth
  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // --- Error Handling ---
  // Consider specific handling for 404 (playlist not found) vs other errors
  const apiError = playlistError || profileError;
  if (apiError) {
    console.error("Error fetching playlist data (client-side):", apiError);
    // You might want to check error status codes here (e.g., playlistError?.status === 404)
    return (
      <div className="min-h-screen flex flex-col">
        {/* Consistent Header */}
        <header className="container mx-auto px-4 py-4 top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold hover:underline">
                My Playlists
              </h1>
            </Link>
            {/* Show profile button skeleton or actual if loaded */}
            {userProfile ? (
              <UserProfileButton userProfile={userProfile} />
            ) : (
              <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
            )}
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl text-red-500 mb-4">
              Error Loading Playlist
            </h1>
            <p className="mb-4">
              Could not load the playlist. It might not exist or there was an
              error fetching the data.
            </p>
            <Link href="/" className="text-blue-500 hover:underline">
              Go back to playlists
            </Link>
          </div>
        </main>
        <PlayerFooter />
      </div>
    );
  }

  // --- Loading State for Playlist Data ---
  if (!playlist) {
    // Show skeleton while playlist data is loading
    return (
      <div className="min-h-screen flex flex-col">
        {/* Consistent Header with Profile Skeleton/Button */}
        <header className="container mx-auto px-4 py-4 top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold hover:underline">
                My Playlists
              </h1>
            </Link>
            {userProfile ? (
              <UserProfileButton userProfile={userProfile} />
            ) : (
              <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
            )}
          </div>
        </header>
        <main className="flex-grow">
          <PlaylistDetailSkeleton />
        </main>
        <PlayerFooter />
      </div>
    );
  }

  // --- Render Playlist Content Once Loaded ---
  // Filter out potential null tracks (good practice)
  const tracks = playlist.tracks.items.filter(
    (
      item
    ): item is SpotifyApi.PlaylistTrackObject & {
      track: SpotifyApi.TrackObjectFull;
    } => item.track !== null
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Consistent Header */}
      <header className="container mx-auto px-4 py-4 top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold hover:underline">My Playlists</h1>
          </Link>
          {/* User profile should be loaded by now if we reached here */}
          {userProfile && <UserProfileButton userProfile={userProfile} />}
        </div>
      </header>

      <main className="flex-grow">
        {" "}
        {/* Removed container/padding, handled by inner components */}
        {/* Playlist Header */}
        <div className="container mx-auto px-4 pt-8 pb-6 flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
          {playlist.images?.[0]?.url && (
            <div className="flex-shrink-0 shadow-lg">
              <Image
                src={playlist.images[0].url}
                alt={`${playlist.name} cover`}
                width={200}
                height={200}
                className="w-40 h-40 md:w-52 md:h-52 object-cover rounded"
                priority // Prioritize loading header image
              />
            </div>
          )}
          <div className="flex flex-col gap-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase">Playlist</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold !leading-tight break-words">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p
                className="text-sm text-muted-foreground mt-1"
                dangerouslySetInnerHTML={{ __html: playlist.description }}
              ></p>
            )}
            <div className="flex items-center gap-2 mt-2 text-sm justify-center md:justify-start">
              <span>{playlist.owner.display_name}</span>
              <span className="before:content-['•'] before:mx-1">
                {tracks.length} songs
              </span>
            </div>
          </div>
        </div>
        {/* Track List Header (Sticky) - Removed mb-4 */}
        <div className="top-[65px] md:top-[69px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          {/* Adjust top offset based on header height */}
          <div className="container mx-auto px-4">
            {/* Reduced vertical padding, ensure items-center */}
            <div className="grid grid-cols-[auto,1fr,auto] md:grid-cols-[2rem,4fr,2fr,1fr,auto] gap-3 items-center h-10 px-2 md:px-4 border-b border-border text-muted-foreground text-sm">
              <span className="hidden md:inline-block text-right">#</span>
              <span className="md:hidden"></span> {/* Spacer for mobile */}
              <span className="hidden md:inline-block"></span> {/* Spacer */}{" "}
            </div>
          </div>
        </div>
        {/* Track List Body */}
        <div className="container mx-auto px-4 pb-8">
          <TrackList tracks={tracks} playlistUri={playlist.uri} />
        </div>
      </main>

      <PlayerFooter />
    </div>
  );
}
