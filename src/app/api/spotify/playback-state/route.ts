import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpotifyWebApi } from "@/lib/spotify";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Create a new instance directly
  const userSpotifyApi = new SpotifyWebApi({
    accessToken: session.user.accessToken,
  });

  try {
    const data = await userSpotifyApi.getMyCurrentPlaybackState();
    if (data.body) {
      return NextResponse.json(data.body);
    } else {
      // Handle cases where nothing is playing or API returns empty body
      return NextResponse.json(null); // Or return an object indicating no active playback
    }
  } catch (error: any) {
    console.error("Error fetching playback state:", error);
    // Check for specific errors like token expiration if needed
    if (error.statusCode === 401) {
      // Potentially trigger token refresh logic or indicate expired token
      return NextResponse.json(
        { error: "Spotify token expired or invalid" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch playback state" },
      { status: 500 }
    );
  }
}
