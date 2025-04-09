"use client"; // Convert to Client Component

import React, { useEffect } from "react";
import useSWR from "swr";
import { useSession, signIn } from "next-auth/react";
// Removed getServerSession, authOptions, spotifyApi (default instance), redirect
import Link from "next/link";
import Image from "next/image";
import UserProfileButton from "@/components/UserProfileButton";
import PlayerFooter from "@/components/PlayerFooter";
import { Badge } from "@/components/ui/badge";
import { ListMusic, Loader2 } from "lucide-react";
import PlaylistCardSkeleton from "@/components/PlaylistCardSkeleton"; // Import the skeleton

// Type Definitions (can remain the same or be moved)
type UserProfile = SpotifyApi.CurrentUsersProfileResponse;
type Playlist = SpotifyApi.PlaylistObjectSimplified;

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const { data: session, status } = useSession();

  // --- Data Fetching with SWR ---
  // Fetch user profile
  const { data: userProfile, error: profileError } = useSWR<UserProfile>(
    status === "authenticated" ? "/api/spotify/me" : null, // Only fetch if authenticated
    fetcher
  );

  // Fetch playlists
  const { data: playlistsData, error: playlistsError } = useSWR<{
    items: Playlist[];
  }>(
    status === "authenticated" ? "/api/spotify/playlists" : null, // Only fetch if authenticated
    fetcher
  );
  const playlists = playlistsData?.items;

  // --- Authentication Handling ---
  useEffect(() => {
    // If unauthenticated after loading, redirect to login
    if (status === "unauthenticated") {
      signIn("spotify"); // Or redirect to /login page: router.push('/login');
    }
  }, [status]);

  // Loading state for authentication
  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // --- Error Handling ---
  // Combine potential errors
  const apiError = profileError || playlistsError;
  if (apiError) {
    console.error("Error fetching Spotify data (client-side):", apiError);
    return (
      <div className="min-h-screen flex flex-col">
        {/* Optional: Render header even on error? */}
        <main className="container mx-auto px-4 py-8 flex-grow flex flex-col items-center justify-center">
          <h1 className="text-2xl text-red-500 mb-4">Error fetching data</h1>
          <p className="mb-4 text-center">
            Could not retrieve your Spotify data. Please try refreshing the page
            or logging out and back in.
          </p>
          {/* We can use the UserProfileButton which handles signout */}
          {userProfile && <UserProfileButton userProfile={userProfile} />}
        </main>
        <PlayerFooter /> {/* Keep footer visible */}
      </div>
    );
  }

  // --- Main Content Rendering ---
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto px-4 py-4 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Playlists</h1>
          {/* Show UserProfileButton once profile data is loaded */}
          {userProfile ? (
            <UserProfileButton userProfile={userProfile} />
          ) : (
            <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Playlist Grid or Skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {!playlists ? (
            // Show Skeletons while playlists are loading
            Array.from({ length: 12 }).map(
              (
                _,
                index // Adjust skeleton count as needed
              ) => <PlaylistCardSkeleton key={index} />
            )
          ) : playlists.length > 0 ? (
            // Render actual playlists once loaded
            playlists.map((playlist) => (
              <Link
                href={`/playlist/${playlist.id}`}
                key={playlist.id}
                className="group relative block bg-card p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden"
              >
                <div className="aspect-square mb-3 relative">
                  {playlist.images?.[0]?.url ? (
                    <Image
                      src={playlist.images[0].url}
                      alt={`${playlist.name} cover`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16.6vw"
                      className="object-cover rounded group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                      <ListMusic className="w-1/2 h-1/2 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300"></div>
                </div>
                <h3 className="text-base font-semibold text-card-foreground truncate mb-1 group-hover:text-primary">
                  {playlist.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate mb-2">
                  By {playlist.owner.display_name}
                </p>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{playlist.tracks.total} tracks</span>
                  {playlist.public === false && (
                    <Badge variant="outline">Private</Badge>
                  )}
                </div>
              </Link>
            ))
          ) : (
            // Handle case where playlists loaded but are empty
            <p className="col-span-full text-center text-muted-foreground">
              No playlists found.
            </p>
          )}
        </div>
      </main>
      <PlayerFooter /> {/* Footer remains visible */}
    </div>
  );
}
